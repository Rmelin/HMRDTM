import { NextResponse } from "next/server";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  eventOwners,
  events,
  guestAvailability,
  guestGroups
} from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { parseDateTimeInput } from "@/lib/datetime";

const schema = z.object({
  title: z.string().min(1).optional(),
  location: z.string().nullable().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  description: z.string().nullable().optional(),
  signupDeadlineAt: z.string().optional(),
  allowPartner: z.boolean().optional(),
  allowChildren: z.boolean().optional(),
  allowGuestList: z.boolean().optional(),
  archived: z.boolean().optional(),
  countedOwnerIds: z.array(z.string().uuid()).optional()
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
    update.startsAt = parseDateTimeInput(payload.data.startsAt);
  if (payload.data.endsAt)
    update.endsAt = parseDateTimeInput(payload.data.endsAt);
  if (payload.data.signupDeadlineAt)
    update.signupDeadlineAt = parseDateTimeInput(payload.data.signupDeadlineAt);
  if (payload.data.allowPartner !== undefined)
    update.allowPartner = payload.data.allowPartner;
  if (payload.data.allowChildren !== undefined)
    update.allowChildren = payload.data.allowChildren;
  if (payload.data.allowGuestList !== undefined)
    update.allowGuestList = payload.data.allowGuestList;
  if (payload.data.archived !== undefined)
    update.archivedAt = payload.data.archived ? Date.now() : null;

  if (
    Object.keys(update).length === 0 &&
    payload.data.countedOwnerIds === undefined
  ) {
    return NextResponse.json({ error: "Ingen ændringer" }, { status: 400 });
  }

  const nextStartsAt = (update.startsAt as number | undefined) ?? existingEvent.startsAt;
  const nextEndsAt = (update.endsAt as number | undefined) ?? existingEvent.endsAt;
  const nextSignupDeadlineAt =
    (update.signupDeadlineAt as number | undefined) ??
    existingEvent.signupDeadlineAt;
  if (
    !Number.isFinite(nextStartsAt) ||
    !Number.isFinite(nextEndsAt) ||
    !Number.isFinite(nextSignupDeadlineAt)
  ) {
    return NextResponse.json({ error: "Ugyldigt tidspunkt" }, { status: 400 });
  }
  if (nextEndsAt <= nextStartsAt) {
    return NextResponse.json({ error: "Slut skal være efter start" }, { status: 400 });
  }

  db.transaction((tx) => {
    if (Object.keys(update).length > 0) {
      tx.update(events).set(update).where(eq(events.id, params.id)).run();
    }
    if (payload.data.countedOwnerIds !== undefined) {
      tx.update(eventOwners)
        .set({ countsAsGuest: false })
        .where(eq(eventOwners.eventId, params.id))
        .run();
      for (const userId of payload.data.countedOwnerIds) {
        tx.update(eventOwners)
          .set({ countsAsGuest: true })
          .where(and(
            eq(eventOwners.eventId, params.id),
            eq(eventOwners.userId, userId)
          ))
          .run();
      }
    }
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

  const archivedAt = Date.now();
  await db
    .update(events)
    .set({ archivedAt })
    .where(eq(events.id, params.id));
  return NextResponse.json({ ok: true, archivedAt });
}
