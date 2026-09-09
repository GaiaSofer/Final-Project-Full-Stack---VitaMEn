'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { requestProduct } from '@/app/actions/requests';

export default function RequestProductForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  // Same reasoning as elsewhere on this page: a success toast should not
  // outlive the moment — auto-dismiss it rather than leave it stuck.
  useEffect(() => {
    if (!msg?.ok) return;
    const t = setTimeout(() => setMsg(null), 4000);
    return () => clearTimeout(t);
  }, [msg]);

  async function submit() {
    setMsg(null); setBusy(true);
    const res = await requestProduct(name, note);
    setBusy(false);
    if ('ok' in res) {
      router.refresh();
      setMsg({ ok: true, text: res.message ?? 'הבקשה נשלחה.' });
      setName(''); setNote('');
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div>
      <div className="inline-form">
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>שם המוצר החסר</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <label>הערה (רשות)</label>
          <input value={note} onChange={(e) => setNote(e.target.value)} style={{ width: '100%' }} />
        </div>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? 'שולח…' : 'שליחת בקשה'}
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
