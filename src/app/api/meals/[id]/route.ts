import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, meals } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import {
  formatLocalDate,
  parseDateTimeInput
} from "@/lib/datetime";
import { validateMealWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  description: z.string().nullable().optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const meal = await db.query.meals.findFirst({
    where: eq(meals.id, params.id)
  });
  if (!meal) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  if (!(await canAccessEvent(user, meal.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, meal.eventId)
  });
  if (!event) {
    return NextResponse.json({ error: "Event ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (payload.data.name !== undefined) update.name = payload.data.name;
  if (payload.data.date !== undefined) update.date = payload.data.date;
  if (payload.data.description !== undefined)
    update.description = payload.data.description;
  if (payload.data.startsAt)
    update.startsAt = parseDateTimeInput(payload.data.startsAt);
  if (payload.data.endsAt)
    update.endsAt = parseDateTimeInput(payload.data.endsAt);
  if (payload.data.cutoffAt)
    update.cutoffAt = parseDateTimeInput(payload.data.cutoffAt);

  const nextStartsAt = (update.startsAt as number | undefined) ?? meal.startsAt;
  const nextEndsAt = (update.endsAt as number | undefined) ?? meal.endsAt;
  const nextCutoffAt =
    (update.cutoffAt as number | undefined) ?? meal.cutoffAt;
  if (
    !Number.isFinite(nextStartsAt) ||
    !Number.isFinite(nextEndsAt) ||
    !Number.isFinite(nextCutoffAt)
  ) {
    return NextResponse.json({ error: "Ugyldigt tidspunkt" }, { status: 400 });
  }
  const windowError = validateMealWindow(
    { startsAt: nextStartsAt, endsAt: nextEndsAt },
    event
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });
  update.date = formatLocalDate(nextStartsAt);

  await db.update(meals).set(update).where(eq(meals.id, meal.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const meal = await db.query.meals.findFirst({ where: eq(meals.id, params.id) });
  if (!meal || !(await canAccessEvent(user, meal.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  await db.delete(meals).where(eq(meals.id, meal.id));
  return NextResponse.json({ ok: true });
}
