'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { addSupplement } from '@/app/actions/catalog';
import type { IngredientInput } from '@/types/database.types';

export default function AddSupplementForm() {
  const router = useRouter();
  const [f, setF] = useState({
    name: '', brand: '', priceMin: '0', priceMax: '',
    origin: '', sourceUrl: '', category: '', purpose: '', info: '',
  });
  const [ingredients, setIngredients] = useState<IngredientInput[]>([
    { ingredient_name: '', amount: 0, unit: 'mg' },
  ]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: string) => setF({ ...f, [k]: v });

  function setIng(i: number, patch: Partial<IngredientInput>) {
    setIngredients(ingredients.map((g, j) => (j === i ? { ...g, ...patch } : g)));
  }

  async function submit() {
    setMsg(null); setBusy(true);
    const res = await addSupplement({
      name: f.name, brand: f.brand,
      priceMinCents: Math.round(parseFloat(f.priceMin || '0') * 100),
      priceMaxCents: f.priceMax ? Math.round(parseFloat(f.priceMax) * 100) : null,
      currency: 'ILS',
      purpose: f.purpose.split(',').map((p) => p.trim()).filter(Boolean),
      info: f.info,
      origin: f.origin as 'israel' | 'abroad' | '',
      sourceUrl: f.sourceUrl, category: f.category,
      ingredients: ingredients.filter((g) => g.ingredient_name.trim()),
    });
    setBusy(false);
    if (!res.error) router.refresh();
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: 'המוצר נוסף לקטלוג.' });
  }

  return (
    <div>
      <div className="field-row">
        <div><label>שם המוצר</label><input value={f.name} onChange={(e) => set('name', e.target.value)} /></div>
        <div><label>מותג</label><input value={f.brand} onChange={(e) => set('brand', e.target.value)} /></div>
        <div><label>מחיר מינימלי (₪)</label>
          <input type="number" step="0.01" value={f.priceMin} onChange={(e) => set('priceMin', e.target.value)} /></div>
        <div><label>מחיר מקסימלי (₪)</label>
          <input type="number" step="0.01" value={f.priceMax} onChange={(e) => set('priceMax', e.target.value)} /></div>
        <div><label>קטגוריה</label>
          <input placeholder="vitamin / sleep / hair…" value={f.category} onChange={(e) => set('category', e.target.value)} /></div>
        <div><label>מקור</label>
          <select value={f.origin} onChange={(e) => set('origin', e.target.value)}>
            <option value="">—</option>
            <option value="israel">ישראל</option>
            <option value="abroad">חו״ל</option>
          </select>
        </div>
      </div>

      <label>קישור למקור (איפה נמכר)</label>
      <input dir="ltr" value={f.sourceUrl} onChange={(e) => set('sourceUrl', e.target.value)} />
      <label>מטרות (מופרד בפסיקים)</label>
      <input placeholder="sleep, immunity" value={f.purpose} onChange={(e) => set('purpose', e.target.value)} />
      <label>תיאור קצר</label>
      <input value={f.info} onChange={(e) => set('info', e.target.value)} />

      <label>רכיבים</label>
      {ingredients.map((g, i) => (
        <div className="inline-form" key={i} style={{ marginBottom: 8 }}>
          <input placeholder="Vitamin D" dir="ltr" value={g.ingredient_name}
                 onChange={(e) => setIng(i, { ingredient_name: e.target.value })} style={{ flex: 2 }} />
          <input placeholder="כמות" type="number" value={g.amount}
                 onChange={(e) => setIng(i, { amount: parseFloat(e.target.value) || 0 })} style={{ maxWidth: 110 }} />
          <select value={g.unit} onChange={(e) => setIng(i, { unit: e.target.value })} style={{ maxWidth: 90 }}>
            <option value="mg">mg</option>
            <option value="mcg">mcg</option>
            <option value="g">g</option>
          </select>
        </div>
      ))}
      <button className="small" onClick={() => setIngredients([...ingredients, { ingredient_name: '', amount: 0, unit: 'mg' }])}>
        + רכיב נוסף
      </button>

      <div style={{ marginTop: 16 }}>
        <button className="primary" onClick={submit} disabled={busy}>
          {busy ? 'מוסיף…' : 'הוספת מוצר'}
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
