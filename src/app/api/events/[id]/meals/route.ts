import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, meals } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { defaultMealEnd } from "@/lib/defaults";
import {
  formatLocalDate,
  parseDateTimeInput
} from "@/lib/datetime";
import { validateMealWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1),
  date: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  cutoffAt: z.string().optional(),
  description: z.string().optional()
});

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

  const startsAt = parseDateTimeInput(payload.data.startsAt);
  const endsAt = payload.data.endsAt
    ? parseDateTimeInput(payload.data.endsAt)
    : defaultMealEnd(startsAt);
  const cutoffAt = payload.data.cutoffAt
    ? parseDateTimeInput(payload.data.cutoffAt)
    : event.signupDeadlineAt;
  if (
    !Number.isFinite(startsAt) ||
    !Number.isFinite(endsAt) ||
    !Number.isFinite(cutoffAt)
  ) {
    return NextResponse.json({ error: "Ugyldigt tidspunkt" }, { status: 400 });
  }
  const date = formatLocalDate(startsAt);

  const windowError = validateMealWindow(
    { startsAt, endsAt },
    event
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });

  const id = randomUUID();
  await db.insert(meals).values({
    id,
    eventId: params.id,
    name: payload.data.name,
    date,
    startsAt,
    endsAt,
    cutoffAt,
    description: payload.data.description ?? null
  });

  return NextResponse.json({ ok: true, id });
}
