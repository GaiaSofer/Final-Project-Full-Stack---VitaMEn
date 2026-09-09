import { describe, it, expect } from 'vitest';
import { pillsLabel } from './pills-label';

describe('pillsLabel (Hebrew singular/plural)', () => {
  it('uses the singular form for exactly one pill', () => {
    expect(pillsLabel(1)).toBe('כדור אחד');
  });
  it('uses the plural form with the count for anything else', () => {
    expect(pillsLabel(2)).toBe('2 כדורים');
    expect(pillsLabel(0)).toBe('0 כדורים');
    expect(pillsLabel(3)).toBe('3 כדורים');
  });
});
