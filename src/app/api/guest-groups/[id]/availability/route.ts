import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestAvailability, guestGroups } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { parseAvailabilityWindows } from "@/lib/availability";
import { logAvailabilityCutoffChanges } from "@/lib/cutoff";

const schema = z.object({
  windows: z.array(z.object({
    comesAt: z.string().optional(),
    leavesAt: z.string().optional()
  })).max(20)
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const group = await db.query.guestGroups.findFirst({
    where: eq(guestGroups.id, params.id)
  });
  if (!group) {
    return NextResponse.json({ error: "Gæstegruppe ikke fundet" }, { status: 404 });
  }
  if (!(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Gæstegruppe ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, group.eventId)
  });
  if (!event) {
    return NextResponse.json({ error: "Event ikke fundet" }, { status: 404 });
  }
  const parsed = parseAvailabilityWindows(payload.data.windows, event);
  if ("error" in parsed) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }
  const windows = parsed.windows;

  const before = await db.select().from(guestAvailability)
    .where(eq(guestAvailability.groupId, group.id));

  db.transaction((tx) => {
    tx.delete(guestAvailability).where(eq(guestAvailability.groupId, group.id)).run();
    if (windows.length > 0) {
      tx.insert(guestAvailability).values(windows.map((window) => ({
        groupId: group.id,
        comesAt: window.comesAt,
        leavesAt: window.leavesAt
      }))).run();
    }
  });

  const affectedMeals = await logAvailabilityCutoffChanges({
    eventId: group.eventId,
    groupId: group.id,
    before,
    after: windows,
    changedBy: `user:${user.id}`
  });

  return NextResponse.json({ ok: true, affectedMeals });
}
