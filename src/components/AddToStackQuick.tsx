'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { addToStack } from '@/app/actions/intake';
import { pillsLabel } from '@/lib/business/pills-label';

// Quick-add from the product page: the user is already looking at the product,
// so the only thing still missing is how they take it.
// Calls the same addToStack action as the stack page — no new logic.
export default function AddToStackQuick({ supplementId }: { supplementId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pills, setPills] = useState(1);
  const [perWeek, setPerWeek] = useState(7);
  const [schedule, setSchedule] = useState('בוקר');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null); setBusy(true);
    const res = await addToStack(supplementId, pillsLabel(pills), schedule, pills, perWeek);
    setBusy(false);
    if (res.error) { setError(res.error); return; }
    setDone(true); setOpen(false); router.refresh();
  }

  if (done) {
    return (
      <div className="alert alert-ok" style={{ marginBottom: 0 }}>
        <span className="alert-icon">✓</span>
        <span>
          נוסף לרשימה שלך. <Link href="/stack">מעבר לרשימה ולבדיקת התראות ←</Link>
        </span>
      </div>
    );
  }

  if (!open) {
    return (
      <button className="primary" onClick={() => setOpen(true)}>
        הוספה לרשימה שלי
      </button>
    );
  }

  return (
    <div className="panel">
      <div className="field-row">
        <div>
          <label style={{ marginTop: 0 }}>כדורים בכל פעם</label>
          <input type="number" min={1} value={pills}
                 onChange={(e) => setPills(parseFloat(e.target.value) || 1)} />
        </div>
        <div>
          <label style={{ marginTop: 0 }}>פעמים בשבוע (1–7)</label>
          <input type="number" min={1} max={7} value={perWeek}
                 onChange={(e) => setPerWeek(parseInt(e.target.value) || 7)} />
        </div>
      </div>
      <label>מתי</label>
      <input value={schedule} onChange={(e) => setSchedule(e.target.value)} />

      <p className="dim" style={{ marginTop: 10 }}>
        התדירות נכנסת לחישוב הצריכה היומית הממוצעת שעליה מבוססות ההתראות.
      </p>

      <div className="row" style={{ gap: 8 }}>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? 'מוסיף…' : 'אישור והוספה'}
        </button>
        <button className="ghost" onClick={() => setOpen(false)} disabled={busy}>ביטול</button>
      </div>

      {error && (
        <div className="alert alert-danger" style={{ marginTop: 12, marginBottom: 0 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>
      )}
    </div>
  );
}
