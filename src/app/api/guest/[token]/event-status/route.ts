import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logEventStatusCutoffChanges } from "@/lib/cutoff";
import { db } from "@/lib/db";
import { getGuestContext } from "@/lib/guest";
import { guestGroups } from "@/lib/schema";

const schema = z.object({
  eventStatus: z.enum(["yes", "no", "maybe"])
});

export async function PUT(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Vælg Ja, Måske eller Deltager ikke" }, { status: 400 });
  }

  await db
    .update(guestGroups)
    .set({ eventStatus: payload.data.eventStatus, lastSeenAt: Date.now() })
    .where(eq(guestGroups.id, context.group.id));

  const affectedMeals = await logEventStatusCutoffChanges({
    eventId: context.event.id,
    groupId: context.group.id,
    before: context.group.eventStatus,
    after: payload.data.eventStatus,
    changedBy: `guest:${context.group.id}`
  });

  return NextResponse.json({ ok: true, affectedMeals });
}
