import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";

import { db } from "../lib/db";
import { hashPassword } from "../lib/password";
import {
  admins,
  changeLog,
  chatMessages,
  eventOwners,
  events,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people
} from "../lib/schema";

const ms = (value: string) => new Date(value).getTime();
const now = Date.now();
const eventId = "demo-sommerweekend-2026";
const dinnerId = "demo-meal-dinner";
const breakfastId = "demo-meal-breakfast";

const email = process.env.ADMIN_EMAIL ?? "admin@hmrdtm.local";
const password = process.env.ADMIN_PASSWORD ?? "hmrdtm1234";
if (password.length < 8) throw new Error("ADMIN_PASSWORD skal være mindst 8 tegn");

const existingAdmin = await db.query.admins.findFirst();
const adminId = existingAdmin?.id ?? randomUUID();
if (!existingAdmin) {
  await db.insert(admins).values({
    id: adminId,
    name: "Administrator",
    email,
    passwordHash: await hashPassword(password),
    role: "admin",
    createdAt: now
  });
  console.log(`Oprettede demo-admin: ${email}`);
}

const existingEvent = await db.query.events.findFirst({ where: eq(events.id, eventId) });
if (!existingEvent) {
  db.transaction((tx) => {
    tx.insert(events).values({
      id: eventId,
      title: "Sommerweekend 2026",
      location: "Møllehuset, Roskilde",
      startsAt: ms("2026-08-15T14:00:00+02:00"),
      endsAt: ms("2026-08-16T14:00:00+02:00"),
      description: "En hyggelig weekend med fælles mad, spil og gåtur.",
      signupDeadlineAt: ms("2026-08-14T16:00:00+02:00"),
      createdAt: now
    }).run();
    tx.insert(eventOwners).values({ eventId, userId: adminId, createdAt: now }).run();

    tx.insert(meals).values([
      { id: dinnerId, eventId, name: "Aftensmad", date: "2026-08-15", startsAt: ms("2026-08-15T18:00:00+02:00"), endsAt: ms("2026-08-15T19:30:00+02:00"), cutoffAt: ms("2026-08-14T16:00:00+02:00"), description: "Fælles aftensmad" },
      { id: breakfastId, eventId, name: "Morgenmad", date: "2026-08-16", startsAt: ms("2026-08-16T08:30:00+02:00"), endsAt: ms("2026-08-16T10:00:00+02:00"), cutoffAt: ms("2026-08-14T16:00:00+02:00"), description: "Morgenmad og kaffe" }
    ]).run();

    const demoGuests = [
      { groupId: "demo-group-anna", personId: "demo-person-anna", name: "Anna Madsen", token: "demo_anna_9Gu0pF4rJ6nY2wK8sD3mT7xQ5vB1cH", status: "yes", comesAt: ms("2026-08-15T14:00:00+02:00"), leavesAt: ms("2026-08-16T13:30:00+02:00"), dietType: "vegetarian", notes: "Spiser ikke tomat." },
      { groupId: "demo-group-jonas", personId: "demo-person-jonas", name: "Jonas Møller", token: "demo_jonas_2Ld8qA7zN4cV6bM1xR9sK3pW5tF0hJ", status: "maybe", comesAt: ms("2026-08-15T17:30:00+02:00"), leavesAt: ms("2026-08-16T11:00:00+02:00"), dietType: "allergy", notes: "Nøddeallergi." },
      { groupId: "demo-group-sofie", personId: "demo-person-sofie", name: "Sofie Lund", token: "demo_sofie_8Xr3mQ1vG7kP0sD6nB4tY9cF2wL5aH", status: "yes", comesAt: ms("2026-08-15T15:00:00+02:00"), leavesAt: ms("2026-08-16T14:00:00+02:00"), dietType: "none", notes: null }
    ];

    for (const guest of demoGuests) {
      tx.insert(guestGroups).values({ id: guest.groupId, eventId, displayName: guest.name, inviteToken: guest.token, eventStatus: guest.status, createdAt: now, lastSeenAt: guest.groupId === "demo-group-anna" ? now : null }).run();
      tx.insert(people).values({ id: guest.personId, groupId: guest.groupId, name: guest.name, type: "adult", dietType: guest.dietType, dietNotes: guest.notes }).run();
      tx.insert(guestAvailability).values({ groupId: guest.groupId, comesAt: guest.comesAt, leavesAt: guest.leavesAt }).run();
    }

    tx.insert(guestResponses).values([
      { personId: "demo-person-anna", mealId: dinnerId, status: "yes", updatedAt: ms("2026-08-13T12:00:00+02:00"), changedAfterDeadline: false },
      { personId: "demo-person-anna", mealId: breakfastId, status: "yes", updatedAt: ms("2026-08-13T12:00:00+02:00"), changedAfterDeadline: false },
      { personId: "demo-person-jonas", mealId: dinnerId, status: "maybe", updatedAt: ms("2026-08-14T18:42:00+02:00"), changedAfterDeadline: true },
      { personId: "demo-person-jonas", mealId: breakfastId, status: "no", updatedAt: ms("2026-08-13T13:00:00+02:00"), changedAfterDeadline: false },
      { personId: "demo-person-sofie", mealId: dinnerId, status: "yes", updatedAt: ms("2026-08-12T10:00:00+02:00"), changedAfterDeadline: false }
    ]).run();

    tx.insert(changeLog).values({
      id: "demo-change-jonas-dinner",
      eventId,
      mealId: dinnerId,
      guestGroupId: "demo-group-jonas",
      entityType: "meal_response",
      entityId: "demo-person-jonas:demo-meal-dinner",
      before: JSON.stringify({ status: "no" }),
      after: JSON.stringify({ status: "maybe" }),
      changedAt: ms("2026-08-14T18:42:00+02:00"),
      changedBy: "guest:demo-group-jonas",
      isAfterCutoff: true
    }).run();

    tx.insert(chatMessages).values([
      { id: "demo-chat-1", eventId, authorGroupId: "demo-group-sofie", message: "Jeg tager et par brætspil med 🎲", createdAt: ms("2026-08-14T14:12:00+02:00") },
      { id: "demo-chat-2", eventId, authorGroupId: "demo-group-jonas", message: "Er der nogen, der kører fra stationen?", createdAt: ms("2026-08-14T16:03:00+02:00") }
    ]).run();
  });
  console.log("Oprettede demo-event med 2 måltider og 3 gæster");
}

console.log(`Login: ${email} / ${existingAdmin ? "eksisterende password" : password}`);
console.log("Demo-gæst: /guest/demo_anna_9Gu0pF4rJ6nY2wK8sD3mT7xQ5vB1cH");
