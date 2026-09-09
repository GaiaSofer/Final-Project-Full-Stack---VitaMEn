import { describe, it, expect, vi, beforeEach } from 'vitest';

// Assignment requirement: "פאג'ינציה ב-/today".
// Verifies the history query is actually bounded with Supabase .range()
// per the requested page, not loaded in full and sliced client-side.

vi.mock('next/navigation', () => ({
  redirect: () => {
    throw new Error('unexpected redirect — a signed-in user should not be redirected');
  },
}));

const mockRange = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => ({
    auth: { getUser: () => Promise.resolve({ data: { user: { id: 'client-1' } } }) },
    from: (table: string) => {
      if (table === 'intake_items') {
        return { select: () => ({ eq: () => Promise.resolve({ data: [] }) }) };
      }
      if (table === 'tips') {
        return { select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [] }) }) }) };
      }
      if (table === 'intake_logs') {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                range: mockRange,
              }),
            }),
          }),
        };
      }
      throw new Error(`unexpected query on "${table}"`);
    },
  }),
}));

beforeEach(() => {
  mockRange.mockReset();
  mockRange.mockResolvedValue({ data: [] });
});

describe('TodayPage — history pagination', () => {
  it('requests rows 0-9 for page 0 (default, no ?page)', async () => {
    const { default: TodayPage } = await import('./page');
    await TodayPage({ searchParams: {} });
    expect(mockRange).toHaveBeenCalledWith(0, 9);
  });

  it('requests rows 20-29 for ?page=2', async () => {
    const { default: TodayPage } = await import('./page');
    await TodayPage({ searchParams: { page: '2' } });
    expect(mockRange).toHaveBeenCalledWith(20, 29);
  });

  it('never lets a negative or non-numeric page underflow before row 0', async () => {
    const { default: TodayPage } = await import('./page');
    await TodayPage({ searchParams: { page: '-5' } });
    expect(mockRange).toHaveBeenCalledWith(0, 9);
    mockRange.mockClear();
    await TodayPage({ searchParams: { page: 'not-a-number' } });
    expect(mockRange).toHaveBeenCalledWith(0, 9);
  });
});
