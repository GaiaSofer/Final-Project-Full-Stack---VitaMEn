'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

// Update demographics. These only SELECT which DRI reference row applies —
// they are not used to compute a personal dose from body metrics.
export async function updateProfile(input: {
  sex: 'male' | 'female' | '';
  age: number | null;
  stage: 'none' | 'pregnant' | 'breastfeeding_0_6' | 'breastfeeding_7_12';
}) {
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase.from('profiles').update({
      sex: input.sex || null,
      age: input.age,
      stage: input.stage,
    }).eq('id', user.id);
    if (error) return { error: error.message };
    revalidatePath('/profile');
    revalidatePath('/stack');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

// A doctor-recommended target the client enters -> basis for the GREEN note.
export async function addRecommendation(input: {
  ingredient: string; amount: number; unit: string; note: string;
}) {
  if (!isNonEmpty(input.ingredient) || input.amount < 0 || !isNonEmpty(input.unit)) {
    return { error: 'Ingredient, amount and unit are required.' };
  }
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase.from('medical_recommendations').insert({
      client_id: user.id,
      ingredient_name: input.ingredient,
      target_amount: input.amount,
      unit: input.unit,
      note: input.note || null,
    });
    if (error) return { error: error.message };
    revalidatePath('/profile');
    revalidatePath('/stack');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function removeRecommendation(id: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('medical_recommendations').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/profile');
    revalidatePath('/stack');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}
