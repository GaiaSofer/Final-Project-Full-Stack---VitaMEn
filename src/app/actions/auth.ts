'use server';
import { createClient } from '@/lib/supabase/server';
import { isEmail, isNonEmpty } from '@/lib/validation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';
import { homeForRole } from '@/lib/business/role-routing';
import { isSupabaseAuthCookie } from '@/lib/business/auth-cookies';

export async function signUp(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  const fullName = formData.get('full_name');
  const role = formData.get('role'); // 'client' | 'admin'

  if (!isEmail(email) || !isNonEmpty(password) || !isNonEmpty(fullName)) {
    return { error: 'Please fill in a valid email, password and name.' };
  }
  if (role !== 'client' && role !== 'admin') return { error: 'Please choose a role.' };

  return withFallback(async () => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({
      email, password,
      options: { data: { role, full_name: fullName } },
    });
    if (error || !data.user) return { error: error?.message ?? 'Sign up failed.' };

    // NOTE: the profile row is created by the on_auth_user_created trigger
    // (see 0003_auth_trigger.sql). Inserting it here too caused
    // "duplicate key violates profiles_pkey", and before the trigger existed the
    // client-side insert raced the session and failed with "permission denied".
    revalidatePath('/', 'layout');
    redirect(homeForRole(role));
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function signIn(formData: FormData) {
  const email = formData.get('email');
  const password = formData.get('password');
  if (!isEmail(email) || !isNonEmpty(password)) return { error: 'Invalid credentials.' };

  return withFallback(async () => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user!.id).single();
    revalidatePath('/', 'layout');
    redirect(homeForRole(profile?.role ?? 'client'));
  }, { error: SERVER_ERROR_MESSAGE });
}

export async function signOut() {
  return withFallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();

    // Belt-and-suspenders, and the actual fix for logout not sticking:
    // middleware.ts also runs on this exact request and calls
    // supabase.auth.getUser(), which can refresh and re-write the same
    // session cookie in a race with the clear above (a known interaction
    // between Next middleware and @supabase/ssr's cookie handling — see
    // src/lib/supabase/middleware.ts). Deleting every Supabase auth cookie
    // explicitly, by name, as the LAST write in this response, makes the
    // clear win regardless of that race. `sb-` covers both the unchunked
    // cookie name and the `.0`/`.1`-suffixed chunks @supabase/ssr uses for
    // larger sessions.
    const cookieStore = cookies();
    cookieStore.getAll()
      .filter((c) => isSupabaseAuthCookie(c.name))
      .forEach((c) => cookieStore.delete(c.name));

    revalidatePath('/', 'layout');
    redirect('/login');
  }, undefined as void);
}
