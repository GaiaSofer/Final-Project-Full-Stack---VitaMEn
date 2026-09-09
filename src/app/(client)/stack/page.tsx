import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { evaluateStack, type StackEntry, type MedicalTarget } from '@/lib/business/safety';
import AddToStackForm from '@/components/AddToStackForm';
import RequestProductForm from '@/components/RequestProductForm';
import RemoveButton from '@/components/RemoveButton';
import { pillsLabel } from '@/lib/business/pills-label';
import Link from 'next/link';
import type { SupplementIngredient } from '@/types/database.types';

// The client's stack + the safety engine (red / yellow / green).
// Logic untouched — presentation only.
export default async function StackPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'client') redirect('/catalog');

  const { data: stack } = await supabase
    .from('intake_items')
    .select('id, supplement_id, dosage, schedule, pills_per_time, times_per_week, supplements(name, brand)')
    .eq('client_id', user.id);

  const { data: supplements } = await supabase
    .from('supplements')
    .select('id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category, created_at');
  const { data: ingredients } = await supabase.from('supplement_ingredients').select('*');
  const { data: recs } = await supabase
    .from('medical_recommendations').select('ingredient_name, target_amount, unit').eq('client_id', user.id);

  const ingBySupp: Record<string, SupplementIngredient[]> = {};
  for (const i of (ingredients ?? []) as SupplementIngredient[]) (ingBySupp[i.supplement_id] ??= []).push(i);

  const entries: StackEntry[] = (stack ?? []).map((s: any) => ({
    supplementId: s.supplement_id, pillsPerTime: s.pills_per_time, timesPerWeek: s.times_per_week,
  }));
  const targets: MedicalTarget[] = (recs ?? []).map((r: any) => ({
    ingredient: r.ingredient_name, amount: r.target_amount, unit: r.unit,
  }));

  const { red, yellow, green } = evaluateStack(entries, ingBySupp, targets);
  const clean = red.length === 0 && yellow.length === 0;

  return (
    <div className="container">
      <div className="page-head">
        <h1>התוספים שלי</h1>
        <p className="muted">
          {(stack ?? []).length} תוספים · הבדיקה מתבצעת על סך הצריכה היומית הממוצעת
        </p>
      </div>

      {red.map((w) => (
        <div key={`r-${w.ingredient}`} className="alert alert-danger">
          <span className="alert-icon">⛔</span>
          <span>
            <strong>חריגה מהסף היומי! {w.ingredient}.</strong>{' '}
            הסף המומלץ הוא {w.ceiling}{w.unit} ליום (משרד הבריאות / NIH);
            סך הנטילה שלך הוא {w.total}{w.unit}.
          </span>
        </div>
      ))}
      {yellow.map((w) => (
        <div key={`y-${w.ingredient}`} className="alert alert-warn">
          <span className="alert-icon">⚠️</span>
          <span>
            <strong>חפיפת רכיב! {w.ingredient}.</strong>{' '}
            הרכיב מופיע ב-{w.sources} מוצרים שונים ברשימה שלך.
          </span>
        </div>
      ))}
      {green.map((n) => (
        <div key={`g-${n.ingredient}`} className="alert alert-ok">
          <span className="alert-icon">✓</span>
          <span>
            <strong>הגעת ליעד! {n.ingredient}.</strong>{' '}
            {n.total}{n.unit} מתוך {n.target}{n.unit} שהומלצו לך.
          </span>
        </div>
      ))}
      {clean && (stack ?? []).length > 0 && (
        <div className="alert alert-ok">
          <span className="alert-icon">✓</span>
          <span>לא נמצאו חריגות או חפיפות ברשימה הנוכחית.</span>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <h3 className="sr-only">התוספים שלי</h3>
          <Link href="/browse" className="muted">עיון בקטלוג ←</Link>
        </div>

        {(stack ?? []).length === 0 ? (
          <div className="empty">
            <div className="empty-mark">💊</div>
            <p style={{ marginBottom: 4 }}>הרשימה שלך ריקה</p>
            <p className="dim" style={{ margin: 0 }}>הוסיפי תוסף מהטופס למטה כדי להתחיל</p>
          </div>
        ) : (
          (stack ?? []).map((it: any) => (
            <div key={it.id} className="item">
              <div className="item-main">
                <div className="item-title">{it.supplements?.name}</div>
                <div className="muted">
                  {it.supplements?.brand} · {pillsLabel(it.pills_per_time)} בכל פעם ·
                  {' '}{it.times_per_week} פעמים בשבוע · {it.schedule}
                </div>
              </div>
              <RemoveButton itemId={it.id} />
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title"><h3>הוספת תוסף לרשימה</h3></div>
        <AddToStackForm supplements={supplements ?? []} />
      </div>

      <div className="card">
        <div className="card-title"><h3>לא מצאת תוסף בקטלוג?</h3></div>
        <p className="muted">
          אפשר גם לבקש מגאיגי — העוזרת בפינה — והיא תשלח את הבקשה עבורך.
        </p>
        <RequestProductForm />
      </div>
    </div>
  );
}
