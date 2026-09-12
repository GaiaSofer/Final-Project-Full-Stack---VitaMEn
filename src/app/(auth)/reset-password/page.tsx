'use client';
import { updatePassword } from '@/app/actions/auth';
import { useState } from 'react';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function action(formData: FormData) {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await updatePassword(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }
  return (
    <div className="container-narrow">
      <div className="card">
        <h1 style={{ fontSize: 24, marginBottom: 3 }}>קביעת סיסמה חדשה</h1>
        <p className="muted" style={{ marginBottom: 4 }}>הזיני סיסמה חדשה לחשבונך</p>
        <form action={action}>
          <label>סיסמה חדשה</label>
          <PasswordInput name="password" minLength={6} autoComplete="new-password" />
          <button className="primary" type="submit" disabled={pending} style={{ width: '100%', marginTop: 18 }}>
            {pending ? 'מעדכן...' : 'עדכון סיסמה'}
          </button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
      </div>
    </div>
  );
}
