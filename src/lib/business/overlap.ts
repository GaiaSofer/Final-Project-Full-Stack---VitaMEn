// Pure business logic: sum each ingredient across the supplements a client
// takes, and flag any that exceed a safe daily limit. No DB, no React -> unit
// testable. This is the safety engine and the core "business logic".
import type { SupplementIngredient } from '@/types/database.types';

// Illustrative daily upper limits per ingredient + unit.
export const DAILY_LIMITS: Record<string, { amount: number; unit: string }> = {
  'Vitamin D': { amount: 2000, unit: 'IU' },
  'Caffeine':  { amount: 400,  unit: 'mg' },
  'Magnesium': { amount: 350,  unit: 'mg' },
  'Zinc':      { amount: 40,   unit: 'mg' },
  'Iron':      { amount: 45,   unit: 'mg' },
};

export interface OverlapWarning {
  ingredient: string;
  unit: string;
  total: number;
  limit: number;
}

export function computeIngredientOverlap(
  supplementIds: string[],
  ingredientsBySupplement: Record<string, SupplementIngredient[]>,
): OverlapWarning[] {
  const totals: Record<string, { amount: number; unit: string }> = {};

  for (const id of supplementIds) {
    for (const ing of ingredientsBySupplement[id] ?? []) {
      const key = ing.ingredient_name;
      if (!totals[key]) totals[key] = { amount: 0, unit: ing.unit };
      if (totals[key].unit === ing.unit) totals[key].amount += ing.amount;
    }
  }

  const warnings: OverlapWarning[] = [];
  for (const [name, { amount, unit }] of Object.entries(totals)) {
    const limit = DAILY_LIMITS[name];
    if (limit && limit.unit === unit && amount > limit.amount) {
      warnings.push({ ingredient: name, unit, total: amount, limit: limit.amount });
    }
  }
  return warnings;
}
