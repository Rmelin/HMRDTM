import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { logEventStatusCutoffChanges } from "@/lib/cutoff";
import { db } from "@/lib/db";
import { getGuestContext } from "@/lib/guest";
import { guestGroups, people } from "@/lib/schema";

const dietType = z.enum(["none", "vegetarian", "vegan", "allergy", "other"]);
const schema = z.object({
  displayName: z.string().trim().max(80),
  eventStatus: z.enum(["yes", "no", "maybe", "invited"]),
  people: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().trim().min(1).max(80),
        dietType,
        dietNotes: z.string().trim().max(500)
      })
    )
    .max(20)
});

export async function PUT(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const payload = schema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Kontrollér navn og kostoplysninger" }, { status: 400 });
  }

  const ids = payload.data.people.map((person) => person.id);
  const ownedPeople = ids.length
    ? await db
        .select()
        .from(people)
        .where(and(eq(people.groupId, context.group.id), inArray(people.id, ids)))
    : [];
  if (ownedPeople.length !== ids.length) {
    return NextResponse.json({ error: "En person tilhører ikke invitationen" }, { status: 403 });
  }

  const displayName = payload.data.displayName || "Ikke navngivet";
  db.transaction((tx) => {
    tx
      .update(guestGroups)
      .set({
        displayName,
        eventStatus: payload.data.eventStatus,
        lastSeenAt: Date.now()
      })
      .where(eq(guestGroups.id, context.group.id))
      .run();

    for (const person of payload.data.people) {
      tx
        .update(people)
        .set({
          name: person.name,
          dietType: person.dietType,
          dietNotes: person.dietNotes || null
        })
        .where(and(eq(people.id, person.id), eq(people.groupId, context.group.id)))
        .run();
    }
  });

  const affectedMeals = await logEventStatusCutoffChanges({
    eventId: context.event.id,
    groupId: context.group.id,
    before: context.group.eventStatus,
    after: payload.data.eventStatus,
    changedBy: `guest:${context.group.id}`
  });

  return NextResponse.json({ ok: true, affectedMeals });
}
