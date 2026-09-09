'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import type { IngredientInput } from '@/types/database.types';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

// Shared audit-log write for both actions below.
//
// admin_id resolution — CHANGED after a real bug found live-testing this:
// this used to call `supabase.auth.getUser()`, which makes its own network
// round-trip to the Supabase Auth server to revalidate the JWT. That call
// can itself fail or return no user for reasons unrelated to whether the
// admin is genuinely signed in (a slow/failed request to the auth server,
// a token mid-refresh) — and because the RPC/table write just before it
// already succeeded under RLS (which independently proves, DB-side, that a
// valid admin JWT was present on this exact request), a second identity
// check here is redundant for authorization. So this now reads the user id
// from `getSession()` instead — decoded locally from the already-validated
// request cookies, no extra network call, so nothing new can fail.
//
// admin_id is also no longer sent as an explicit `null` when unresolved.
// Postgres only applies a column's `default` when the column is OMITTED
// from the INSERT entirely — an explicit `null` overrides the default and
// is stored as NULL. The previous version always included the key (as
// `user?.id ?? null`), so `catalog_audit_log.admin_id`'s DB-level
// `default auth.uid()` (`0009_audit_log_admin_default.sql`) could never
// actually fire as a fallback, even after that migration ran. Now the key
// is included only when a real id was resolved, so the DB default is a
// genuine last-resort layer, not a no-op.
//
// The insert's error is NOT swallowed: it's the exact bug this function
// replaces. Before this fix, a failed insert (missing table because
// 0007/0008 was never run, an RLS mismatch, anything) looked IDENTICAL in
// the UI to "no admin actions have happened yet" — there was no way to
// tell "empty" apart from "broken" by looking at the page. This does not
// fail the calling action (a catalog write should not be undone just
// because its own audit record failed) but does make the failure visible
// server-side, and callers can inspect the returned `ok` flag if needed.
async function writeAuditLog(
  supabase: ReturnType<typeof createClient>,
  action: 'add_supplement' | 'csv_import' | 'update_supplement',
  supplementId: string | null,
  detail: Record<string, unknown>,
): Promise<{ ok: boolean }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    console.error('[catalog_audit_log] getSession failed:', sessionError.message, { action, supplementId });
  }
  const adminId = session?.user?.id;
  if (!adminId) {
    // Distinct from an insert failure: identity could not be resolved at
    // all, so this write will fall through to the DB-level default (or
    // NULL, on a project that hasn't run 0009 yet). Logged so it's
    // diagnosable instead of silently attributing the row to "nobody".
    console.error('[catalog_audit_log] no admin id resolved for audit write', { action, supplementId });
  }
  const row: Record<string, unknown> = { action, supplement_id: supplementId, detail };
  if (adminId) row.admin_id = adminId; // omit, don't send null — see comment above
  const { error } = await supabase.from('catalog_audit_log').insert(row);
  if (error) {
    // Surfaced in server logs (visible in `vercel logs` / the Vercel
    // dashboard, and in the terminal running `npm run dev`), not shown to
    // the admin — a logging failure shouldn't block them from working.
    console.error('[catalog_audit_log] insert failed:', error.message, { action, supplementId });
    return { ok: false };
  }
  return { ok: true };
}

