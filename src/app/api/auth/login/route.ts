import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { admins } from "@/lib/schema";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { eq } from "drizzle-orm";
import {
  clearLoginAttempts,
  consumeLoginAttempt,
  requestIp
} from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function POST(request: Request) {
  const rateLimitKey = requestIp(request);
  const rateLimit = consumeLoginAttempt(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "For mange loginforsøg. Prøv igen senere." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) }
      }
    );
  }

  const body = await request.json().catch(() => null);
  const payload = schema.safeParse(body);
  if (!payload.success) {
    return NextResponse.json({ error: "Ugyldig input" }, { status: 400 });
  }

  const admin = await db.query.admins.findFirst({
    where: eq(admins.email, payload.data.email.toLowerCase())
  });

  if (!admin) {
    return NextResponse.json({ error: "Forkert login" }, { status: 401 });
  }

  const ok = await verifyPassword(payload.data.password, admin.passwordHash);
  if (!ok) {
    return NextResponse.json({ error: "Forkert login" }, { status: 401 });
  }

  clearLoginAttempts(rateLimitKey);
  await createSession(admin.id);
  return NextResponse.json({ ok: true });
}
