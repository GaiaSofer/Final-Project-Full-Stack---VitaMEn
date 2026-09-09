'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateProfile } from '@/app/actions/profile';
import type { Profile } from '@/types/database.types';

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [sex, setSex] = useState(profile.sex ?? '');
  const [age, setAge] = useState(profile.age?.toString() ?? '');
  const [stage, setStage] = useState(profile.stage);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setMsg(null); setBusy(true);
    const res = await updateProfile({
      sex: sex as 'male' | 'female' | '',
      age: age ? parseInt(age, 10) : null,
      stage,
    });
    setBusy(false);
    if (!res.error) router.refresh();
    setMsg(res.error ? { ok: false, text: res.error } : { ok: true, text: 'הפרטים נשמרו.' });
  }

  return (
    <div>
      <div className="field-row">
        <div>
          <label>מין</label>
          <select value={sex} onChange={(e) => setSex(e.target.value)}>
            <option value="">—</option>
            <option value="female">נקבה</option>
            <option value="male">זכר</option>
          </select>
        </div>
        <div>
          <label>גיל</label>
          <input type="number" min={0} max={120} value={age} onChange={(e) => setAge(e.target.value)} />
        </div>
      </div>
      <label>היריון / הנקה</label>
      <select value={stage} onChange={(e) => setStage(e.target.value as Profile['stage'])}>
        <option value="none">לא בהיריון ולא מניקה</option>
        <option value="pregnant">בהיריון</option>
        <option value="breastfeeding_0_6">מניקה, 0–6 חודשים</option>
        <option value="breastfeeding_7_12">מניקה, 7–12 חודשים</option>
      </select>
      <button className="primary" onClick={submit} disabled={busy} style={{ marginTop: 16 }}>
        {busy ? 'שומר…' : 'שמירה'}
      </button>
      {msg && (
        <div className={`alert ${msg.ok ? 'alert-ok' : 'alert-danger'}`} style={{ marginTop: 12 }}>
          <span className="alert-icon">{msg.ok ? '✓' : '⛔'}</span><span>{msg.text}</span>
        </div>
      )}
    </div>
  );
}
