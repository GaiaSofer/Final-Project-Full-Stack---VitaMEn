'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { importFromCsv } from '@/app/actions/catalog';

const TEMPLATE = 'name,brand,category,price_min,price_max,origin,source_url,info,ingredient,amount,unit';

export default function CsvImport() {
  const router = useRouter();
  const [csv, setCsv] = useState(TEMPLATE + '\n');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function run() {
    setMsg(null); setBusy(true);
    const res = await importFromCsv(csv);
    setBusy(false);
    if ('ok' in res) {
      router.refresh();
      setMsg({ ok: true, text: `יובאו ${res.added} מוצרים.` });
    } else {
      setMsg({ ok: false, text: res.error });
    }
  }

  return (
    <div>
      <p className="muted">
        הדביקי שורות בפורמט הבא — שורה אחת לכל רכיב. שורות עם אותו שם+מותג מקובצות למוצר אחד.
      </p>
      <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={7} dir="ltr"
                style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, lineHeight: 1.6 }} />
      <div style={{ marginTop: 12 }}>
        <button className="primary" onClick={run} disabled={busy}>{busy ? 'מייבא…' : 'ייבוא'}</button>
      </div>
      {msg && (
        <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-danger'}`} style={{ marginTop: 12 }}>
          <span className="alert-icon">{msg.ok ? '✓' : '⛔'}</span><span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
