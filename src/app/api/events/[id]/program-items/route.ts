import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, programItems } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { validateEventItemWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1),
  startsAt: z.string().min(1),
  endsAt: z.string().min(1),
  description: z.string().optional(),
  isVisible: z.boolean().default(true)
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

  const startsAt = new Date(payload.data.startsAt);
  const endsAt = new Date(payload.data.endsAt);
  const windowError = validateEventItemWindow(
    { startsAt: startsAt.getTime(), endsAt: endsAt.getTime() },
    event,
    "Programpunktet"
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });

  const id = randomUUID();
  await db.insert(programItems).values({
    id,
    eventId: params.id,
    name: payload.data.name,
    startsAt: startsAt.getTime(),
    endsAt: endsAt.getTime(),
    description: payload.data.description ?? null,
    isVisible: payload.data.isVisible
  });

  return NextResponse.json({ ok: true, id });
}
