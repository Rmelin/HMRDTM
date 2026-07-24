import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, programItems } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";
import { parseDateTimeInput } from "@/lib/datetime";
import { validateEventItemWindow } from "@/lib/meal-window";

const schema = z.object({
  name: z.string().min(1).optional(),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  description: z.string().nullable().optional(),
  isVisible: z.boolean().optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const item = await db.query.programItems.findFirst({
    where: eq(programItems.id, params.id)
  });
  if (!item) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  if (!(await canAccessEvent(user, item.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, item.eventId)
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
  if (payload.data.description !== undefined)
    update.description = payload.data.description;
  if (payload.data.isVisible !== undefined)
    update.isVisible = payload.data.isVisible;
  if (payload.data.startsAt)
    update.startsAt = parseDateTimeInput(payload.data.startsAt);
  if (payload.data.endsAt)
    update.endsAt = parseDateTimeInput(payload.data.endsAt);

  const nextStartsAt = (update.startsAt as number | undefined) ?? item.startsAt;
  const nextEndsAt = (update.endsAt as number | undefined) ?? item.endsAt;
  if (!Number.isFinite(nextStartsAt) || !Number.isFinite(nextEndsAt)) {
    return NextResponse.json({ error: "Ugyldigt tidspunkt" }, { status: 400 });
  }
  const windowError = validateEventItemWindow(
    { startsAt: nextStartsAt, endsAt: nextEndsAt },
    event,
    "Programpunktet"
  );
  if (windowError) return NextResponse.json({ error: windowError }, { status: 400 });

  await db.update(programItems).set(update).where(eq(programItems.id, item.id));
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

  const item = await db.query.programItems.findFirst({ where: eq(programItems.id, params.id) });
  if (!item || !(await canAccessEvent(user, item.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  await db.delete(programItems).where(eq(programItems.id, item.id));
  return NextResponse.json({ ok: true });
}
