'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

// Client adds a supplement from the catalog to their personal stack.
export async function addToStack(
  supplementId: string, dosage: string, schedule: string,
  pillsPerTime: number, timesPerWeek: number,
) {
  if (!isNonEmpty(supplementId) || !isNonEmpty(dosage) || !isNonEmpty(schedule)) {
    return { error: 'Missing details.' };
  }
  if (pillsPerTime <= 0 || timesPerWeek < 1 || timesPerWeek > 7) {
    return { error: 'Frequency must be 1-7 times/week and at least 1 pill.' };
  }
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase
      .from('intake_items')
      .insert({ client_id: user.id, supplement_id: supplementId, dosage, schedule, pills_per_time: pillsPerTime, times_per_week: timesPerWeek });
    if (error) return { error: error.message };

    revalidatePath('/stack');
    revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function removeFromStack(itemId: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('intake_items').delete().eq('id', itemId);
    if (error) return { error: error.message };
    revalidatePath('/stack');
    revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

// Client marks a supplement as taken today.
export async function logIntake(supplementId: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase
      .from('intake_logs').insert({ client_id: user.id, supplement_id: supplementId });
    if (error) return { error: error.message };
    revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}
