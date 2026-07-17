import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, meals } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { validateMealWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1).optional(),
  date: z.string().optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  description: z.string().nullable().optional()
});

function formatDate(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

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
    update.startsAt = new Date(payload.data.startsAt).getTime();
  if (payload.data.endsAt)
    update.endsAt = new Date(payload.data.endsAt).getTime();
  if (payload.data.cutoffAt)
    update.cutoffAt = new Date(payload.data.cutoffAt).getTime();

  const nextStartsAt = (update.startsAt as number | undefined) ?? meal.startsAt;
  const nextEndsAt = (update.endsAt as number | undefined) ?? meal.endsAt;
  const windowError = validateMealWindow(
    { startsAt: nextStartsAt, endsAt: nextEndsAt },
    event
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });
  update.date = formatDate(nextStartsAt);

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
