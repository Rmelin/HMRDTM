import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, guestGroups } from "@/lib/schema";

export async function getGuestContext(token: string) {
  const group = await db.query.guestGroups.findFirst({
    where: eq(guestGroups.inviteToken, token)
  });
  if (!group) return null;

  const now = Date.now();
  if (!group.lastSeenAt || now - group.lastSeenAt > 5 * 60 * 1000) {
    await db
      .update(guestGroups)
      .set({ lastSeenAt: now })
      .where(eq(guestGroups.id, group.id));
  }

  const event = await db.query.events.findFirst({
    where: eq(events.id, group.eventId)
  });
  if (!event) return null;

  return { group: { ...group, lastSeenAt: now }, event };
}
