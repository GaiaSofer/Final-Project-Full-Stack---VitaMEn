// ============================================================
// Gaigi — deterministic assistant.
//
// No LLM, no API key, no cost, no hallucination risk. Gaigi recognises a small
// set of intents and answers them by calling functions that already exist and
// are already unit-tested:
//   compareByIngredient / findCheaperAlternatives  (src/lib/business/compare)
//   DOSAGE_REFERENCE                               (src/lib/business/dosage-reference)
//
// This is a deliberate product decision, not a fallback: in an app that talks
// about dosages, free-form generation is a liability. Everything Gaigi says is
// either a catalog row or an official reference number.
// ============================================================
import { compareByIngredient, findCheaperAlternatives } from '@/lib/business/compare';
import { DOSAGE_REFERENCE } from '@/lib/business/dosage-reference';
import type { Supplement, SupplementIngredient } from '@/types/database.types';

export type Mood = 'neutral' | 'happy' | 'sad' | 'wink' | 'thinking';

export interface GaigiReply {
  text: string;
  mood: Mood;
  /** Products to render as cards under the reply. */
  products?: { id: string; name: string; brand: string; priceCents: number; note?: string }[];
  /** Suggested follow-up chips. */
  suggestions?: string[];
  /** When the catalog has no answer, Gaigi offers to file a request with the
   *  admin. The widget renders this as a button and calls requestProduct(). */
  requestProduct?: string;
}

export interface CatalogContext {
  supplements: Supplement[];
  ingredientsBySupplement: Record<string, SupplementIngredient[]>;
}

export type Intent =
  | { kind: 'ingredient'; ingredient: string }
  | { kind: 'alternatives'; productName: string }
  | { kind: 'guideline'; ingredient: string }
  | { kind: 'list_ingredients' }
  | { kind: 'help' }
  | { kind: 'unknown' };

// Hebrew/English aliases -> the canonical ingredient key used across the app.
const INGREDIENT_ALIASES: Record<string, string> = {
  'ויטמין d': 'Vitamin D', 'ויטמין די': 'Vitamin D', 'vitamin d': 'Vitamin D', 'vitd': 'Vitamin D',
  'ויטמין c': 'Vitamin C', 'vitamin c': 'Vitamin C',
  'ויטמין a': 'Vitamin A', 'vitamin a': 'Vitamin A',
  'ויטמין e': 'Vitamin E', 'vitamin e': 'Vitamin E',
  'ויטמין k': 'Vitamin K', 'vitamin k': 'Vitamin K',
  'ויטמין b6': 'Vitamin B6', 'vitamin b6': 'Vitamin B6',
  'ויטמין b12': 'Vitamin B12', 'vitamin b12': 'Vitamin B12', 'בי 12': 'Vitamin B12',
  'חומצה פולית': 'Folate', 'פולאט': 'Folate', 'folate': 'Folate', 'folic acid': 'Folate',
  'ניאצין': 'Niacin', 'niacin': 'Niacin',
  'סידן': 'Calcium', 'calcium': 'Calcium',
  'ברזל': 'Iron', 'iron': 'Iron',
  'מגנזיום': 'Magnesium', 'מגנזיה': 'Magnesium', 'magnesium': 'Magnesium',
  'אבץ': 'Zinc', 'zinc': 'Zinc',
  'סלניום': 'Selenium', 'selenium': 'Selenium',
  'יוד': 'Iodine', 'iodine': 'Iodine',
  'נחושת': 'Copper', 'copper': 'Copper',
  'קפאין': 'Caffeine', 'caffeine': 'Caffeine',
  'אומגה': 'Omega-3', 'אומגה 3': 'Omega-3', 'omega': 'Omega-3', 'omega-3': 'Omega-3',
};

const ALT_WORDS  = ['חלופ', 'תחליף', 'זול', 'במקום', 'alternative', 'cheaper'];
const GUIDE_WORDS = ['מומלץ', 'המלצה', 'משרד הבריאות', 'כמה מותר', 'סף', 'תקרה', 'מינון', 'guideline', 'recommended'];
const HELP_WORDS  = ['עזרה', 'מה את יודעת', 'מה אפשר', 'help', 'שלום', 'היי'];
const LIST_WORDS  = ['אילו רכיבים', 'רשימת רכיבים', 'מה יש', 'אילו ויטמינים'];

