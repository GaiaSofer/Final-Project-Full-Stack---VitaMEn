import { describe, it, expect } from 'vitest';
import { detectIntent, answer, type CatalogContext } from './engine';
import type { Supplement, SupplementIngredient } from '@/types/database.types';

function supp(id: string, name: string, brand: string, price: number): Supplement {
  return { id, name, brand, price_cents: price, price_max_cents: null, currency: 'ILS',
    purpose: [], info: null, origin: null, source_url: null, category: null, created_at: '' };
}
function ing(sid: string, name: string, amount: number, unit: string): SupplementIngredient {
  return { id: `${sid}-${name}`, supplement_id: sid, ingredient_name: name, amount, unit };
}

const ctx: CatalogContext = {
  supplements: [
    supp('a', 'Vitamin D3', 'Altman', 4200),
    supp('b', 'Omega-3', 'Now', 8900),
    supp('c', 'Magnesium', 'Solgar', 6500),
  ],
  ingredientsBySupplement: {
    a: [ing('a', 'Vitamin D', 25, 'mcg')],
    b: [ing('b', 'Omega-3', 1000, 'mg'), ing('b', 'Vitamin D', 45, 'mcg')],
    c: [ing('c', 'Magnesium', 200, 'mg')],
  },
};

describe('gaigi intent detection', () => {
  it('recognises a Hebrew ingredient question', () => {
    expect(detectIntent('אילו מוצרים מכילים ויטמין D?', ctx))
      .toEqual({ kind: 'ingredient', ingredient: 'Vitamin D' });
  });

  it('prefers the longer alias (B12 over B)', () => {
    expect(detectIntent('כמה ויטמין B12 מומלץ?', ctx))
      .toEqual({ kind: 'guideline', ingredient: 'Vitamin B12' });
  });

  it('recognises an alternatives question naming a catalog product', () => {
    expect(detectIntent('יש חלופה זולה ל-Omega-3?', ctx))
      .toEqual({ kind: 'alternatives', productName: 'Omega-3' });
  });

  it('falls back to unknown on an unrelated question', () => {
    expect(detectIntent('מה השעה?', ctx).kind).toBe('unknown');
  });
});

describe('gaigi answers', () => {
  it('lists products containing an ingredient, cheapest per unit first', () => {
    const r = answer('אילו מוצרים מכילים ויטמין D?', ctx);
    expect(r.products?.length).toBe(2);
    expect(r.mood).toBe('happy');
  });

  it('never invents a product that is not in the catalog', () => {
    const r = answer('אילו מוצרים מכילים סלניום?', ctx);
    expect(r.products).toBeUndefined();
    expect(r.mood).toBe('sad');
  });

  it('quotes the official reference values as fact', () => {
    const r = answer('מה ההמלצה של משרד הבריאות למגנזיום?', ctx);
    expect(r.text).toContain('350');   // UL for magnesium
    expect(r.text).toContain('נתון רשמי');
  });

  it('answers unknown questions without guessing', () => {
    const r = answer('ספרי לי בדיחה', ctx);
    expect(r.mood).toBe('thinking');
    expect(r.products).toBeUndefined();
  });
});

describe('gaigi offers to file an admin request when the catalog cannot answer', () => {
  it('offers a request when no product contains the ingredient', () => {
    const r = answer('אילו מוצרים מכילים סלניום?', ctx);
    expect(r.requestProduct).toContain('Selenium');
    expect(r.products).toBeUndefined();
  });

  it('offers a request for an unrecognised short product name', () => {
    const r = answer('Centrum Silver', ctx);
    expect(r.requestProduct).toBe('Centrum Silver');
  });

  it('does not offer a request when it answered successfully', () => {
    const r = answer('אילו מוצרים מכילים ויטמין D?', ctx);
    expect(r.requestProduct).toBeUndefined();
  });
});
