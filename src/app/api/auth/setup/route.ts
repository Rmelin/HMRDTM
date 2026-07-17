import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { admins } from "@/lib/schema";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

const schema = z.object({
  name: z.string().trim().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const existing = await db.query.admins.findFirst();
  if (existing) {
    return NextResponse.json({ error: "Admin findes allerede" }, { status: 400 });
  }

  const adminId = randomUUID();
  const passwordHash = await hashPassword(payload.data.password);
  await db.insert(admins).values({
    id: adminId,
    name: payload.data.name || "Administrator",
    email: payload.data.email.toLowerCase(),
    passwordHash,
    role: "admin",
    createdAt: Date.now()
  });

  await createSession(adminId);
  return NextResponse.json({ ok: true });
}
