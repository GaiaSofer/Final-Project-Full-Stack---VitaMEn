'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addRecommendation, removeRecommendation } from '@/app/actions/profile';
import type { MedicalRecommendation } from '@/types/database.types';

export default function RecommendationsEditor({ recs }: { recs: MedicalRecommendation[] }) {
  const router = useRouter();
  const [ingredient, setIngredient] = useState('');
  const [amount, setAmount] = useState('');
  const [unit, setUnit] = useState('mcg');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function add() {
    setMsg(null); setBusy(true);
    const res = await addRecommendation({ ingredient, amount: parseFloat(amount) || 0, unit, note: '' });
    setBusy(false);
    if (!res.error) router.refresh();
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: 'ההמלצה נוספה.' });
    if (!res.error) { setIngredient(''); setAmount(''); }
  }

  return (
    <div>
      {recs.length > 0 && (
        recs.map((r) => (
          <div key={r.id} className="item">
            <div className="item-main">
              <span className="item-title">{r.ingredient_name}</span>
              <span className="muted"> · יעד {r.target_amount}{r.unit} ליום</span>
            </div>
            <button className="ghost small" onClick={() => removeRecommendation(r.id)}>הסרה</button>
          </div>
        )))}

      <div className="inline-form" style={{ marginTop: 14 }}>
        <div style={{ flex: 2, minWidth: 150 }}>
          <label>רכיב (באנגלית)</label>
          <input placeholder="Vitamin D" dir="ltr" value={ingredient}
                 onChange={(e) => setIngredient(e.target.value)} style={{ width: '100%' }} />
        </div>
        <div>
          <label>כמות</label>
          {/* explicit width + minWidth here overrides .inline-form's global
              `min-width: 130px; flex: 1`, which was forcing this field wider
              than its 100px slot and pushing the next field/button on top of it */}
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                 style={{ width: 90, minWidth: 0, flex: '0 0 auto' }} />
        </div>
        <div>
          <label>יחידה</label>
          <select value={unit} onChange={(e) => setUnit(e.target.value)}
                  style={{ width: 84, minWidth: 0, flex: '0 0 auto' }}>
            <option value="mcg">mcg</option>
            <option value="mg">mg</option>
          </select>
        </div>
        <button className="primary" onClick={add} disabled={busy} style={{ flex: '0 0 auto' }}>
          {busy ? '…' : 'הוספה'}
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
