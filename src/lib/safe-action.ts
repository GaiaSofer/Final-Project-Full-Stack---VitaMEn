// Wraps a Server Action body so a transient failure (a dropped connection to
// Supabase, a DNS hiccup, a timeout) returns a normal { error } result instead
// of throwing — which is what was causing the intermittent 503 / "Internal
// Server Error" on things like "mark as taken": the first click hit a
// transient network error with no catch anywhere in the call chain, so Next
// turned it into a crashed response; the retry worked because the network
// blip had passed by then.
//
// Next.js implements redirect() / notFound() by throwing a special internal
// error (its `digest` starts with 'NEXT_REDIRECT' / 'NEXT_NOT_FOUND'). Those
// must be re-thrown untouched or navigation breaks — only genuine failures
// are converted into a fallback value.
function isFrameworkSignal(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    typeof (err as { digest?: unknown }).digest === 'string' &&
    /^NEXT_(REDIRECT|NOT_FOUND)/.test((err as { digest: string }).digest)
  );
}

export const SERVER_ERROR_MESSAGE = 'אירעה תקלה זמנית בשרת. נסי שוב בעוד רגע.';

export async function withFallback<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (isFrameworkSignal(err)) throw err;
    // eslint-disable-next-line no-console
    console.error('[server action failed]', err);
    return fallback;
  }
}
