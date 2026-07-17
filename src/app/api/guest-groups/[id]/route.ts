import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestGroups } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().trim().min(1).max(80).optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const group = await db.query.guestGroups.findFirst({
    where: eq(guestGroups.id, params.id)
  });
  if (!group) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  if (!(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  await db
    .update(guestGroups)
    .set({ displayName: payload.data.displayName ?? group.displayName })
    .where(eq(guestGroups.id, group.id));

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

  const group = await db.query.guestGroups.findFirst({ where: eq(guestGroups.id, params.id) });
  if (!group || !(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  await db.delete(guestGroups).where(eq(guestGroups.id, group.id));
  return NextResponse.json({ ok: true });
}
