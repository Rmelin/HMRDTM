import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { changeLog, guestGroups, guestResponses, meals, people } from "@/lib/schema";
import { getGuestContext } from "@/lib/guest";

const schema = z.object({
  personId: z.string().min(1),
  status: z.enum(["yes", "no", "maybe", "default"])
});

export async function POST(
  request: Request,
  { params }: { params: { token: string; mealId: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const meal = await db.query.meals.findFirst({
    where: eq(meals.id, params.mealId)
  });
  if (!meal || meal.eventId !== context.event.id) {
    return NextResponse.json({ error: "Måltid ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const person = await db.query.people.findFirst({
    where: eq(people.id, payload.data.personId)
  });
  if (!person || person.groupId !== context.group.id) {
    return NextResponse.json({ error: "Person ikke fundet" }, { status: 404 });
  }

  const now = Date.now();
  const changedAfterDeadline = now > meal.cutoffAt;

  const existing = await db.query.guestResponses.findFirst({
    where: and(
      eq(guestResponses.personId, person.id),
      eq(guestResponses.mealId, meal.id)
    )
  });

  const nextStatus = payload.data.status === "default" ? null : payload.data.status;
  const didChange = (existing?.status ?? null) !== nextStatus;
  if (existing && nextStatus === null) {
    await db.delete(guestResponses).where(
      and(eq(guestResponses.personId, person.id), eq(guestResponses.mealId, meal.id))
    );
  } else if (existing && didChange && nextStatus) {
    await db
      .update(guestResponses)
      .set({
        status: nextStatus,
        updatedAt: now,
        changedAfterDeadline
      })
      .where(
        and(
          eq(guestResponses.personId, person.id),
          eq(guestResponses.mealId, meal.id)
        )
      );
  } else if (!existing && nextStatus) {
    await db.insert(guestResponses).values({
      personId: person.id,
      mealId: meal.id,
      status: nextStatus,
      updatedAt: now,
      changedAfterDeadline
    });
  }

  await db
    .update(guestGroups)
    .set({ lastSeenAt: now })
    .where(eq(guestGroups.id, context.group.id));

  if (changedAfterDeadline && didChange) {
    await db.insert(changeLog).values({
      id: randomUUID(),
      eventId: context.event.id,
      mealId: meal.id,
      guestGroupId: context.group.id,
      entityType: "meal_response",
      entityId: `${person.id}:${meal.id}`,
      before: existing ? JSON.stringify(existing) : "null",
      after: nextStatus ? JSON.stringify({ status: nextStatus }) : "null",
      changedAt: now,
      changedBy: `guest:${context.group.id}`,
      isAfterCutoff: true
    });
  }

  return NextResponse.json({ ok: true, changedAfterDeadline });
}
