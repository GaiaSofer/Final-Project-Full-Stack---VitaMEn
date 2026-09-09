'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import type { IngredientInput } from '@/types/database.types';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

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

    // Audit trail: who added this catalog item, and when (admin_id defaults
    // to auth.uid() in the DB — see 0007_audit_log.sql — so this can't be
    // spoofed by the client even if this call were forged).
    await supabase.from('catalog_audit_log').insert({
      action: 'add_supplement',
      supplement_id: data as string,
      detail: { name: input.name, brand: input.brand },
    });

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
      if (ingName) groups.get(key)!.ings.push({
        ingredient_name: ingName,
        amount: parseFloat(c[idx('amount')] ?? '0') || 0,
        unit: c[idx('unit')] ?? 'mg',
      });
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
      await supabase.from('catalog_audit_log').insert({
        action: 'csv_import',
        detail: { added },
      });
    }
    revalidatePath('/catalog');
    revalidatePath('/browse');
    return { ok: true, added };
  }, { error: SERVER_ERROR_MESSAGE });
}
