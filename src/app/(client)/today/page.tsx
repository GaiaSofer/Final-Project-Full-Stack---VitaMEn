import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import IntakeButton from '@/components/IntakeButton';
import { pillsLabel } from '@/lib/business/pills-label';
import Link from 'next/link';

// Daily checklist + paginated history (index-backed query, unchanged).
export default async function TodayPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const page = Math.max(0, parseInt(searchParams.page ?? '0', 10) || 0);
  const pageSize = 10;
  const from = page * pageSize, to = from + pageSize - 1;

  const { data: stack } = await supabase
    .from('intake_items')
    .select('supplement_id, dosage, schedule, pills_per_time, supplements(name, brand)')
    .eq('client_id', user.id);

  const { data: tipRows } = await supabase
    .from('tips').select('body').eq('active', true).order('created_at');
  const tips = (tipRows ?? []).map((t: { body: string }) => t.body);
  // one tip per day, stable within the day, no hydration mismatch
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((Date.now() - start.getTime()) / 86_400_000);
  const todayTip = tips.length ? tips[dayOfYear % tips.length] : null;

  const { data: logs } = await supabase
    .from('intake_logs')
    .select('id, taken_at, supplements(name)')
    .eq('client_id', user.id)
    .order('taken_at', { ascending: false })
    .range(from, to);

  const today = new Date().toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="container">
      <div className="page-head">
        <h1>היום</h1>
        <p className="muted">{today}</p>
      </div>

      {todayTip && (
        <div className="alert alert-warn" style={{ alignItems: 'center' }}>
          <span className="alert-icon">💡</span>
          <span><strong>טיפ:</strong> {todayTip}</span>
        </div>
      )}

      <div className="card">
        <div className="card-title">
          <h3>סימון נטילה</h3>
          <Link href="/stack" className="muted">התוספים שלי ←</Link>
        </div>

        {(stack ?? []).length === 0 ? (
          <div className="empty">
            <div className="empty-mark">📋</div>
            <p style={{ marginBottom: 4 }}>אין עדיין תוספים ברשימה</p>
            <p className="dim" style={{ margin: 0 }}>
              <Link href="/browse">עיין בקטלוג</Link> והוסף תוספים כדי להתחיל מעקב
            </p>
          </div>
        ) : (
          (stack ?? []).map((it: any) => (
            <div key={it.supplement_id} className="item">
              <div className="item-main">
                <div className="item-title">{it.supplements?.name}</div>
                <div className="muted">
                  {it.supplements?.brand} · {pillsLabel(it.pills_per_time)} · {it.schedule}
                </div>
              </div>
              <IntakeButton supplementId={it.supplement_id} />
            </div>
          ))
        )}
      </div>

      <div className="card">
        <div className="card-title">
          <h3>היסטוריה</h3>
          <span className="dim">{(logs ?? []).length} רשומות בעמוד זה</span>
        </div>

        {(logs ?? []).length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>עדיין לא סומנה נטילה.</p>
        ) : (
          <>
            <table>
              <thead><tr><th>מועד</th><th>תוסף</th></tr></thead>
              <tbody>
                {(logs ?? []).map((l: any) => (
                  <tr key={l.id}>
                    <td className="muted">{new Date(l.taken_at).toLocaleString('he-IL')}</td>
                    <td>{l.supplements?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="row" style={{ marginTop: 14 }}>
              {page > 0 && <Link href={`/today?page=${page - 1}`} className="btn small">← חדש יותר</Link>}
              {(logs ?? []).length === pageSize && (
                <Link href={`/today?page=${page + 1}`} className="btn small">ישן יותר →</Link>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