function normalise(s: string) {
  return s.toLowerCase().replace(/[״"'’,.!?]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Longest alias first, so "ויטמין b12" wins over "ויטמין b". */
function findIngredient(text: string): string | null {
  const t = normalise(text);
  const keys = Object.keys(INGREDIENT_ALIASES).sort((a, b) => b.length - a.length);
  for (const k of keys) if (t.includes(k)) return INGREDIENT_ALIASES[k];
  for (const canonical of Object.keys(DOSAGE_REFERENCE)) {
    if (t.includes(canonical.toLowerCase())) return canonical;
  }
  return null;
}

function findProductName(text: string, supplements: Supplement[]): string | null {
  const t = normalise(text);
  const hit = [...supplements]
    .sort((a, b) => b.name.length - a.name.length)
    .find((s) => t.includes(s.name.toLowerCase()));
  return hit?.name ?? null;
}

export function detectIntent(text: string, ctx: CatalogContext): Intent {
  const t = normalise(text);
  if (LIST_WORDS.some((w) => t.includes(w))) return { kind: 'list_ingredients' };

  if (ALT_WORDS.some((w) => t.includes(w))) {
    const product = findProductName(text, ctx.supplements);
    if (product) return { kind: 'alternatives', productName: product };
  }
  if (GUIDE_WORDS.some((w) => t.includes(w))) {
    const ing = findIngredient(text);
    if (ing) return { kind: 'guideline', ingredient: ing };
  }
  const ing = findIngredient(text);
  if (ing) return { kind: 'ingredient', ingredient: ing };

  if (HELP_WORDS.some((w) => t.includes(w))) return { kind: 'help' };
  return { kind: 'unknown' };
}

const ils = (cents: number) => `₪${(cents / 100).toFixed(0)}`;

export function answer(text: string, ctx: CatalogContext): GaigiReply {
  const intent = detectIntent(text, ctx);

  switch (intent.kind) {
    case 'ingredient': {
      const rows = compareByIngredient(intent.ingredient, ctx.supplements, ctx.ingredientsBySupplement);
      if (rows.length === 0) {
        return {
          mood: 'sad',
          text: `לא מצאתי בקטלוג מוצר שמכיל ${intent.ingredient}. רוצה שאשלח בקשה למנהל להוסיף מוצר כזה?`,
          requestProduct: `תוסף המכיל ${intent.ingredient}`,
          suggestions: ['אילו רכיבים יש בקטלוג?'],
        };
      }
      const ref = DOSAGE_REFERENCE[intent.ingredient];
      const note = ref?.ul != null
        ? ` הסף היומי המרבי ל${intent.ingredient} הוא ${ref.ul}${ref.unit}.`
        : '';
      return {
        mood: 'happy',
        text: `מצאתי ${rows.length} מוצרים עם ${intent.ingredient}, מהזול ליקר.${note}`,
        products: rows.map((r) => ({
          id: r.supplement.id, name: r.supplement.name, brand: r.supplement.brand,
          priceCents: r.supplement.price_cents, note: `${r.amount}${r.unit}`,
        })),
        suggestions: [`מה ההמלצה של משרד הבריאות ל${intent.ingredient}?`],
      };
    }

    case 'alternatives': {
      const target = ctx.supplements.find((s) => s.name === intent.productName);
      if (!target) {
        return {
          mood: 'sad',
          text: 'לא מצאתי את המוצר הזה בקטלוג. רוצה שאשלח בקשה למנהל להוסיף אותו?',
          requestProduct: intent.productName,
        };
      }
      const rows = findCheaperAlternatives(target, ctx.supplements, ctx.ingredientsBySupplement);
      if (rows.length === 0) {
        return {
          mood: 'neutral',
          text: `לא נמצאה חלופה זולה יותר ל${target.name} עם אותו רכיב עיקרי. ייתכן שזו כבר האפשרות המשתלמת בקטלוג.`,
        };
      }
      return {
        mood: 'wink',
        text: `יש ${rows.length} חלופות זולות יותר ל${target.name} (${ils(target.price_cents)}):`,
        products: rows.map((r) => ({
          id: r.supplement.id, name: r.supplement.name, brand: r.supplement.brand,
          priceCents: r.supplement.price_cents,
          note: `חיסכון ${ils(target.price_cents - r.supplement.price_cents)}`,
        })),
      };
    }

    case 'guideline': {
      const ref = DOSAGE_REFERENCE[intent.ingredient];
      if (!ref) {
        return { mood: 'sad', text: `אין לי ערך ייחוס רשמי ל${intent.ingredient} בטבלה.` };
      }
      const parts: string[] = [];
      if (ref.rda != null) parts.push(`הקצובה היומית המומלצת (RDA) היא ${ref.rda}${ref.unit}`);
      if (ref.ul != null) parts.push(`הסף העליון המרבי (UL) הוא ${ref.ul}${ref.unit}`);
      else parts.push('לא נקבע עבורו סף עליון');
      return {
        mood: 'neutral',
        text: `לפי ערכי הייחוס של משרד הבריאות / NIH עבור מבוגרים — ${intent.ingredient}: ${parts.join(', ')}. זהו נתון רשמי מצוטט, לא המלצה אישית.`,
        suggestions: [`אילו מוצרים מכילים ${intent.ingredient}?`],
      };
    }

    case 'list_ingredients': {
      const set = new Set<string>();
      for (const list of Object.values(ctx.ingredientsBySupplement)) {
        for (const i of list) set.add(i.ingredient_name);
      }
      const names = Array.from(set).sort();
      if (names.length === 0) return { mood: 'sad', text: 'הקטלוג עדיין ריק.' };
      return {
        mood: 'neutral',
        text: `הרכיבים שקיימים כרגע בקטלוג: ${names.join(', ')}.`,
        suggestions: names.slice(0, 3).map((n) => `אילו מוצרים מכילים ${n}?`),
      };
    }

    case 'help':
      return {
        mood: 'happy',
        text: 'אני יכולה לחפש מוצרים לפי רכיב, למצוא חלופות זולות יותר, ולהציג את ערכי הייחוס הרשמיים. אני עונה רק לפי הקטלוג — וזו המלצה, לא ייעוץ רפואי.',
        suggestions: ['אילו מוצרים מכילים ויטמין D?', 'אילו רכיבים יש בקטלוג?'],
      };

    default: {
      // The text mentions no ingredient and no catalog product. It is most
      // likely a product we simply do not stock, so offer to file a request.
      const looksLikeProduct = text.trim().length >= 3 && text.trim().split(/\s+/).length <= 6;
      return {
        mood: 'thinking',
        text: looksLikeProduct
          ? `לא מצאתי "${text.trim()}" בקטלוג. רוצה שאשלח בקשה למנהל להוסיף אותו?`
          : 'לא הבנתי את השאלה. אפשר לשאול אותי על רכיב מסוים, על חלופה זולה למוצר, או על ערכי הייחוס הרשמיים.',
        requestProduct: looksLikeProduct ? text.trim() : undefined,
        suggestions: ['אילו מוצרים מכילים ויטמין D?', 'אילו רכיבים יש בקטלוג?'],
      };
    }
  }
}
