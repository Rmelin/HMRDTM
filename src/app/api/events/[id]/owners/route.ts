import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { admins, eventOwners } from "@/lib/schema";

const ownerSchema = z.object({ userId: z.string().uuid() });

async function authorizedEvent(eventId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 }) } as const;
  const event = await getEventForUser(user, eventId);
  if (!event) return { error: NextResponse.json({ error: "Event ikke fundet" }, { status: 404 }) } as const;
  return { user, event } as const;
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  const access = await authorizedEvent(params.id);
  if ("error" in access) return access.error;
  const payload = ownerSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Ugyldig bruger" }, { status: 400 });

  const user = await db.query.admins.findFirst({ where: eq(admins.id, payload.data.userId) });
  if (!user) return NextResponse.json({ error: "Bruger ikke fundet" }, { status: 404 });

  await db.insert(eventOwners).values({
    eventId: params.id,
    userId: user.id,
    createdAt: Date.now()
  }).onConflictDoNothing();
  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const access = await authorizedEvent(params.id);
  if ("error" in access) return access.error;
  const payload = ownerSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) return NextResponse.json({ error: "Ugyldig bruger" }, { status: 400 });

  const owners = await db.select().from(eventOwners).where(eq(eventOwners.eventId, params.id));
  if (owners.length <= 1) {
    return NextResponse.json({ error: "Et event skal have mindst én ejer" }, { status: 400 });
  }
  await db.delete(eventOwners).where(and(
    eq(eventOwners.eventId, params.id),
    eq(eventOwners.userId, payload.data.userId)
  ));
  return NextResponse.json({ ok: true });
}
