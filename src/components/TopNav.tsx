import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { signOut } from '@/app/actions/auth';
import BrandTitle from '@/components/BrandTitle';

// Role-aware navigation. Renders nothing for logged-out visitors so the auth
// pages stay clean. Server component: reads the profile directly.
export default async function TopNav() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles').select('role, full_name').eq('id', user.id).maybeSingle();
  if (!profile) return null;

  const isAdmin = profile.role === 'admin';
  const links = isAdmin
    ? [{ href: '/catalog', label: 'ניהול קטלוג' }]
    : [
        { href: '/today',   label: 'היום' },
        { href: '/stack',   label: 'התוספים שלי' },
        { href: '/browse',  label: 'קטלוג' },
      ];

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href={isAdmin ? '/catalog' : '/today'} className="brand" aria-label="VitaMEn">
          <BrandTitle fontSize={22} flowerSize={16} gap={7} />
        </Link>

        <div className="nav-links">
          {links.map((l) => (
            <Link key={l.href} href={l.href} className="nav-link">{l.label}</Link>
          ))}
          {isAdmin ? (
            <span className="badge brand" style={{ marginInlineStart: 6 }}>מנהל</span>
          ) : (
            <Link href="/profile" className="badge brand" title="הפרופיל שלי"
                  style={{ marginInlineStart: 6, textDecoration: 'none' }}>
              {profile.full_name?.split(' ')[0] || 'לקוח'}
            </Link>
          )}
          <form action={signOut}>
            <button className="ghost small" type="submit">התנתקות</button>
          </form>
        </div>
      </div>
    </nav>
  );
}
