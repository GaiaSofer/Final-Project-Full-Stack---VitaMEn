// The safety engine. Combines the client's stack (with frequency) against the
// dosage reference to produce three signals:
//   RED    = a summed daily intake exceeds the official UL ceiling.
//   YELLOW = an ingredient appears in more than one supplement (overlap).
//   GREEN  = a summed daily intake meets a doctor's recommended target.
//
// Framing rule (keeps "recommendation, not medical advice"): RED cites the
// official ceiling as a fact; GREEN compares against what the doctor/user
// entered. We never compute a personal dose from body metrics.
import type { SupplementIngredient } from '@/types/database.types';
import { DOSAGE_REFERENCE } from './dosage-reference';

export interface StackEntry {
  supplementId: string;
  pillsPerTime: number;
  timesPerWeek: number; // 1..7
}

export interface MedicalTarget {
  ingredient: string;
  amount: number;
  unit: string;
}

export interface RedWarning   { ingredient: string; unit: string; total: number; ceiling: number; }
export interface YellowWarning { ingredient: string; sources: number; }
export interface GreenNote     { ingredient: string; unit: string; total: number; target: number; }

interface Totals { [ingredient: string]: { amount: number; unit: string; sources: number }; }

// Average daily intake per ingredient across the whole stack.
export function sumDailyIntake(
  stack: StackEntry[],
  ingredientsBySupplement: Record<string, SupplementIngredient[]>,
): Totals {
  const totals: Totals = {};
  for (const entry of stack) {
    const perDayFactor = (entry.pillsPerTime * entry.timesPerWeek) / 7;
    for (const ing of ingredientsBySupplement[entry.supplementId] ?? []) {
      const key = ing.ingredient_name;
      if (!totals[key]) totals[key] = { amount: 0, unit: ing.unit, sources: 0 };
      if (totals[key].unit === ing.unit) {
        totals[key].amount += ing.amount * perDayFactor;
        totals[key].sources += 1;
      }
    }
  }
  return totals;
}

export function evaluateStack(
  stack: StackEntry[],
  ingredientsBySupplement: Record<string, SupplementIngredient[]>,
  medicalTargets: MedicalTarget[] = [],
): { red: RedWarning[]; yellow: YellowWarning[]; green: GreenNote[] } {
  const totals = sumDailyIntake(stack, ingredientsBySupplement);

  const red: RedWarning[] = [];
  const yellow: YellowWarning[] = [];
  for (const [name, t] of Object.entries(totals)) {
    const ref = DOSAGE_REFERENCE[name];
    if (ref && ref.ul != null && ref.unit === t.unit && t.amount > ref.ul) {
      red.push({ ingredient: name, unit: t.unit, total: round(t.amount), ceiling: ref.ul });
    }
    if (t.sources > 1) yellow.push({ ingredient: name, sources: t.sources });
  }

  const green: GreenNote[] = [];
  for (const target of medicalTargets) {
    const t = totals[target.ingredient];
    if (t && t.unit === target.unit && t.amount >= target.amount) {
      green.push({ ingredient: target.ingredient, unit: target.unit, total: round(t.amount), target: target.amount });
    }
  }

  return { red, yellow, green };
}

function round(n: number) { return Math.round(n * 100) / 100; }
