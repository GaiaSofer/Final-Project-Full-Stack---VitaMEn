'use client';
import { updatePassword } from '@/app/actions/auth';
import { useState } from 'react';

export default function ResetPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  async function action(formData: FormData) {
    const res = await updatePassword(formData);
    if (res?.error) setError(res.error);
  }
  return (
    <div className="container-narrow">
      <div className="card">
        <h1 style={{ fontSize: 24, marginBottom: 3 }}>קביעת סיסמה חדשה</h1>
        <p className="muted" style={{ marginBottom: 4 }}>הזיני סיסמה חדשה לחשבונך</p>
        <form action={action}>
          <label>סיסמה חדשה</label>
          <input name="password" type="password" dir="ltr" required minLength={6} autoComplete="new-password" />
          <button className="primary" type="submit" style={{ width: '100%', marginTop: 18 }}>עדכון סיסמה</button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
      </div>
    </div>
  );
}
