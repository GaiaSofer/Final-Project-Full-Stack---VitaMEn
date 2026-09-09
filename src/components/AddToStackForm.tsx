'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { addToStack } from '@/app/actions/intake';
import type { Supplement } from '@/types/database.types';

export default function AddToStackForm({ supplements }: { supplements: Supplement[] }) {
  const router = useRouter();
  const [supplementId, setSupplementId] = useState('');
  const [dosage, setDosage] = useState('כמוסה אחת');
  const [schedule, setSchedule] = useState('בוקר');
  const [pills, setPills] = useState(1);
  const [perWeek, setPerWeek] = useState(7);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // A success message shouldn't linger forever, especially once the person
  // has moved on to a different action elsewhere on the page (e.g. removing
  // a different item) — auto-dismiss it. Errors stay until the next submit.
  useEffect(() => {
    if (!msg?.ok) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function submit() {
    setMsg(null); setBusy(true);
    const res = await addToStack(supplementId, dosage, schedule, pills, perWeek);
    setBusy(false);
    if (!res.error) router.refresh();
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: 'התוסף נוסף לרשימה.' });
    if (!res.error) setSupplementId('');
  }

  return (
    <div>
      <label>תוסף מהקטלוג</label>
      <select value={supplementId} onChange={(e) => setSupplementId(e.target.value)}>
        <option value="" disabled>בחרי תוסף…</option>
        {supplements.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.brand}</option>)}
      </select>

      <div className="field-row">
        <div>
          <label>מינון (תיאור)</label>
          <input value={dosage} onChange={(e) => setDosage(e.target.value)} />
        </div>
        <div>
          <label>מתי</label>
          <input value={schedule} onChange={(e) => setSchedule(e.target.value)} />
        </div>
        <div>
          <label>כדורים בכל פעם</label>
          <input type="number" min={1} value={pills}
                 onChange={(e) => setPills(parseFloat(e.target.value) || 1)} />
        </div>
        <div>
          <label>פעמים בשבוע (1–7)</label>
          <input type="number" min={1} max={7} value={perWeek}
                 onChange={(e) => setPerWeek(parseInt(e.target.value) || 7)} />
        </div>
      </div>

      <p className="dim" style={{ marginTop: 10 }}>
        התדירות נכנסת לחישוב: תוסף שנלקח פעמיים ביום נספר כמינון יומי כפול.
      </p>

      <button className="primary" onClick={submit} disabled={!supplementId || busy} style={{ marginTop: 6 }}>
        {busy ? 'מוסיף…' : 'הוספה לרשימה'}
      </button>

      {msg && (
        <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-danger'}`} style={{ marginTop: 12 }}>
          <span className="alert-icon">{msg.ok ? '✓' : '⛔'}</span><span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
