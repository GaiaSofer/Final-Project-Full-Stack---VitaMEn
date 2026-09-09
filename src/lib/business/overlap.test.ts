import { describe, it, expect } from 'vitest';
import { computeIngredientOverlap } from './overlap';
import { compareByIngredient, findCheaperAlternatives } from './compare';
import type { SupplementIngredient, Supplement } from '@/types/database.types';

function ing(supplement_id: string, name: string, amount: number, unit: string): SupplementIngredient {
  return { id: crypto.randomUUID(), supplement_id, ingredient_name: name, amount, unit };
}
function supp(id: string, name: string, brand: string, price_cents: number): Supplement {
  return { id, name, brand, price_cents, price_max_cents: null, currency: 'ILS', purpose: [], info: null, origin: null, source_url: null, category: null, created_at: '' };
}

describe('computeIngredientOverlap', () => {
  it('flags an ingredient when two supplements combined exceed the daily limit', () => {
    const map = { a: [ing('a', 'Vitamin D', 1800, 'IU')], b: [ing('b', 'Vitamin D', 1000, 'IU')] };
    const warnings = computeIngredientOverlap(['a', 'b'], map);
    expect(warnings).toEqual([{ ingredient: 'Vitamin D', unit: 'IU', total: 2800, limit: 2000 }]);
  });
  it('no warning when under the limit', () => {
    expect(computeIngredientOverlap(['a'], { a: [ing('a', 'Vitamin D', 1000, 'IU')] })).toHaveLength(0);
  });
  it('ignores ingredients without a defined limit', () => {
    expect(computeIngredientOverlap(['a'], { a: [ing('a', 'Vitamin C', 99999, 'mg')] })).toHaveLength(0);
  });
});

describe('compare + alternatives', () => {
  const supps = [supp('a', 'Magnesium', 'Solgar', 6500), supp('b', 'Magnesium', 'Now', 5200)];
  const map = { a: [ing('a', 'Magnesium', 200, 'mg')], b: [ing('b', 'Magnesium', 250, 'mg')] };

  it('ranks by cheapest price per unit first', () => {
    const rows = compareByIngredient('Magnesium', supps, map);
    expect(rows[0].supplement.id).toBe('b'); // 5200/250 < 6500/200
  });
  it('finds a cheaper alternative for the pricier option', () => {
    const alts = findCheaperAlternatives(supps[0], supps, map);
    expect(alts).toHaveLength(1);
    expect(alts[0].supplement.id).toBe('b');
  });
});

describe('findCheaperAlternatives ranks best ingredient match before price', () => {
  // Target has 2 ingredients: Vitamin D (main) + Magnesium.
  const target = supp('t', 'Multi', 'BrandT', 10000); // ₪100
  // Cheapest overall, but shares ONLY the main ingredient (Vitamin D).
  const cheapPartial = supp('p', 'Just D', 'BrandP', 3000); // ₪30
  // Pricier than the partial match, but shares BOTH ingredients — should rank first.
  const bestMatch = supp('b', 'Full Match', 'BrandB', 6000); // ₪60
  const supps = [target, cheapPartial, bestMatch];
  const map = {
    t: [ing('t', 'Vitamin D', 25, 'mcg'), ing('t', 'Magnesium', 200, 'mg')],
    p: [ing('p', 'Vitamin D', 25, 'mcg')],
    b: [ing('b', 'Vitamin D', 25, 'mcg'), ing('b', 'Magnesium', 200, 'mg')],
  };

  it('puts the fuller ingredient match ahead of the cheaper partial match', () => {
    const alts = findCheaperAlternatives(target, supps, map);
    expect(alts.map((a) => a.supplement.id)).toEqual(['b', 'p']);
    expect(alts[0].overlapCount).toBe(2);
    expect(alts[1].overlapCount).toBe(1);
  });

  it('within the same overlap count, cheapest still comes first', () => {
    const cheaperFullMatch = supp('c', 'Cheap Full Match', 'BrandC', 4000); // ₪40, also 2/2
    const map2 = { ...map, c: [ing('c', 'Vitamin D', 25, 'mcg'), ing('c', 'Magnesium', 200, 'mg')] };
    const alts = findCheaperAlternatives(target, [...supps, cheaperFullMatch], map2);
    const fullMatches = alts.filter((a) => a.overlapCount === 2);
    expect(fullMatches.map((a) => a.supplement.id)).toEqual(['c', 'b']);
  });
});
