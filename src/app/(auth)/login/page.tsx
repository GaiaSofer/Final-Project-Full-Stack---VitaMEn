'use client';
import { signIn } from '@/app/actions/auth';
import { useState } from 'react';
import Link from 'next/link';

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null);
  async function action(formData: FormData) {
    const res = await signIn(formData);
    if (res?.error) setError(res.error);
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
          <input name="password" type="password" dir="ltr" required autoComplete="current-password" />
          <button className="primary" type="submit" style={{ width: '100%', marginTop: 18 }}>כניסה</button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
        <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
          אין לך חשבון? <Link href="/signup">יצירת חשבון</Link>
        </p>
      </div>
    </div>
  );
}
