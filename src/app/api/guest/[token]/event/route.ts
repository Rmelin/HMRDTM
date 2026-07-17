import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people,
  programItems
} from "@/lib/schema";
import { getGuestContext } from "@/lib/guest";

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const { event, group } = context;

  const [programList, mealsList, peopleList, availability] = await Promise.all([
    db
      .select()
      .from(programItems)
      .where(and(eq(programItems.eventId, event.id), eq(programItems.isVisible, true)))
      .orderBy(programItems.startsAt),
    db.select().from(meals).where(eq(meals.eventId, event.id)).orderBy(meals.startsAt),
    db.select().from(people).where(eq(people.groupId, group.id)),
    db.select().from(guestAvailability).where(eq(guestAvailability.groupId, group.id))
  ]);

  const personIds = peopleList.map((person) => person.id);
  const responses = personIds.length
    ? await db
        .select()
        .from(guestResponses)
        .where(inArray(guestResponses.personId, personIds))
    : [];

  return NextResponse.json({
    event,
    group,
    program: programList,
    meals: mealsList,
    people: peopleList,
    availability,
    responses
  });
}
