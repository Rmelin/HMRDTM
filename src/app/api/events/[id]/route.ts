import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestAvailability, guestGroups } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";

const schema = z.object({
  title: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  description: z.string().nullable().optional(),
  signupDeadlineAt: z.string().optional(),
  allowPartner: z.boolean().optional(),
  allowChildren: z.boolean().optional(),
  allowGuestList: z.boolean().optional()
});

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const event = await getEventForUser(user, params.id);
  if (!event) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  return NextResponse.json({ event });
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const existingEvent = await getEventForUser(user, params.id);
  if (!existingEvent) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (payload.data.title !== undefined) update.title = payload.data.title;
  if (payload.data.location !== undefined)
    update.location = payload.data.location;
  if (payload.data.description !== undefined)
    update.description = payload.data.description;
  if (payload.data.startsAt)
    update.startsAt = new Date(payload.data.startsAt).getTime();
  if (payload.data.endsAt)
    update.endsAt = new Date(payload.data.endsAt).getTime();
  if (payload.data.signupDeadlineAt)
    update.signupDeadlineAt = new Date(payload.data.signupDeadlineAt).getTime();
  if (payload.data.allowPartner !== undefined)
    update.allowPartner = payload.data.allowPartner;
  if (payload.data.allowChildren !== undefined)
    update.allowChildren = payload.data.allowChildren;
  if (payload.data.allowGuestList !== undefined)
    update.allowGuestList = payload.data.allowGuestList;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "Ingen ændringer" }, { status: 400 });
  }

  const nextStartsAt = (update.startsAt as number | undefined) ?? existingEvent.startsAt;
  const nextEndsAt = (update.endsAt as number | undefined) ?? existingEvent.endsAt;
  if (!nextStartsAt || !nextEndsAt || nextEndsAt <= nextStartsAt) {
    return NextResponse.json({ error: "Slut skal være efter start" }, { status: 400 });
  }

  db.transaction((tx) => {
    tx.update(events).set(update).where(eq(events.id, params.id)).run();
    if (nextStartsAt !== existingEvent.startsAt || nextEndsAt !== existingEvent.endsAt) {
      const fullEventRows = tx
        .select({ groupId: guestAvailability.groupId })
        .from(guestAvailability)
        .innerJoin(guestGroups, eq(guestAvailability.groupId, guestGroups.id))
        .where(and(
          eq(guestGroups.eventId, params.id),
          eq(guestAvailability.comesAt, existingEvent.startsAt),
          eq(guestAvailability.leavesAt, existingEvent.endsAt)
        ))
        .all();
      for (const row of fullEventRows) {
        tx.update(guestAvailability)
          .set({ comesAt: nextStartsAt, leavesAt: nextEndsAt })
          .where(and(
            eq(guestAvailability.groupId, row.groupId),
            eq(guestAvailability.comesAt, existingEvent.startsAt),
            eq(guestAvailability.leavesAt, existingEvent.endsAt)
          ))
          .run();
      }
    }
  });
  const event = await db.query.events.findFirst({
    where: eq(events.id, params.id)
  });

  return NextResponse.json({ event });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const event = await getEventForUser(user, params.id);
  if (!event) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  await db.delete(events).where(eq(events.id, params.id));
  return NextResponse.json({ ok: true });
}
