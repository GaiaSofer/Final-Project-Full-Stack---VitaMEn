'use server';
import { createClient } from '@/lib/supabase/server';
import { isEmail, isNonEmpty } from '@/lib/validation';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { headers } from 'next/headers';
import { withFallback, SERVER_ERROR_MESSAGE } from '@/lib/safe-action';
import { homeForRole } from '@/lib/business/role-routing';

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
    revalidatePath('/', 'layout');
    redirect('/login');
  }, undefined as void);
}

// Sends a password-recovery email via Supabase. redirectTo must be in
// Supabase's Auth > URL Configuration > Redirect URLs allow list (already
// added there: the production Vercel URL and http://localhost:3000) or
// Supabase silently falls back to the project's Site URL instead.
//
// Supabase returns success even for an email with no matching account, on
// purpose, so this form can't be used to check which emails are registered.
// Only real failures (bad request, rate limit, network) surface as errors.
export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email');
  if (!isEmail(email)) return { error: 'נא להזין אימייל תקין.' };

  return withFallback(async () => {
    const supabase = createClient();
    const host = headers().get('host');
    const protocol = host?.startsWith('localhost') ? 'http' : 'https';
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${protocol}://${host}/auth/confirm?next=/reset-password`,
    });
    if (error) return { error: error.message };
    return { success: true };
  }, { error: SERVER_ERROR_MESSAGE });
}

// Sets a new password for the user who just came in through the recovery
// link (src/app/auth/confirm/route.ts already exchanged the one-time code
// for a real session by the time this runs).
export async function updatePassword(formData: FormData) {
  const password = formData.get('password');
  if (!isNonEmpty(password) || (password as string).length < 6) {
    return { error: 'הסיסמה חייבת להכיל לפחות 6 תווים.' };
  }

  return withFallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'הקישור פג תוקף. אפשר לבקש קישור חדש לאיפוס סיסמה.' };

    const { error } = await supabase.auth.updateUser({ password: password as string });
    if (error) return { error: error.message };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    revalidatePath('/', 'layout');
    redirect(homeForRole(profile?.role ?? 'client'));
  }, { error: SERVER_ERROR_MESSAGE });
}
