import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";

import { clearSession, getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/password";
import { admins, sessions } from "@/lib/schema";

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Ikke autoriseret" }, { status: 401 });

  const payload = passwordSchema.safeParse(await request.json().catch(() => null));
  if (!payload.success) {
    return NextResponse.json({ error: "Det nye password skal være mindst 8 tegn" }, { status: 400 });
  }
  if (!(await verifyPassword(payload.data.currentPassword, user.passwordHash))) {
    return NextResponse.json({ error: "Det nuværende password er forkert" }, { status: 400 });
  }

  await db.update(admins).set({ passwordHash: await hashPassword(payload.data.newPassword) }).where(eq(admins.id, user.id));
  await db.delete(sessions).where(eq(sessions.adminId, user.id));
  await clearSession();
  return NextResponse.json({ ok: true });
}
