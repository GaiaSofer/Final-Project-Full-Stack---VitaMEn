import { describe, it, expect } from 'vitest';
import { isSupabaseAuthCookie } from './auth-cookies';

// Regression test for the logout bug: signOut() must delete every Supabase
// session cookie, including the `.0`/`.1`-suffixed chunks @supabase/ssr
// uses once a session is large enough to split across multiple cookies —
// and must NOT touch unrelated cookies a future feature might set.
describe('isSupabaseAuthCookie', () => {
  it('matches the plain session cookie', () => {
    expect(isSupabaseAuthCookie('sb-glzlhsdwuczpecowfvii-auth-token')).toBe(true);
  });
  it('matches chunked session cookies', () => {
    expect(isSupabaseAuthCookie('sb-glzlhsdwuczpecowfvii-auth-token.0')).toBe(true);
    expect(isSupabaseAuthCookie('sb-glzlhsdwuczpecowfvii-auth-token.1')).toBe(true);
  });
  it('does not match unrelated cookies', () => {
    expect(isSupabaseAuthCookie('theme')).toBe(false);
    expect(isSupabaseAuthCookie('_ga')).toBe(false);
  });
});
