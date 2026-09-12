'use client';
import { signIn } from '@/app/actions/auth';
import { useState } from 'react';
import Link from 'next/link';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  async function action(formData: FormData) {
    if (pending) return;
    setPending(true);
    setError(null);
    const res = await signIn(formData);
    if (res?.error) {
      setError(res.error);
      setPending(false);
    }
  }
  return (
    <div className="container-narrow">
      <div className="card">
        <h1 style={{ fontSize: 24, marginBottom: 3 }}>כניסה</h1>
        <p className="muted" style={{ marginBottom: 4 }}>ברוכה השבה ל-VitaMEn</p>
        <form action={action}>
          <label>אימייל</label>
          <input name="email" type="email" dir="ltr" required autoComplete="email" />
          <label>סיסמה</label>
          <PasswordInput name="password" autoComplete="current-password" />
          <button className="primary" type="submit" disabled={pending} style={{ width: '100%', marginTop: 18 }}>
            {pending ? 'מתחבר...' : 'כניסה'}
          </button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
        <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
          <Link href="/forgot-password">שכחת סיסמה?</Link>
        </p>
        <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>
          אין לך חשבון? <Link href="/signup">יצירת חשבון</Link>
        </p>
      </div>
    </div>
  );
}
