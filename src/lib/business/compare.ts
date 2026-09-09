// Pure comparison logic for the catalog. Money is integer cents (no float bugs).
import type { Supplement, SupplementIngredient } from '@/types/database.types';

export interface CompareRow {
  supplement: Supplement;
  amount: number;
  unit: string;
  pricePerUnitCents: number;
}

// Rank every supplement that contains `ingredientName` by price per unit.
export function compareByIngredient(
  ingredientName: string,
  supplements: Supplement[],
  ingredientsBySupplement: Record<string, SupplementIngredient[]>,
): CompareRow[] {
  const rows: CompareRow[] = [];
  for (const s of supplements) {
    const ing = (ingredientsBySupplement[s.id] ?? []).find(
      (i) => i.ingredient_name === ingredientName,
    );
    if (!ing || ing.amount <= 0) continue;
    rows.push({
      supplement: s,
      amount: ing.amount,
      unit: ing.unit,
      pricePerUnitCents: Math.round(s.price_cents / ing.amount),
    });
  }
  return rows.sort((a, b) => a.pricePerUnitCents - b.pricePerUnitCents);
}

export interface AlternativeRow extends CompareRow {
  /** How many ingredients this alternative shares with the target product
   *  (including the main one). Higher = a closer match, not just cheaper. */
  overlapCount: number;
}

// Given one supplement the client looks at, find cheaper alternatives that
// share its main (first-listed) ingredient at a lower price per unit —
// ranked by how closely they match the ORIGINAL product first, and only
// then by price. A product that shares 3 of the target's 3 ingredients
// outranks one that only shares the main ingredient, even if the latter is
// cheaper; within the same match quality, cheapest comes first.
export function findCheaperAlternatives(
  target: Supplement,
  supplements: Supplement[],
  ingredientsBySupplement: Record<string, SupplementIngredient[]>,
): AlternativeRow[] {
  const targetIngredients = ingredientsBySupplement[target.id] ?? [];
  if (targetIngredients.length === 0) return [];
  const mainIngredient = targetIngredients[0].ingredient_name;
  const targetIngredientNames = new Set(targetIngredients.map((i) => i.ingredient_name));

  const ranked = compareByIngredient(mainIngredient, supplements, ingredientsBySupplement);
  const targetRow = ranked.find((r) => r.supplement.id === target.id);
  if (!targetRow) return [];

  const candidates: AlternativeRow[] = ranked
    // only those strictly cheaper per unit than the target
    .filter((r) => r.supplement.id !== target.id && r.pricePerUnitCents < targetRow.pricePerUnitCents)
    .map((r) => {
      const ownIngredients = ingredientsBySupplement[r.supplement.id] ?? [];
      const overlapCount = ownIngredients.filter((i) => targetIngredientNames.has(i.ingredient_name)).length;
      return { ...r, overlapCount };
    });

  // Primary: most shared ingredients with the original product first.
  // Secondary (within the same overlap count): cheapest per unit first.
  return candidates.sort((a, b) =>
    b.overlapCount - a.overlapCount || a.pricePerUnitCents - b.pricePerUnitCents,
  );
}