// Admin adds a catalog supplement + ingredients atomically (add_supplement RPC).
export async function addSupplement(input: {
  name: string; brand: string; priceMinCents: number; priceMaxCents: number | null;
  currency: string; purpose: string[]; info: string;
  origin: 'israel' | 'abroad' | ''; sourceUrl: string; category: string;
  ingredients: IngredientInput[];
}) {
  if (!isNonEmpty(input.name) || !isNonEmpty(input.brand) || input.priceMinCents < 0) {
    return { error: 'Name, brand and a valid price are required.' };
  }
  return withFallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.rpc('add_supplement', {
      p_name: input.name, p_brand: input.brand,
      p_price_cents: input.priceMinCents, p_currency: input.currency || 'ILS',
      p_purpose: input.purpose, p_info: input.info, p_ingredients: input.ingredients,
    });
    if (error) return { error: error.message };

    // set the extra catalog columns (RLS admin policy allows this)
    await supabase.from('supplements').update({
      price_max_cents: input.priceMaxCents,
      origin: input.origin || null,
      source_url: input.sourceUrl || null,
      category: input.category || null,
    }).eq('id', data as string);

    await writeAuditLog(supabase, 'add_supplement', data as string,
      { name: input.name, brand: input.brand });

    revalidatePath('/catalog');
    revalidatePath('/browse');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

// Bulk import from pasted CSV. Columns (with header):
// name,brand,category,price_min,price_max,origin,source_url,info,ingredient,amount,unit
// One row per ingredient; rows with the same name+brand are grouped.
export async function importFromCsv(csv: string) {
  const lines = csv.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { error: 'CSV needs a header row and at least one data row.' };

  return withFallback(async () => {
    const supabase = createClient();
    const header = lines[0].split(',').map((h) => h.trim().toLowerCase());
    const idx = (k: string) => header.indexOf(k);

    type Row = { name: string; brand: string; category: string; priceMin: number; priceMax: number | null;
      origin: string; sourceUrl: string; info: string; ings: IngredientInput[] };
    const groups = new Map<string, Row>();

    for (const line of lines.slice(1)) {
      const c = line.split(',').map((x) => x.trim());
      const name = c[idx('name')] ?? '';
      const brand = c[idx('brand')] ?? '';
      if (!name || !brand) continue;
      const key = `${name}__${brand}`;
      if (!groups.has(key)) {
        groups.set(key, {
          name, brand,
          category: c[idx('category')] ?? '',
          priceMin: Math.round(parseFloat(c[idx('price_min')] ?? '0') * 100) || 0,
          priceMax: idx('price_max') >= 0 && c[idx('price_max')] ? Math.round(parseFloat(c[idx('price_max')]) * 100) : null,
          origin: c[idx('origin')] ?? '',
          sourceUrl: c[idx('source_url')] ?? '',
          info: c[idx('info')] ?? '',
          ings: [],
        });
      }
      const ingName = c[idx('ingredient')] ?? '';
      if (ingName) {
        const amount = parseFloat(c[idx('amount')] ?? '0') || 0;
        const unit = c[idx('unit')] ?? 'mg';
        // Merge, don't duplicate: if this CSV has two rows for the same
        // product with the same ingredient+unit (a real gap found live —
        // there's no DB constraint stopping it, see
        // 0010_ingredient_dedup.sql), summing them here is what makes the
        // resulting row match the product's true total ingredient content.
        // Pushing both as separate rows would double-count that one
        // product's own composition (not the same thing as the overlap
        // engine correctly summing the SAME ingredient across DIFFERENT
        // products a client takes — that summing is correct; this would
        // be inflating a single product's label before it even reaches
        // the engine). A same-name-different-unit pair is left as two
        // rows — merging across units isn't safe to do automatically.
        const existing = groups.get(key)!.ings.find(
          (i) => i.ingredient_name === ingName && i.unit === unit,
        );
        if (existing) {
          existing.amount += amount;
        } else {
          groups.get(key)!.ings.push({ ingredient_name: ingName, amount, unit });
        }
      }
    }

    let added = 0;
    for (const row of groups.values()) {
      const { data, error } = await supabase.rpc('add_supplement', {
        p_name: row.name, p_brand: row.brand, p_price_cents: row.priceMin,
        p_currency: 'ILS', p_purpose: [], p_info: row.info, p_ingredients: row.ings,
      });
      if (error) return { error: `Row "${row.name}": ${error.message}` };
      await supabase.from('supplements').update({
        price_max_cents: row.priceMax, origin: row.origin || null,
        source_url: row.sourceUrl || null, category: row.category || null,
      }).eq('id', data as string);
      added++;
    }
    if (added > 0) {
      await writeAuditLog(supabase, 'csv_import', null, { added });
    }
    revalidatePath('/catalog');
    revalidatePath('/browse');
    return { ok: true, added };
  }, { error: SERVER_ERROR_MESSAGE });
}
