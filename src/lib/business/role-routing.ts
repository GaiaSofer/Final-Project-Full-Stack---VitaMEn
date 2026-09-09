// Where a user lands immediately after sign-up/sign-in, based on their role.
// Kept as its own tiny pure function (rather than inline in the server action)
// so the routing decision is unit-testable without touching Supabase, cookies,
// or Next's request context.
export function homeForRole(role: string): '/catalog' | '/today' {
  return role === 'admin' ? '/catalog' : '/today';
}
