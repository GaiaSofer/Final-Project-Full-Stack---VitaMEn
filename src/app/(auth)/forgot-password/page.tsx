'use client';
import { requestPasswordReset } from '@/app/actions/auth';
import { useState } from 'react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  async function action(formData: FormData) {
    const res = await requestPasswordReset(formData);
    if (res?.error) setError(res.error);
    else setSent(true);
  }
  return (
    <div className="container-narrow">
      <div className="card">
        <h1 style={{ fontSize: 24, marginBottom: 3 }}>שכחת סיסמה?</h1>
        <p className="muted" style={{ marginBottom: 4 }}>נשלח לך קישור לאיפוס הסיסמה למייל</p>
        {sent ? (
          <div className="alert" style={{ marginTop: 14 }}>
            <span>נשלח קישור לאיפוס סיסמא למייל</span>
          </div>
        ) : (
          <form action={action}>
            <label>אימייל</label>
            <input name="email" type="email" dir="ltr" required autoComplete="email" />
            <button className="primary" type="submit" style={{ width: '100%', marginTop: 18 }}>שליחת קישור לאיפוס</button>
          </form>
        )}
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
        <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
          נזכרת בסיסמה? <Link href="/login">כניסה</Link>
        </p>
      </div>
    </div>
  );
}
