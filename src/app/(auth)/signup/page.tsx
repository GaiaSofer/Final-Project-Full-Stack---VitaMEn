'use client';
import { signUp } from '@/app/actions/auth';
import { useState } from 'react';
import Link from 'next/link';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  async function action(formData: FormData) {
    const res = await signUp(formData);
    if (res?.error) setError(res.error);
  }
  return (
    <div className="container-narrow">
      <div className="card">
        <h1 style={{ fontSize: 24, marginBottom: 3 }}>יצירת חשבון</h1>
        <p className="muted" style={{ marginBottom: 4 }}>שתי דקות, ואפשר להתחיל לעקוב</p>
        <form action={action}>
          <label>שם מלא</label>
          <input name="full_name" required />
          <label>אימייל</label>
          <input name="email" type="email" dir="ltr" required autoComplete="email" />
          <label>סיסמה</label>
          <input name="password" type="password" dir="ltr" required minLength={6} autoComplete="new-password" />
          <label>סוג חשבון</label>
          <select name="role" defaultValue="client">
            <option value="client">לקוח — מעקב אחר התוספים שלי</option>
            <option value="admin">מנהל — תחזוקת הקטלוג</option>
          </select>
          <button className="primary" type="submit" style={{ width: '100%', marginTop: 18 }}>יצירת חשבון</button>
        </form>
        {error && <div className="alert alert-danger" style={{ marginTop: 14 }}>
          <span className="alert-icon">⛔</span><span>{error}</span>
        </div>}
        <p className="muted" style={{ marginTop: 16, marginBottom: 0 }}>
          כבר יש לך חשבון? <Link href="/login">כניסה</Link>
        </p>
      </div>
    </div>
  );
}
