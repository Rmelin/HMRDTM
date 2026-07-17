import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "@/lib/db";
import { hasOverlap } from "@/lib/overlap";
import { changeLog, meals } from "@/lib/schema";

type Window = { comesAt: number | null; leavesAt: number | null };

export async function logAvailabilityCutoffChanges({
  eventId,
  groupId,
  before,
  after,
  changedBy,
  now = Date.now()
}: {
  eventId: string;
  groupId: string;
  before: Window[];
  after: Window[];
  changedBy: string;
  now?: number;
}) {
  if (JSON.stringify(before) === JSON.stringify(after)) {
    return 0;
  }

  const eventMeals = await db
    .select()
    .from(meals)
    .where(eq(meals.eventId, eventId));

  const affected = eventMeals.filter((meal) => {
    if (now <= meal.cutoffAt) return false;
    const beforeOverlap = before.some((window) => hasOverlap(
      meal.startsAt, meal.endsAt, window.comesAt, window.leavesAt
    ));
    const afterOverlap = after.some((window) => hasOverlap(
      meal.startsAt, meal.endsAt, window.comesAt, window.leavesAt
    ));
    return beforeOverlap || afterOverlap;
  });

  if (affected.length > 0) {
    await db.insert(changeLog).values(
      affected.map((meal) => ({
        id: randomUUID(),
        eventId,
        mealId: meal.id,
        guestGroupId: groupId,
        entityType: "attendance_window",
        entityId: groupId,
        before: JSON.stringify(before),
        after: JSON.stringify(after),
        changedAt: now,
        changedBy,
        isAfterCutoff: true
      }))
    );
  }

  return affected.length;
}

export async function logEventStatusCutoffChanges({
  eventId,
  groupId,
  before,
  after,
  changedBy,
  now = Date.now()
}: {
  eventId: string;
  groupId: string;
  before: string;
  after: string;
  changedBy: string;
  now?: number;
}) {
  if (before === after) return 0;

  const affected = (
    await db.select().from(meals).where(eq(meals.eventId, eventId))
  ).filter((meal) => now > meal.cutoffAt);

  if (affected.length > 0) {
    await db.insert(changeLog).values(
      affected.map((meal) => ({
        id: randomUUID(),
        eventId,
        mealId: meal.id,
        guestGroupId: groupId,
        entityType: "event_status",
        entityId: groupId,
        before: JSON.stringify({ status: before }),
        after: JSON.stringify({ status: after }),
        changedAt: now,
        changedBy,
        isAfterCutoff: true
      }))
    );
  }

  return affected.length;
}
