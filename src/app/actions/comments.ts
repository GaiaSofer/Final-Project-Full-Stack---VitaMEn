'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

export async function addComment(supplementId: string, body: string) {
  if (!isNonEmpty(body)) return { error: 'Write something first.' };
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };
    const { error } = await supabase.from('comments')
      .insert({ supplement_id: supplementId, author_id: user.id, body });
    if (error) return { error: error.message };
    revalidatePath(`/product/${supplementId}`);
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

// RLS allows deleting only your own comment.
export async function deleteComment(id: string, supplementId: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath(`/product/${supplementId}`);
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}
