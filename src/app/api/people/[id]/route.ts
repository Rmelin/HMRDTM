import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestGroups, people } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(["adult", "partner", "child"]).optional(),
  dietType: z.enum(["none", "vegetarian", "vegan", "allergy", "other"]).nullable().optional(),
  dietNotes: z.string().trim().max(500).nullable().optional()
});

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const person = await db.query.people.findFirst({
    where: eq(people.id, params.id)
  });
  if (!person) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  const group = await db.query.guestGroups.findFirst({ where: eq(guestGroups.id, person.groupId) });
  if (!group || !(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  await db
    .update(people)
    .set({
      name: payload.data.name ?? person.name,
      type: payload.data.type ?? person.type,
      dietType: payload.data.dietType ?? person.dietType,
      dietNotes: payload.data.dietNotes ?? person.dietNotes
    })
    .where(eq(people.id, person.id));

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

  const person = await db.query.people.findFirst({ where: eq(people.id, params.id) });
  const group = person
    ? await db.query.guestGroups.findFirst({ where: eq(guestGroups.id, person.groupId) })
    : null;
  if (!person || !group || !(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Ikke fundet" }, { status: 404 });
  }
  await db.delete(people).where(eq(people.id, person.id));
  return NextResponse.json({ ok: true });
}
