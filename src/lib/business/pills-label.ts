// Hebrew singular/plural for pill counts. "כדורים" (plural) is wrong for 1 —
// Hebrew needs "כדור אחד" for exactly one, "2 כדורים" etc. otherwise.
// Kept as one small helper so every screen that shows a pill count agrees.
export function pillsLabel(count: number): string {
  if (count === 1) return 'כדור אחד';
  return `${count} כדורים`;
}
