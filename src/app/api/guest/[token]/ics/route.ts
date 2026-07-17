import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { meals, programItems } from "@/lib/schema";
import { getGuestContext } from "@/lib/guest";

function formatDateTime(value: number) {
  return new Date(value).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

function firstForwardedValue(value: string | null) {
  return value?.split(",")[0]?.trim() || null;
}

function getGuestUrl(request: Request, token: string) {
  const requestUrl = new URL(request.url);
  const protocol = firstForwardedValue(request.headers.get("x-forwarded-proto"))
    ?? requestUrl.protocol.replace(":", "");
  const host = firstForwardedValue(request.headers.get("x-forwarded-host"))
    ?? request.headers.get("host")
    ?? requestUrl.host;

  return new URL(`/guest/${encodeURIComponent(token)}`, `${protocol}://${host}`).toString();
}

function buildEvent({
  uid,
  title,
  startsAt,
  endsAt,
  location,
  description,
  url
}: {
  uid: string;
  title: string;
  startsAt: number;
  endsAt: number;
  location?: string | null;
  description?: string | null;
  url: string;
}) {
  const descriptionWithLink = [description, `Se eventet: ${url}`]
    .filter(Boolean)
    .join("\n\n");

  return [
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${formatDateTime(Date.now())}`,
    `DTSTART:${formatDateTime(startsAt)}`,
    `DTEND:${formatDateTime(endsAt)}`,
    `SUMMARY:${escapeIcs(title)}`,
    ...(location ? [`LOCATION:${escapeIcs(location)}`] : []),
    `URL:${url}`,
    `DESCRIPTION:${escapeIcs(descriptionWithLink)}`,
    "END:VEVENT"
  ].join("\r\n");
}

export async function GET(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const guestUrl = getGuestUrl(request, params.token);

  const programList = await db
    .select()
    .from(programItems)
    .where(eq(programItems.eventId, context.event.id));

  const mealsList = await db
    .select()
    .from(meals)
    .where(eq(meals.eventId, context.event.id));

  const entries = [
    buildEvent({
      uid: `event-${context.event.id}`,
      title: context.event.title,
      startsAt: context.event.startsAt,
      endsAt: context.event.endsAt,
      location: context.event.location,
      description: context.event.description,
      url: guestUrl
    }),
    ...programList
      .filter((item) => item.isVisible)
      .map((item) =>
        buildEvent({
          uid: `program-${item.id}`,
          title: item.name,
          startsAt: item.startsAt,
          endsAt: item.endsAt,
          url: guestUrl
        })
      ),
    ...mealsList.map((meal) =>
      buildEvent({
        uid: `meal-${meal.id}`,
      title: meal.name,
      startsAt: meal.startsAt,
      endsAt: meal.endsAt,
      url: guestUrl
      })
    )
  ];

  const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "PRODID:-//HMRDTM//DA//EN", ...entries, "END:VCALENDAR"].join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": "attachment; filename=hmrdtm-event.ics"
    }
  });
}
