import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { admins, eventOwners, events, sessions } from "@/lib/schema";

const SESSION_COOKIE = "hmrdtm_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 7;

export async function createSession(userId: string) {
  const now = Date.now();
  const id = randomUUID();
  const expiresAt = now + SESSION_TTL_MS;

  await db.insert(sessions).values({
    id,
    adminId: userId,
    createdAt: now,
    expiresAt
  });

  cookies().set({
    name: SESSION_COOKIE,
    value: id,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(expiresAt)
  });
}

export async function clearSession() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (sessionId) {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  cookies().delete(SESSION_COOKIE);
}

export async function getCurrentUser() {
  const sessionId = cookies().get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, sessionId)
  });

  if (!session || session.expiresAt < Date.now()) {
    if (session) await db.delete(sessions).where(eq(sessions.id, session.id));
    return null;
  }

  const user = await db.query.admins.findFirst({
    where: eq(admins.id, session.adminId)
  });

  return user ?? null;
}

// Beholdt som alias, så ældre kode kan migreres uden at ændre loginformatet.
export const getAdminFromRequest = getCurrentUser;

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export function isSystemAdmin(user: CurrentUser) {
  return user.role === "admin";
}

export async function canAccessEvent(user: CurrentUser, eventId: string) {
  if (isSystemAdmin(user)) return true;

  const ownership = await db.query.eventOwners.findFirst({
    where: and(
      eq(eventOwners.eventId, eventId),
      eq(eventOwners.userId, user.id)
    )
  });
  return Boolean(ownership);
}

export async function getEventForUser(user: CurrentUser, eventId: string) {
  if (!(await canAccessEvent(user, eventId))) return null;
  return (await db.query.events.findFirst({ where: eq(events.id, eventId) })) ?? null;
}
