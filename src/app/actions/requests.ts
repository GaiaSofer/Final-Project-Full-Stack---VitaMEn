'use server';
import { createClient } from '@/lib/supabase/server';
import { isNonEmpty } from '@/lib/validation';
import { revalidatePath } from 'next/cache';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';

// Client asks the admin to add a product that isn't in the catalog.
export async function requestProduct(productName: string, note: string) {
  if (!isNonEmpty(productName)) return { error: 'Enter a product name.' };
  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated.' };

    const { error } = await supabase.from('product_requests')
      .insert({ client_id: user.id, product_name: productName, note: note || null });
    if (error) return { error: error.message };
    revalidatePath('/browse');
    // the thank-you message the client sees
    return { ok: true, message: 'תודה שתרמת לקהילה שלנו ❤️ הבקשה נשלחה למנהל.' };
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function markRequestDone(id: string) {
  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.from('product_requests').update({ status: 'done' }).eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/catalog');
    return { ok: true };
  }, { error: SERVER_ERROR_MESSAGE });
}
