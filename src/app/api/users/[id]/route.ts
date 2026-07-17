import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { admins, eventOwners } from "@/lib/schema";

const updateUserSchema = z.object({
  name: z.string().trim().min(1).max(80)
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!isSystemAdmin(currentUser)) {
    return NextResponse.json({ error: "Kun administratoren kan ændre brugernavne" }, { status: 403 });
  }

  const payload = updateUserSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Navnet skal være mellem 1 og 80 tegn" }, { status: 400 });
  }

  const target = await db.query.admins.findFirst({ where: eq(admins.id, params.id) });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  await db.update(admins).set({ name: payload.data.name }).where(eq(admins.id, target.id));
  return NextResponse.json({ ok: true, name: payload.data.name });
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!isSystemAdmin(currentUser)) {
    return NextResponse.json({ error: "Kun administratoren kan slette brugere" }, { status: 403 });
  }
  if (currentUser.id === params.id) {
    return NextResponse.json({ error: "Du kan ikke slette din egen bruger" }, { status: 400 });
  }

  const target = await db.query.admins.findFirst({ where: eq(admins.id, params.id) });
  if (!target) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });
  if (target.role === "admin") {
    return NextResponse.json({ error: "Administratorbrugeren kan ikke slettes her" }, { status: 400 });
  }

  const ownedEvents = await db.select({ eventId: eventOwners.eventId }).from(eventOwners).where(eq(eventOwners.userId, target.id));
  db.transaction((tx) => {
    for (const ownedEvent of ownedEvents) {
      tx.insert(eventOwners).values({
        eventId: ownedEvent.eventId,
        userId: currentUser.id,
        createdAt: Date.now()
      }).onConflictDoNothing().run();
    }
    tx.delete(admins).where(eq(admins.id, target.id)).run();
  });
  return NextResponse.json({ ok: true });
}
