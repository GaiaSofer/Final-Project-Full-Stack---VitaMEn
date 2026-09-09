import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import BrandMark from '@/components/BrandMark';
import BrandTitle from '@/components/BrandTitle';

export default async function Home() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).maybeSingle();
    redirect(profile?.role === 'admin' ? '/catalog' : '/today');
  }

  return (
    <div className="container-narrow" style={{ paddingTop: 56 }}>
      <div style={{ textAlign: 'center', marginBottom: 26 }}>
        <div style={{ marginBottom: 10 }}>
          <BrandTitle />
        </div>
        <p style={{ margin: '0 0 14px', color: 'var(--brand)', fontWeight: 600, letterSpacing: '.01em', fontStyle: 'italic' }}>only the best for me</p>
        <p className="muted" style={{ fontSize: 15, lineHeight: 1.65 }}>
          עקוב אחר התוספים שאתה נוטל, קבל התראה כשסך הצריכה של רכיב חורג מהסף המומלץ,
          והשווה מחירים בין מותגים.
        </p>
      </div>

      <div className="card">
        <div className="row" style={{ gap: 10 }}>
          <Link href="/signup" className="btn primary" style={{ flex: 1, textAlign: 'center' }}>
            יצירת חשבון
          </Link>
          <Link href="/login" className="btn" style={{ flex: 1, textAlign: 'center' }}>
            כניסה
          </Link>
        </div>
      </div>

      <div className="grid grid-2" style={{ gap: 12 }}>
        <div className="panel">
          <div style={{ fontSize: 19, marginBottom: 4 }}>⛔</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>התראת חריגה</div>
          <div className="dim">סכימת רכיבים מול הסף היומי הרשמי</div>
        </div>
        <div className="panel">
          <div style={{ fontSize: 19, marginBottom: 4 }}>⚠️</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>זיהוי חפיפה</div>
          <div className="dim">כשאותו רכיב מופיע בכמה תוספים</div>
        </div>
        <div className="panel">
          <div style={{ fontSize: 19, marginBottom: 4 }}>💰</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>השוואת מחירים</div>
          <div className="dim">חלופות זולות יותר מהקטלוג</div>
        </div>
        <div className="panel">
          <div style={{ fontSize: 19, marginBottom: 4 }}>✓</div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>מעקב יומי</div>
          <div className="dim">סימון נטילה והיסטוריה</div>
        </div>
      </div>
    </div>
  );
}
