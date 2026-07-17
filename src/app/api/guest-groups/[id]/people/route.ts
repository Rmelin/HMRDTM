import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { guestGroups, people } from "@/lib/schema";
import { canAccessEvent, getCurrentUser } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  type: z.enum(["adult", "partner", "child"]).default("adult"),
  dietType: z.enum(["none", "vegetarian", "vegan", "allergy", "other"]).optional(),
  dietNotes: z.string().trim().max(500).optional()
});

export async function POST(
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
    return NextResponse.json({ error: "Gæstegruppe ikke fundet" }, { status: 404 });
  }
  if (!(await canAccessEvent(user, group.eventId))) {
    return NextResponse.json({ error: "Gæstegruppe ikke fundet" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const id = randomUUID();
  await db.insert(people).values({
    id,
    groupId: group.id,
    name: payload.data.name,
    type: payload.data.type,
    dietType: payload.data.dietType ?? null,
    dietNotes: payload.data.dietNotes ?? null
  });

  return NextResponse.json({ ok: true, id });
}
