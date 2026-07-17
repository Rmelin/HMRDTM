import { and, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateMealStats } from "@/lib/meal-stats";
import {
  changeLog,
  events,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people
} from "@/lib/schema";

const statusLabel = { yes: "Ja", maybe: "Måske", no: "Deltager ikke", invited: "Inviterede" } as const;
const dietLabel: Record<string, string> = {
  none: "Ingen",
  vegetarian: "Vegetar",
  vegan: "Veganer",
  allergy: "Allergi",
  other: "Andet"
};

function summarizeChange(type: string, value: string) {
  try {
    const parsed = JSON.parse(value);
    if (type === "meal_response") return parsed?.status ? statusLabel[parsed.status as keyof typeof statusLabel] ?? parsed.status : "Ikke angivet";
    if (type === "event_status") return parsed?.status ? statusLabel[parsed.status as keyof typeof statusLabel] ?? parsed.status : "Ikke angivet";
    if (type === "attendance_window") {
      const windows = Array.isArray(parsed) ? parsed : [parsed];
      return windows.map((window) => {
        const comes = window?.comesAt ? new Date(window.comesAt).toLocaleString("da-DK") : "Ikke angivet";
        const leaves = window?.leavesAt ? new Date(window.leavesAt).toLocaleString("da-DK") : "Ikke angivet";
        return `${comes} → ${leaves}`;
      }).join(" · ") || "Ingen tidsrum";
    }
    return value;
  } catch {
    return value;
  }
}

export default async function MealDetailPage({ params }: { params: { id: string; mealId: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const event = await getEventForUser(user, params.id);
  const meal = await db.query.meals.findFirst({ where: eq(meals.id, params.mealId) });
  if (!event || !meal || meal.eventId !== event.id) notFound();

  const groups = await db.select().from(guestGroups).where(eq(guestGroups.eventId, event.id));
  const groupIds = groups.map((group) => group.id);
  const peopleList = groupIds.length ? await db.select().from(people).where(inArray(people.groupId, groupIds)) : [];
  const availability = groupIds.length ? await db.select().from(guestAvailability).where(inArray(guestAvailability.groupId, groupIds)) : [];
  const personIds = peopleList.map((person) => person.id);
  const responses = personIds.length ? await db.select().from(guestResponses).where(and(eq(guestResponses.mealId, meal.id), inArray(guestResponses.personId, personIds))) : [];
  const logs = await db.select().from(changeLog).where(and(eq(changeLog.mealId, meal.id), eq(changeLog.isAfterCutoff, true))).orderBy(desc(changeLog.changedAt));
  const stats = calculateMealStats(meal, groups, peopleList, availability, responses);
  const groupName = new Map(groups.map((group) => [group.id, group.displayName]));

  return (
    <div className="app-view">
      <div className="admin-toolbar">
        <Link className="button ghost" href={`/admin/events/${event.id}`}>← {event.title}</Link>
        <span className={`badge ${Date.now() > meal.cutoffAt ? "warning" : "accent"}`}>{Date.now() > meal.cutoffAt ? "Svar senest er passeret" : "Åben for svar"}</span>
      </div>
      <section className="event-hero">
        <div><span className="eyebrow">Måltidsdetalje</span><h1>{meal.name}</h1><p>{meal.description || "Se forventet antal, gæstesvar og kosthensyn."}</p></div>
        <div className="event-meta"><span>🗓 {new Date(meal.startsAt).toLocaleString("da-DK")} – {new Date(meal.endsAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</span><span>⏱ Svar senest {new Date(meal.cutoffAt).toLocaleString("da-DK")}</span></div>
      </section>

      {logs.length > 0 ? <div className="alert" style={{ marginTop: 14 }}><strong>⚠ {logs.length} ændring(er) efter Svar senest</strong><span className="badge warning">Se log nedenfor</span></div> : null}
      <div className="stats-grid">
        <article className="stat-card"><span>Ja</span><strong>{stats.yes}</strong><small className="muted">inkl. eventstatus</small></article>
        <article className="stat-card"><span>Måske</span><strong>{stats.maybe}</strong><small className="muted">kræver opfølgning</small></article>
        <article className="stat-card"><span>Afventer</span><strong>{stats.unspecified}</strong><small className="muted">mangler eventstatus</small></article>
        <article className="stat-card"><span>Forventet</span><strong>{stats.expected}</strong><small className="muted">{stats.expectedAdults} voksne · {stats.expectedChildren} børn</small></article>
      </div>

      <section className="card">
        <span className="eyebrow">Gæsteliste</span><h2>Hvem tæller med?</h2>
        <div className="list">
          {stats.guests.map((guest) => (
            <article className="list-item" key={guest.id}>
              <div className="item-heading"><div><strong>{guest.name}</strong><div className="muted">{guest.groupName} · {guest.type === "partner" ? "Partner" : guest.type === "child" ? "Barn" : "Voksen"}</div></div><span className={`badge ${guest.expected ? "accent" : ""}`}>{guest.expected ? "Forventet" : "Tæller ikke"}</span></div>
              <div className="tag-row"><span className="tag">{guest.explicitStatus ? `Måltidsafvigelse: ${statusLabel[guest.explicitStatus]}` : guest.status ? `Følger event: ${statusLabel[guest.status]}` : "Afventer eventsvar"}</span><span className="tag">{guest.overlaps ? "Tiden overlapper" : "Intet overlap"}</span>{guest.dietType && guest.dietType !== "none" ? <span className="tag">{dietLabel[guest.dietType] ?? guest.dietType}</span> : null}</div>
              {guest.dietNotes ? <p style={{ marginTop: 10 }}>Kostnote: {guest.dietNotes}</p> : null}
            </article>
          ))}
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <span className="eyebrow">Svarfrist-log</span><h2>Ændringer efter Svar senest</h2>
        {logs.length === 0 ? <div className="empty-state">Ingen ændringer efter Svar senest.</div> : <div className="list">{logs.map((entry) => (
          <article className="list-item" key={entry.id}><div className="item-heading"><strong>{entry.entityType === "meal_response" ? "Måltidssvar" : entry.entityType === "attendance_window" ? "Kommer/går" : "Eventstatus"}</strong><span className="badge warning">{new Date(entry.changedAt).toLocaleString("da-DK")}</span></div><div className="muted">{entry.guestGroupId ? groupName.get(entry.guestGroupId) ?? "Gæst" : entry.changedBy}</div><p><strong>Før:</strong> {summarizeChange(entry.entityType, entry.before)}<br /><strong>Efter:</strong> {summarizeChange(entry.entityType, entry.after)}</p></article>
        ))}</div>}
      </section>
    </div>
  );
}
