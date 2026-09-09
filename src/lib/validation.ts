// Minimal input validation used by server actions BEFORE touching the DB.
// Server-side validation is the one that matters for security; client-side
// is only for UX.
export function isNonEmpty(value: unknown, max = 200): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.length <= max;
}

export function isEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);
}
