import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { chatMessages, guestGroups } from "@/lib/schema";
import { getGuestContext } from "@/lib/guest";

const schema = z.object({
  message: z.string().trim().min(1).max(1000)
});

export async function GET(
  _request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
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
    .where(eq(chatMessages.eventId, context.event.id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({ messages: rows });
}

export async function POST(
  request: Request,
  { params }: { params: { token: string } }
) {
  const context = await getGuestContext(params.token);
  if (!context) {
    return NextResponse.json({ error: "Ugyldigt link" }, { status: 404 });
  }

  const body = await request.json();
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  await db.insert(chatMessages).values({
    id: randomUUID(),
    eventId: context.event.id,
    authorGroupId: context.group.id,
    message: payload.data.message,
    createdAt: Date.now()
  });

  return NextResponse.json({ ok: true });
}
