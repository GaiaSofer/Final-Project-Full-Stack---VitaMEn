import { createClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import CommentSection from '@/components/CommentSection';
import AddToStackQuick from '@/components/AddToStackQuick';
import { findCheaperAlternatives } from '@/lib/business/compare';
import type { Supplement, SupplementIngredient, Comment } from '@/types/database.types';

// Full product page. Comparison logic unchanged — layout rebuilt.
export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: product } = await supabase
    .from('supplements')
    .select('id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category, created_at, supplement_ingredients(id, supplement_id, ingredient_name, amount, unit)')
    .eq('id', params.id).maybeSingle();
  if (!product) notFound();

  const { data: allSupps } = await supabase
    .from('supplements')
    .select('id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category, created_at');
  const { data: allIngs } = await supabase.from('supplement_ingredients').select('*');
  const { data: comments } = await supabase
    .from('comments').select('*').eq('supplement_id', params.id).order('created_at', { ascending: false });

  const ingBySupp: Record<string, SupplementIngredient[]> = {};
  for (const i of (allIngs ?? []) as SupplementIngredient[]) (ingBySupp[i.supplement_id] ??= []).push(i);
  const alternatives = findCheaperAlternatives(
    product as unknown as Supplement, (allSupps ?? []) as Supplement[], ingBySupp,
  );

  const targetIngredientCount = (product.supplement_ingredients as SupplementIngredient[] | undefined)?.length ?? 1;

  const priceLabel = product.price_max_cents && product.price_max_cents !== product.price_cents
    ? `₪${(product.price_cents / 100).toFixed(0)}–₪${(product.price_max_cents / 100).toFixed(0)}`
    : `₪${(product.price_cents / 100).toFixed(2)}`;
  const initials = product.name.trim().split(/\s+/).slice(0, 2).map((w: string) => w[0]).join('').toUpperCase();
  const originLabel = product.origin === 'israel' ? 'ישראל' : product.origin === 'abroad' ? 'חו״ל' : null;

  return (
    <div className="container">
      <p className="muted" style={{ marginTop: 4 }}><Link href="/browse">← חזרה לקטלוג</Link></p>

      <div className="card">
        <div className="row" style={{ alignItems: 'flex-start', gap: 20 }}>
          <div className="product-thumb" style={{ width: 148, flexShrink: 0, borderRadius: 12, border: '1px solid var(--border)', aspectRatio: '1' }}>
            <div className="product-initials">{initials}</div>
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 style={{ fontSize: 25, marginBottom: 3 }}>{product.name}</h1>
            <p className="muted" style={{ marginBottom: 9 }}>{product.brand}</p>
            <div className="row wrap" style={{ gap: 6, marginBottom: 12 }}>
              {product.category && <span className="badge accent">{product.category}</span>}
              {originLabel && <span className="badge">{originLabel}</span>}
              {(product.purpose ?? []).map((p: string) => <span key={p} className="badge brand">{p}</span>)}
            </div>
            <div style={{ fontSize: 22, fontWeight: 660, marginBottom: 10 }}>{priceLabel}</div>
            {product.info && <p style={{ marginBottom: 10 }}>{product.info}</p>}
            {product.source_url && (
              <p style={{ marginBottom: 6 }}>
                <a href={product.source_url} target="_blank" rel="noopener noreferrer">
                  מקור / איפה לקנות ↗
                </a>
              </p>
            )}
            <div style={{ margin: '14px 0 10px' }}>
              <AddToStackQuick supplementId={product.id} />
            </div>
            <p className="dim" style={{ margin: 0 }}>המידע הוא בהמלצה בלבד ואינו ייעוץ רפואי.</p>
          </div>
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><h3>רכיבים</h3></div>
          <table>
            <thead><tr><th>רכיב</th><th className="num">כמות</th></tr></thead>
            <tbody>
              {(product.supplement_ingredients ?? []).map((i: any) => (
                <tr key={i.id}>
                  <td>{i.ingredient_name}</td>
                  <td className="num">{i.amount}{i.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ marginBottom: 0 }}>
          <div className="card-title"><h3>חלופות זולות יותר</h3></div>
          {alternatives.length === 0 ? (
            <p className="muted" style={{ margin: 0 }}>
              לא נמצאה חלופה זולה יותר לרכיב העיקרי של המוצר.
            </p>
          ) : (
            <table>
              <thead><tr><th>מוצר</th><th>התאמה</th><th className="num">מחיר</th></tr></thead>
              <tbody>
                {alternatives.map((r) => (
                  <tr key={r.supplement.id}>
                    <td>
                      <Link href={`/product/${r.supplement.id}`}>{r.supplement.name}</Link>
                      <div className="dim">{r.supplement.brand}</div>
                    </td>
                    <td>
                      <span className="badge accent">{r.overlapCount}/{targetIngredientCount} רכיבים</span>
                    </td>
                    <td className="num">₪{(r.supplement.price_cents / 100).toFixed(0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-title">
          <h3>תגובות</h3>
          <span className="dim">{(comments ?? []).length} תגובות</span>
        </div>
        <CommentSection supplementId={params.id} comments={(comments ?? []) as Comment[]} currentUserId={user.id} />
      </div>
    </div>
  );
}
