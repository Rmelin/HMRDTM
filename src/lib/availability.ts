export function parseAvailability(
  input: { comesAt?: string; leavesAt?: string },
  event: { startsAt: number; endsAt: number }
):
  | { comesAt: number | null; leavesAt: number | null }
  | { error: string } {
  const comesAt = input.comesAt ? parseDateTimeInput(input.comesAt) : null;
  const leavesAt = input.leavesAt ? parseDateTimeInput(input.leavesAt) : null;

  if (
    (comesAt !== null && !Number.isFinite(comesAt)) ||
    (leavesAt !== null && !Number.isFinite(leavesAt))
  ) {
    return { error: "Ugyldigt tidspunkt" } as const;
  }
  if (comesAt !== null && (comesAt < event.startsAt || comesAt > event.endsAt)) {
    return { error: "Ankomst skal være inden for eventets tidsrum" } as const;
  }
  if (leavesAt !== null && (leavesAt < event.startsAt || leavesAt > event.endsAt)) {
    return { error: "Afgang skal være inden for eventets tidsrum" } as const;
  }
  if (comesAt !== null && leavesAt !== null && leavesAt <= comesAt) {
    return { error: "Afgang skal være efter ankomst" } as const;
  }

  return { comesAt, leavesAt } as const;
}

export function parseAvailabilityWindows(
  windows: Array<{ comesAt?: string; leavesAt?: string }>,
  event: { startsAt: number; endsAt: number }
): { windows: Array<{ comesAt: number; leavesAt: number }> } | { error: string } {
  if (windows.length === 0) return { windows: [] } as const;
  if (windows.length > 20) return { error: "Der kan højst gemmes 20 tidsrum" } as const;

  const complete: Array<{ comesAt: number; leavesAt: number }> = [];
  for (const window of windows) {
    const parsed = parseAvailability(window, event);
    if ("error" in parsed) return { error: parsed.error };
    if (parsed.comesAt === null || parsed.leavesAt === null) {
      return { error: "Både ankomst og afgang skal udfyldes for hvert tidsrum" } as const;
    }
    complete.push({ comesAt: parsed.comesAt, leavesAt: parsed.leavesAt });
  }

  const sorted = complete.sort(
    (a, b) => a.comesAt - b.comesAt
  );
  for (let index = 1; index < sorted.length; index += 1) {
    if (sorted[index].comesAt < sorted[index - 1].leavesAt) {
      return { error: "Tidsrummene må ikke overlappe hinanden" } as const;
    }
  }

  return { windows: sorted } as const;
}
import { parseDateTimeInput } from "@/lib/datetime";
