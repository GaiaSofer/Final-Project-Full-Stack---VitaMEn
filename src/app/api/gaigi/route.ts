// Gaigi endpoint. Deterministic: loads the catalog, runs the rule engine,
// returns a structured reply. No LLM, no API key, no external call.
import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { answer, type CatalogContext } from '@/lib/gaigi/engine';
import type { Supplement, SupplementIngredient } from '@/types/database.types';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { message } = await req.json();
  if (typeof message !== 'string' || !message.trim()) {
    return NextResponse.json({ error: 'Empty message.' }, { status: 400 });
  }

  const { data: supplements } = await supabase
    .from('supplements')
    .select('id, name, brand, price_cents, price_max_cents, currency, purpose, info, origin, source_url, category, created_at');
  const { data: ings } = await supabase.from('supplement_ingredients').select('*');

  const ingredientsBySupplement: Record<string, SupplementIngredient[]> = {};
  for (const i of (ings ?? []) as SupplementIngredient[]) {
    (ingredientsBySupplement[i.supplement_id] ??= []).push(i);
  }

  const ctx: CatalogContext = {
    supplements: (supplements ?? []) as Supplement[],
    ingredientsBySupplement,
  };

  return NextResponse.json(answer(message, ctx));
}
