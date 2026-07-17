import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestAvailability, guestGroups } from "@/lib/schema";
import { getGuestContext } from "@/lib/guest";
import { parseAvailabilityWindows } from "@/lib/availability";
import { logAvailabilityCutoffChanges } from "@/lib/cutoff";

const schema = z.object({
  fullEvent: z.boolean().optional(),
  windows: z.array(z.object({
    comesAt: z.string().optional(),
    leavesAt: z.string().optional()
  })).max(20)
});

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const parsed = payload.data.fullEvent
    ? { windows: [{ comesAt: context.event.startsAt, leavesAt: context.event.endsAt }] }
    : parseAvailabilityWindows(payload.data.windows, context.event);
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const windows = parsed.windows;

  const before = await db.select().from(guestAvailability)
    .where(eq(guestAvailability.groupId, context.group.id));

  db.transaction((tx) => {
    tx.delete(guestAvailability)
      .where(eq(guestAvailability.groupId, context.group.id)).run();
    if (windows.length > 0) {
      tx.insert(guestAvailability).values(windows.map((window) => ({
        groupId: context.group.id,
        comesAt: window.comesAt,
        leavesAt: window.leavesAt
      }))).run();
    }
  });

  await db
    .update(guestGroups)
    .set({ lastSeenAt: Date.now() })
    .where(eq(guestGroups.id, context.group.id));

  const affectedMeals = await logAvailabilityCutoffChanges({
    eventId: context.event.id,
    groupId: context.group.id,
    before,
    after: windows,
    changedBy: `guest:${context.group.id}`
  });

  return NextResponse.json({ ok: true, affectedMeals });
}
