import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import ProfileForm from '@/components/ProfileForm';
import RecommendationsEditor from '@/components/RecommendationsEditor';
import type { Profile, MedicalRecommendation } from '@/types/database.types';

export default async function ProfilePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  if (profile?.role !== 'client') redirect('/catalog');
  const { data: recs } = await supabase
    .from('medical_recommendations').select('*').eq('client_id', user.id).order('created_at');

  return (
    <div className="container">
      <p className="muted" style={{ marginTop: 4 }}>
        <Link href="/stack">← חזרה לרשימה שלי</Link>
      </p>

      <div className="page-head">
        <h1>הפרופיל שלי</h1>
        <p className="muted">הנתונים משמשים לבחירת שורת הייחוס הרשמית בלבד</p>
      </div>

      <div className="card">
        <div className="card-title"><h3>פרטים אישיים</h3></div>
        <p className="muted">
          גיל, מין וסטטוס היריון משמשים אך ורק כדי לבחור את שורת הייחוס הנכונה בטבלה הרשמית —
          לעולם לא לחישוב מינון אישי.
        </p>
        <ProfileForm profile={profile as Profile} />
      </div>

      <div className="card">
        <div className="card-title"><h3>המלצות רופא</h3></div>
        <p className="muted">
          כאן מזינים יעדים שקיבלת מרופא (למשל: ויטמין D, 25, mcg).
          <br />המערכת תציג הודעה ירוקה כשהגעת ליעד.
        </p>
        <RecommendationsEditor recs={(recs ?? []) as MedicalRecommendation[]} />
      </div>
    </div>
  );
}
