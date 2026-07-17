import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people
} from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { calculateMealStats } from "@/lib/meal-stats";
import { hasOverlap } from "@/lib/overlap";

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\n") || value.includes('"')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

const dateTimeFormatter = new Intl.DateTimeFormat("da-DK", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Europe/Copenhagen"
});

function formatDateTime(value: number | null) {
  return value === null ? "Ikke angivet" : dateTimeFormatter.format(value);
}

function statusLabel(status: string | null) {
  if (status === "yes") return "Ja";
  if (status === "no") return "Nej";
  if (status === "maybe") return "Måske";
  return "Ikke angivet";
}

function eventStatusLabel(status: string) {
  if (status === "yes") return "Deltager";
  if (status === "no") return "Deltager ikke";
  if (status === "maybe") return "Måske";
  if (status === "invited") return "Inviterede";
  return "Ikke angivet";
}

function dietLabel(dietType: string | null) {
  if (dietType === "vegetarian") return "Vegetar";
  if (dietType === "vegan") return "Veganer";
  if (dietType === "allergy") return "Allergi";
  if (dietType === "other") return "Andet";
  return "Ingen";
}

export async function GET(
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

  const url = new URL(request.url);
  const type = url.searchParams.get("type") === "names" ? "names" : "summary";

  const mealList = await db
    .select()
    .from(meals)
    .where(eq(meals.eventId, event.id))
    .orderBy(meals.startsAt);

  const groupList = await db
    .select()
    .from(guestGroups)
    .where(eq(guestGroups.eventId, event.id));

  const groupIds = groupList.map((group) => group.id);
  const peopleList = groupIds.length
    ? await db.select().from(people).where(inArray(people.groupId, groupIds))
    : [];
  const availabilityList = groupIds.length
    ? await db
        .select()
        .from(guestAvailability)
        .where(inArray(guestAvailability.groupId, groupIds))
    : [];

  const personIds = peopleList.map((person) => person.id);
  const responses = personIds.length
    ? await db
        .select()
        .from(guestResponses)
        .where(inArray(guestResponses.personId, personIds))
    : [];

  const responseMap = new Map(
    responses.map((item) => [`${item.personId}:${item.mealId}`, item])
  );

  const availabilityByGroup = new Map<string, typeof availabilityList>();
  for (const item of availabilityList) {
    availabilityByGroup.set(item.groupId, [
      ...(availabilityByGroup.get(item.groupId) ?? []),
      item
    ]);
  }

  const peopleByGroup = new Map<string, typeof peopleList>();
  for (const person of peopleList) {
    const list = peopleByGroup.get(person.groupId) ?? [];
    list.push(person);
    peopleByGroup.set(person.groupId, list);
  }

  const rows: string[][] = [];

  if (type === "names") {
    rows.push([
      "Måltid",
      "Deltagere (forventet)",
      "Måske",
      "Total måske"
    ]);
  } else {
    rows.push([
      "Event",
      "Sted",
      "Måltid",
      "Måltid start",
      "Måltid slut",
      "Svar senest",
      "Invitation",
      "Invitation åbnet",
      "Deltager",
      "Type",
      "Eventstatus",
      "Måltidssvar",
      "Til stede i tidsrummet",
      "Forventet til måltidet",
      "Ankomst",
      "Afgang",
      "Kosttype",
      "Kostnote",
      "Svar ændret efter deadline",
      "Forventet total",
      "Forventede voksne",
      "Forventede børn"
    ]);
  }

  for (const meal of mealList) {
    const names: string[] = [];
    const maybeNames: string[] = [];
    let maybeCount = 0;
    const stats = calculateMealStats(
      meal,
      groupList,
      peopleList,
      availabilityList,
      responses
    );
    const guestStats = new Map(stats.guests.map((guest) => [guest.id, guest]));

    for (const group of groupList) {
      const availability = availabilityByGroup.get(group.id) ?? [];
      const overlaps = availability.some((window) =>
        hasOverlap(
            meal.startsAt,
            meal.endsAt,
            window.comesAt ?? null,
            window.leavesAt ?? null
          )
      );

      const groupPeople = peopleByGroup.get(group.id) ?? [];
      for (const person of groupPeople) {
        const key = `${person.id}:${meal.id}`;
        const response = responseMap.get(key);
        const guest = guestStats.get(person.id);

        if (guest?.status === "maybe") {
          maybeCount += 1;
          maybeNames.push(person.name);
        }

        if (guest?.expected) names.push(person.name);

        if (type === "summary") {
          rows.push([
            event.title,
            event.location ?? "",
            meal.name,
            formatDateTime(meal.startsAt),
            formatDateTime(meal.endsAt),
            formatDateTime(meal.cutoffAt),
            group.displayName,
            group.lastSeenAt === null ? "Nej" : "Ja",
            person.name,
            person.type === "partner" ? "Partner" : person.type === "child" ? "Barn" : "Voksen",
            eventStatusLabel(group.eventStatus),
            response?.status ? statusLabel(response.status) : `Følger event: ${eventStatusLabel(group.eventStatus)}`,
            overlaps ? "Ja" : "Nej",
            guest?.expected ? "Ja" : "Nej",
            availability.map((window) => formatDateTime(window.comesAt)).join(" | ") || "Ikke angivet",
            availability.map((window) => formatDateTime(window.leavesAt)).join(" | ") || "Ikke angivet",
            dietLabel(person.dietType),
            person.dietNotes ?? "",
            response?.changedAfterDeadline ? "Ja" : "Nej",
            String(stats.expected),
            String(stats.expectedAdults),
            String(stats.expectedChildren)
          ]);
        }
      }
    }

    if (type === "names") {
      rows.push([
        meal.name,
        names.join(", "),
        maybeNames.join(", "),
        String(maybeCount)
      ]);
    }
  }

  const csv = `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename=export-${type}.csv`
    }
  });
}
