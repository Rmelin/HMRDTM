import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, meals } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { defaultMealEnd } from "@/lib/defaults";
import { validateMealWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  description: z.string().optional()
});

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const event = await getEventForUser(user, params.id);
  if (!event) {
    return NextResponse.json({ error: "Event ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const startsAt = new Date(payload.data.startsAt);
  const endsAt = payload.data.endsAt
    ? new Date(payload.data.endsAt)
    : defaultMealEnd(startsAt);
  const cutoffAt = payload.data.cutoffAt
    ? new Date(payload.data.cutoffAt)
    : new Date(event.signupDeadlineAt);
  const date = formatDate(startsAt);

  const windowError = validateMealWindow(
    { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() },
    event
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });

  const id = randomUUID();
  await db.insert(meals).values({
    id,
    eventId: params.id,
    name: payload.data.name,
    date,
    startsAt: startsAt.getTime(),
    endsAt: endsAt.getTime(),
    cutoffAt: cutoffAt.getTime(),
    description: payload.data.description ?? null
  });

  return NextResponse.json({ ok: true, id });
}
