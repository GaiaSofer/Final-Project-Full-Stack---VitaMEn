import { createClient } from '@/lib/supabase/server';
import { NextResponse, type NextRequest } from 'next/server';

// Landing point for the Supabase password-recovery email link. Supabase
// redirects here with a one-time `code` query param (PKCE flow); we exchange
// it for a real session so /reset-password can call auth.updateUser() as
// that user, then send them on to set a new password.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/reset-password';

  if (code) {
    const supabase = createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/forgot-password`);
}
