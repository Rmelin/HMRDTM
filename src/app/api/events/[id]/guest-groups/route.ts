import { randomBytes, randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestAvailability, guestGroups, people } from "@/lib/schema";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { parseGuestImport, type ImportedGuest } from "@/lib/guest-import";

const schema = z.object({
  displayName: z.string().trim().max(80).optional(),
  importText: z.string().max(50_000).optional()
}).refine(
  (value) => value.importText === undefined || value.displayName === undefined,
  { message: "Vælg enten enkelt oprettelse eller import" }
);

function prepareGuests(guests: ImportedGuest[]) {
  return guests.map((guest) => ({
    ...guest,
    id: randomUUID(),
    inviteToken: randomBytes(32).toString("base64url")
  }));
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

  const body = await request.json().catch(() => null);
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  let importedGuests: ImportedGuest[];
  if (payload.data.importText !== undefined) {
    const parsed = parseGuestImport(payload.data.importText);
    if (parsed.errors.length > 0) {
      return NextResponse.json(
        { error: "Importen indeholder fejl", errors: parsed.errors },
        { status: 400 }
      );
    }
    if (parsed.guests.length === 0) {
      return NextResponse.json(
        { error: "Importen indeholder ingen gæster" },
        { status: 400 }
      );
    }
    importedGuests = parsed.guests;
  } else {
    importedGuests = [{
      displayName: payload.data.displayName || "Ikke navngivet",
      contactEmail: null,
      contactPhone: null,
      children: [],
      line: 1
    }];
  }

  const preparedGuests = prepareGuests(importedGuests);
  const now = Date.now();
  db.transaction((tx) => {
    for (const guest of preparedGuests) {
      tx.insert(guestGroups).values({
        id: guest.id,
        eventId: params.id,
        displayName: guest.displayName,
        inviteToken: guest.inviteToken,
        eventStatus: "invited",
        contactEmail: guest.contactEmail,
        contactPhone: guest.contactPhone,
        shareEmail: Boolean(guest.contactEmail),
        sharePhone: Boolean(guest.contactPhone),
        createdAt: now,
        lastSeenAt: null
      }).run();
      tx.insert(people).values({
        id: randomUUID(),
        groupId: guest.id,
        name: guest.displayName,
        type: "adult",
        dietType: "none",
        dietNotes: null
      }).run();
      for (const child of guest.children) {
        tx.insert(people).values({
          id: randomUUID(),
          groupId: guest.id,
          name: child,
          type: "child",
          dietType: "none",
          dietNotes: null
        }).run();
      }
      tx.insert(guestAvailability).values({
        groupId: guest.id,
        comesAt: event.startsAt,
        leavesAt: event.endsAt
      }).run();
    }
  });

  const created = preparedGuests.map((guest) => ({
    id: guest.id,
    inviteToken: guest.inviteToken
  }));
  return NextResponse.json({
    ok: true,
    count: created.length,
    created,
    id: created[0]?.id,
    inviteToken: created[0]?.inviteToken
  });
}
