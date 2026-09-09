import { describe, it, expect, vi, beforeEach } from 'vitest';

// Assignment requirement: "בדיקה שלקוח לא יכול לפתוח /catalog".
// This is the page-level gate (defence in depth on top of RLS, which guards
// the actual data — see supabase/migrations/0001_init.sql "admin writes
// supplements" policy and the add_supplement() role check).

vi.mock('next/navigation', () => ({
  redirect: (path: string) => {
    throw new Error(`REDIRECT:${path}`);
  },
}));

const mockGetUser = vi.fn();
const mockProfileMaybeSingle = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: (table: string) => {
      if (table === 'profiles') {
        return { select: () => ({ eq: () => ({ maybeSingle: mockProfileMaybeSingle }) }) };
      }
      throw new Error(`unexpected query on "${table}" — the redirect should happen first`);
    },
  }),
}));

beforeEach(() => {
  mockGetUser.mockReset();
  mockProfileMaybeSingle.mockReset();
});

describe('CatalogPage (admin-only route)', () => {
  it('redirects an unauthenticated visitor to /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const { default: CatalogPage } = await import('./page');
    await expect(CatalogPage()).rejects.toThrow('REDIRECT:/login');
  });

  it('redirects a signed-in client to /today, never reading catalog data', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'client-1' } } });
    mockProfileMaybeSingle.mockResolvedValue({ data: { role: 'client', full_name: 'לקוח בדיקה' } });
    const { default: CatalogPage } = await import('./page');
    await expect(CatalogPage()).rejects.toThrow('REDIRECT:/today');
  });
});
