import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, events, guestGroups } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";

const schema = z.object({
  message: z.string().trim().min(1).max(1000)
});

export async function GET(
  _request: Request,
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

  const rows = await db
    .select({
      id: chatMessages.id,
      message: chatMessages.message,
      createdAt: chatMessages.createdAt,
      authorName: guestGroups.displayName
    })
    .from(chatMessages)
    .leftJoin(guestGroups, eq(chatMessages.authorGroupId, guestGroups.id))
    .where(eq(chatMessages.eventId, params.id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({ messages: rows });
}

export async function POST(
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

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  await db.insert(chatMessages).values({
    id: randomUUID(),
    eventId: event.id,
    authorGroupId: null,
    message: payload.data.message,
    createdAt: Date.now()
  });

  return NextResponse.json({ ok: true });
}
