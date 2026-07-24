import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { eventOwners, events } from "@/lib/schema";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { defaultEventEnd, defaultSignupDeadline } from "@/lib/defaults";
import { parseDateTimeInput } from "@/lib/datetime";

const schema = z.object({
  title: z.string().min(1),
  location: z.string().optional(),
  startsAt: z.string().min(1),
  endsAt: z.string().optional(),
  description: z.string().optional(),
  signupDeadlineAt: z.string().optional(),
  allowPartner: z.boolean().default(false),
  allowChildren: z.boolean().default(false),
  allowGuestList: z.boolean().default(true)
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const list = isSystemAdmin(user)
    ? await db.select().from(events).orderBy(events.startsAt)
    : (await db.select({ event: events }).from(eventOwners).innerJoin(events, eq(eventOwners.eventId, events.id)).where(eq(eventOwners.userId, user.id)).orderBy(events.startsAt)).map((row) => row.event);
  return NextResponse.json({ events: list });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const startsAt = parseDateTimeInput(payload.data.startsAt);
  if (!Number.isFinite(startsAt)) {
    return NextResponse.json(
      { error: "Ugyldigt starttidspunkt" },
      { status: 400 }
    );
  }
  const endsAt = payload.data.endsAt
    ? parseDateTimeInput(payload.data.endsAt)
    : defaultEventEnd(startsAt);
  const signupDeadlineAt = payload.data.signupDeadlineAt
    ? parseDateTimeInput(payload.data.signupDeadlineAt)
    : defaultSignupDeadline(startsAt);

  if (
    !Number.isFinite(endsAt) ||
    !Number.isFinite(signupDeadlineAt)
  ) {
    return NextResponse.json(
      { error: "Ugyldigt tidspunkt" },
      { status: 400 }
    );
  }
  if (endsAt <= startsAt) {
    return NextResponse.json(
      { error: "Slut skal være efter start" },
      { status: 400 }
    );
  }

  const id = randomUUID();
  const createdAt = Date.now();
  db.transaction((tx) => {
    tx.insert(events).values({
      id,
      title: payload.data.title,
      location: payload.data.location ?? null,
      startsAt,
      endsAt,
      description: payload.data.description ?? null,
      signupDeadlineAt,
      allowPartner: payload.data.allowPartner,
      allowChildren: payload.data.allowChildren,
      allowGuestList: payload.data.allowGuestList,
      createdAt
    }).run();
    tx.insert(eventOwners).values({ eventId: id, userId: user.id, createdAt }).run();
  });

  const created = await db.query.events.findFirst({
    where: eq(events.id, id)
  });

  return NextResponse.json({ event: created });
}
