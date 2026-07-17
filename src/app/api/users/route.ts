import { randomUUID } from "node:crypto";
import { asc } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { admins } from "@/lib/schema";

const createUserSchema = z.object({
  name: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  password: z.string().min(8)
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const users = await db
    .select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role })
    .from(admins)
    .orderBy(asc(admins.name), asc(admins.email));
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  const currentUser = await getCurrentUser();
  if (!currentUser) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });
  if (!isSystemAdmin(currentUser)) {
    return NextResponse.json({ error: "Kun administratoren kan oprette brugere" }, { status: 403 });
  }

  const payload = createUserSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Navn, gyldig mail og mindst 8 tegn i password er påkrævet" }, { status: 400 });
  }

  try {
    await db.insert(admins).values({
      id: randomUUID(),
      name: payload.data.name,
      email: payload.data.email.toLowerCase(),
      passwordHash: await hashPassword(payload.data.password),
      role: "user",
      createdAt: Date.now()
    });
  } catch (error) {
    if (error instanceof Error && /UNIQUE constraint failed/.test(error.message)) {
      return NextResponse.json({ error: "Der findes allerede en bruger med den mail" }, { status: 409 });
    }
    throw error;
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
