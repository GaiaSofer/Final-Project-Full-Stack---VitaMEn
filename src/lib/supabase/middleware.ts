// Keeps the auth session fresh on every request and guards private routes.
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Not wrapped like Server Actions are (see src/lib/safe-action.ts) — this
  // runs on EVERY request, before any action or page even starts, so an
  // unhandled throw here is the one path in the app safe-action.ts cannot
  // catch. A transient network error talking to Supabase Auth (the exact
  // failure class safe-action.ts's own comment documents as real against
  // this project) would previously crash the whole request instead of
  // degrading. Found live: two 503s on a POST to /catalog, third try
  // succeeded — the signature of a network blip with nothing catching it.
  // On failure here, treat it the same as "not logged in": worst case is a
  // spurious redirect to /login for someone genuinely signed in (already a
  // path this app has and shows correctly), never a raw crash.
  let user = null;
  try {
    ({ data: { user } } = await supabase.auth.getUser());
  } catch (err) {
    console.error('[middleware] getUser failed:', err);
  }

  const path = request.nextUrl.pathname;
  const isPublic = path === '/' || path.startsWith('/login') || path.startsWith('/signup');

  // Not logged in and trying to reach a private page -> send to login.
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  return response;
}
