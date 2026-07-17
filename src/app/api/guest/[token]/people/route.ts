import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/lib/db";
import { getGuestContext } from "@/lib/guest";
import { people } from "@/lib/schema";

const createSchema = z.object({
  name: z.string().trim().min(1).max(80),
  type: z.enum(["partner", "child"])
});

const deleteSchema = z.object({ id: z.string().min(1) });

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const payload = createSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Skriv et navn" }, { status: 400 });
  }

  if (payload.data.type === "partner" && !context.event.allowPartner) {
    return NextResponse.json({ error: "Eventet giver ikke mulighed for at tilføje en partner" }, { status: 403 });
  }
  if (payload.data.type === "child" && !context.event.allowChildren) {
    return NextResponse.json({ error: "Eventet giver ikke mulighed for at tilføje børn" }, { status: 403 });
  }

  const currentPeople = await db.select().from(people).where(eq(people.groupId, context.group.id));
  if (currentPeople.length >= 20) {
    return NextResponse.json({ error: "Der kan højst være 20 personer på invitationen" }, { status: 400 });
  }
  if (payload.data.type === "partner" && currentPeople.some((person) => person.type === "partner")) {
    return NextResponse.json({ error: "Der er allerede tilføjet en partner" }, { status: 409 });
  }

  const person = {
    id: randomUUID(),
    groupId: context.group.id,
    name: payload.data.name,
    type: payload.data.type,
    dietType: "none",
    dietNotes: null
  };
  await db.insert(people).values(person);

  return NextResponse.json({ ok: true, person });
}

export async function DELETE(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const payload = deleteSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig person" }, { status: 400 });
  }

  const person = await db.query.people.findFirst({
    where: and(eq(people.id, payload.data.id), eq(people.groupId, context.group.id))
  });
  if (!person) {
    return NextResponse.json({ error: "Personen blev ikke fundet" }, { status: 404 });
  }
  if (person.type !== "partner" && person.type !== "child") {
    return NextResponse.json({ error: "Den inviterede person kan ikke fjernes" }, { status: 403 });
  }

  await db.delete(people).where(and(eq(people.id, person.id), eq(people.groupId, context.group.id)));
  return NextResponse.json({ ok: true });
}
