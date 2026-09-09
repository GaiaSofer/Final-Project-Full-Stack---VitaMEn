import { describe, it, expect } from 'vitest';
import { sumDailyIntake, evaluateStack, type StackEntry } from './safety';
import type { SupplementIngredient } from '@/types/database.types';

function ing(supplement_id: string, name: string, amount: number, unit: string): SupplementIngredient {
  return { id: crypto.randomUUID(), supplement_id, ingredient_name: name, amount, unit };
}

describe('safety engine', () => {
  const map = {
    a: [ing('a', 'Vitamin D', 50, 'mcg')],   // once daily -> 50/day
    b: [ing('b', 'Vitamin D', 60, 'mcg')],    // once daily -> 60/day
    c: [ing('c', 'Zinc', 30, 'mg')],
  };

  it('applies frequency: twice a day doubles the daily intake', () => {
    const stack: StackEntry[] = [{ supplementId: 'a', pillsPerTime: 2, timesPerWeek: 7 }];
    const totals = sumDailyIntake(stack, map);
    expect(totals['Vitamin D'].amount).toBe(100); // 50 * 2 * 7/7
  });

  it('RED when combined daily intake exceeds the UL ceiling (Vitamin D UL 100mcg)', () => {
    const stack: StackEntry[] = [
      { supplementId: 'a', pillsPerTime: 1, timesPerWeek: 7 },
      { supplementId: 'b', pillsPerTime: 1, timesPerWeek: 7 },
    ];
    const { red, yellow } = evaluateStack(stack, map);
    expect(red).toEqual([{ ingredient: 'Vitamin D', unit: 'mcg', total: 110, ceiling: 100 }]);
    expect(yellow).toEqual([{ ingredient: 'Vitamin D', sources: 2 }]); // overlap in 2 products
  });

  it('no RED for an occasional schedule that stays under the ceiling', () => {
    const stack: StackEntry[] = [{ supplementId: 'c', pillsPerTime: 1, timesPerWeek: 2 }]; // 30*2/7 ~ 8.6mg zinc
    expect(evaluateStack(stack, map).red).toHaveLength(0);
  });

  it('GREEN when the stack meets a doctor-entered target', () => {
    const stack: StackEntry[] = [{ supplementId: 'a', pillsPerTime: 1, timesPerWeek: 7 }]; // 50mcg/day
    const { green } = evaluateStack(stack, map, [{ ingredient: 'Vitamin D', amount: 25, unit: 'mcg' }]);
    expect(green).toEqual([{ ingredient: 'Vitamin D', unit: 'mcg', total: 50, target: 25 }]);
  });
});
