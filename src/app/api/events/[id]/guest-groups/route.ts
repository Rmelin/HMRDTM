import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestAvailability, guestGroups, people } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";

const schema = z.object({
  displayName: z.string().trim().max(80).optional()
});

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

  const id = randomUUID();
  const displayName = payload.data.displayName || "Ikke navngivet";
  const inviteToken = randomBytes(32).toString("base64url");
  const now = Date.now();
  db.transaction((tx) => {
    tx.insert(guestGroups).values({
      id,
      eventId: params.id,
      displayName,
      inviteToken,
      eventStatus: "invited",
      createdAt: now,
      lastSeenAt: null
    }).run();
    tx.insert(people).values({
      id: randomUUID(),
      groupId: id,
      name: displayName,
      type: "adult",
      dietType: "none",
      dietNotes: null
    }).run();
    tx.insert(guestAvailability).values({
      groupId: id,
      comesAt: event.startsAt,
      leavesAt: event.endsAt
    }).run();
  });

  return NextResponse.json({ ok: true, id, inviteToken });
}
