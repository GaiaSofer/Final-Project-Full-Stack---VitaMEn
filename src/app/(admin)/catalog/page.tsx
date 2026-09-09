import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AddSupplementForm from '@/components/AddSupplementForm';
import CsvImport from '@/components/CsvImport';
import RequestDoneButton from '@/components/RequestDoneButton';
import TipsManager from '@/components/TipsManager';

export default async function CatalogPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'admin') redirect('/today');

  const { data: supplements } = await supabase
    .from('supplements')
    .select('id, name, brand, price_cents, price_max_cents, category, origin, supplement_ingredients(ingredient_name, amount, unit)')
    .order('name');
  const { data: requests } = await supabase
    .from('product_requests').select('*').eq('status', 'open').order('created_at');
  const { data: tips } = await supabase
    .from('tips').select('id, body, active').order('created_at', { ascending: false });
  const { data: auditLog, error: auditLogError } = await supabase
    .from('catalog_audit_log')
    .select('id, action, detail, created_at, profiles(full_name)')
    .order('created_at', { ascending: false })
    .limit(10);
  if (auditLogError) {
    // Was previously swallowed — a missing table or an RLS mismatch looked
    // IDENTICAL to "no actions yet" in the UI. Logged so it shows up in
    // server logs; the section below renders a distinct error state
    // instead of silently claiming the log is empty.
    console.error('[catalog_audit_log] select failed:', auditLogError.message);
  }

  function price(s: any) {
    const min = (s.price_cents / 100).toFixed(0);
    const max = s.price_max_cents ? (s.price_max_cents / 100).toFixed(0) : null;
    return max && max !== min ? `₪${min}–₪${max}` : `₪${min}`;
  }

  function auditLabel(entry: any) {
    if (entry.action === 'add_supplement') {
      return `הוסיף/ה מוצר: ${entry.detail?.name ?? '—'} (${entry.detail?.brand ?? '—'})`;
    }
    if (entry.action === 'csv_import') {
      return `ייבוא CSV: ${entry.detail?.added ?? 0} מוצרים`;
    }
    return entry.action;
  }

  return (
    <div className="container">
      <div className="page-head">
        <h1>ניהול קטלוג</h1>
        <p className="muted">{profile.full_name} · {(supplements ?? []).length} מוצרים במאגר</p>
      </div>

      {(requests ?? []).length > 0 && (
        <div className="card">
          <div className="card-title">
            <h3>בקשות פתוחות מלקוחות</h3>
            <span className="badge brand">{(requests ?? []).length}</span>
          </div>
          {(requests ?? []).map((r: any) => (
            <div key={r.id} className="item">
              <div className="item-main">
                <div className="item-title">{r.product_name}</div>
                {r.note && <div className="muted">{r.note}</div>}
              </div>
              <RequestDoneButton id={r.id} />
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <div className="card-title"><h3>המאגר</h3></div>
        {(supplements ?? []).length === 0 ? (
          <div className="empty">
            <div className="empty-mark">📦</div>
            <p style={{ margin: 0 }}>הקטלוג ריק — הוסיפי מוצר ראשון מהטופס למטה</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>מוצר</th><th>קטגוריה</th><th>מקור</th><th>רכיבים</th><th className="num">מחיר</th>
              </tr>
            </thead>
            <tbody>
              {(supplements ?? []).map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 570 }}>{s.name}</div>
                    <div className="dim">{s.brand}</div>
                  </td>
                  <td>{s.category ? <span className="badge">{s.category}</span> : <span className="dim">—</span>}</td>
                  <td className="muted">{s.origin === 'israel' ? 'ישראל' : s.origin === 'abroad' ? 'חו״ל' : '—'}</td>
                  <td className="muted">
                    {(s.supplement_ingredients ?? [])
                      .map((i: any) => `${i.ingredient_name} ${i.amount}${i.unit}`).join(' · ') || '—'}
                  </td>
                  <td className="num">{price(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card">
        <div className="card-title"><h3>הוספת מוצר</h3></div>
        <p className="muted">
          חשוב: שם הרכיב חייב להיכתב באנגלית ובדיוק כפי שהוא מופיע בטבלת הספים
          (Vitamin D, Magnesium, Zinc, Iron, Caffeine) — אחרת מנוע החפיפה לא יזהה אותו.
        </p>
        <AddSupplementForm />
      </div>

      <div className="card">
        <div className="card-title"><h3>טיפים יומיים</h3></div>
        <p className="muted">
          הטיפים מוצגים ללקוחות בעמוד "היום", טיפ אחד ליום לפי סבב. כל טיפ שמוזן כאן
          עובר את אישורך — בדיוק כמו הקטלוג.
        </p>
        <TipsManager tips={tips ?? []} />
      </div>

      <div className="card">
        <div className="card-title"><h3>ייבוא מרובה (CSV)</h3></div>
        <CsvImport />
      </div>

      <div className="card">
        <div className="card-title"><h3>יומן פעולות אדמין (audit log)</h3></div>
        <p className="muted">מי הוסיף/ערך מה בקטלוג, ומתי — 10 הפעולות האחרונות.</p>
        {auditLogError ? (
          <div className="alert alert-warn">
            <span className="alert-icon">⚠️</span>
            <span>
              לא ניתן לטעון את יומן הפעולות (שגיאה: {auditLogError.message}).
              בדוק/י שמיגרציה <code>0007_audit_log.sql</code> (ותיקון{' '}
              <code>0008_audit_log_fix.sql</code>) רצו בפועל מול מסד הנתונים.
            </span>
          </div>
        ) : (auditLog ?? []).length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>עדיין לא נרשמו פעולות.</p>
        ) : (
          <table>
            <thead><tr><th>מתי</th><th>מי</th><th>פעולה</th></tr></thead>
            <tbody>
              {(auditLog ?? []).map((entry: any) => (
                <tr key={entry.id}>
                  <td className="muted">{new Date(entry.created_at).toLocaleString('he-IL')}</td>
                  <td>{entry.profiles?.full_name ?? '—'}</td>
                  <td>{auditLabel(entry)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
