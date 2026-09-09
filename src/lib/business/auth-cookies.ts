// Which cookie names signOut() must delete. Pulled out as its own pure
// function (rather than an inline .filter() in auth.ts) so the one bit of
// actual logic in the logout fix — which cookies count as "a Supabase auth
// cookie" — is unit-testable without cookies()/next/headers at all.
export function isSupabaseAuthCookie(name: string): boolean {
  return name.startsWith('sb-');
}
