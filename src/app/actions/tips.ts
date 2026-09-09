'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

export async function addTip(body: string) {
  if (!isNonEmpty(body)) return { error: 'הטיפ ריק.' };
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('tips').insert({ body: body.trim() });
    if (error) return { error: error.message };
    revalidatePath('/catalog'); revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function toggleTip(id: string, active: boolean) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('tips').update({ active }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/catalog'); revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function deleteTip(id: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('tips').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/catalog'); revalidatePath('/today');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}
