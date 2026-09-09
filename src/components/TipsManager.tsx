'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addTip, toggleTip, deleteTip } from '@/app/actions/tips';

interface Tip { id: string; body: string; active: boolean; }

export default function TipsManager({ tips }: { tips: Tip[] }) {
  const router = useRouter();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function add() {
    setMsg(null); setBusy(true);
    const res = await addTip(body);
    setBusy(false);
    if (res.error) { setMsg({ ok: false, text: res.error }); return; }
    setBody(''); setMsg({ ok: true, text: 'הטיפ נוסף.' }); router.refresh();
  }

  return (
    <div>
      {tips.length === 0 ? null : tips.map((t) => (
        <div key={t.id} className="item">
          <div className="item-main">
            <span style={{ opacity: t.active ? 1 : 0.5 }}>{t.body}</span>
            {!t.active && <span className="dim"> · מוסתר</span>}
          </div>
          <div className="row" style={{ gap: 6 }}>
            <button className="small" onClick={async () => { await toggleTip(t.id, !t.active); router.refresh(); }}>
              {t.active ? 'הסתרה' : 'הצגה'}
            </button>
            <button className="ghost small" onClick={async () => { await deleteTip(t.id); router.refresh(); }}>
              מחיקה
            </button>
          </div>
        </div>
      ))}

      <div className="inline-form" style={{ marginTop: 14 }}>
        <input value={body} onChange={(e) => setBody(e.target.value)}
               placeholder="טיפ חדש שיוצג ללקוחות בעמוד היום…" style={{ flex: 1, minWidth: 220 }} />
        <button className="primary" onClick={add} disabled={busy || !body.trim()}>
          {busy ? 'מוסיף…' : 'הוספת טיפ'}
        </button>
      </div>
      {msg && (
        <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-danger'}`} style={{ marginTop: 12 }}>
          <span className="alert-icon">{msg.ok ? '✓' : '⛔'}</span><span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
