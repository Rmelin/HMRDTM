export function hasOverlap(
  rangeStart: number,
  rangeEnd: number,
  comesAt: number | null,
  leavesAt: number | null
) {
  if (comesAt === null && leavesAt === null) return false;
  const from = comesAt ?? Number.NEGATIVE_INFINITY;
  const to = leavesAt ?? Number.POSITIVE_INFINITY;
  return from < rangeEnd && to > rangeStart;
}
