import { and, asc, desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { AdminScheduleCalendar } from "@/components/admin-schedule-calendar";
import { ChatPanel } from "@/components/chat-panel";
import { CollapsibleSection } from "@/components/collapsible-section";
import { EventEditForm } from "@/components/event-edit-form";
import { EventOwnersForm } from "@/components/event-owners-form";
import { GuestGroupForm } from "@/components/guest-group-form";
import { GuestGroupRow } from "@/components/guest-group-row";
import { getCurrentUser, getEventForUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { calculateMealStats } from "@/lib/meal-stats";
import {
  changeLog,
  chatMessages,
  admins,
  eventOwners,
  events,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people,
  programItems
} from "@/lib/schema";

export default async function AdminEventPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const event = await getEventForUser(user, params.id);
  if (!event) notFound();

  const [programList, mealsList, groups, chatList, cutoffChanges, ownerRows, allUsers] = await Promise.all([
    db.select().from(programItems).where(eq(programItems.eventId, event.id)).orderBy(programItems.startsAt),
    db.select().from(meals).where(eq(meals.eventId, event.id)).orderBy(meals.startsAt),
    db.select().from(guestGroups).where(eq(guestGroups.eventId, event.id)).orderBy(guestGroups.createdAt),
    db
      .select({ id: chatMessages.id, message: chatMessages.message, createdAt: chatMessages.createdAt, authorName: guestGroups.displayName })
      .from(chatMessages)
      .leftJoin(guestGroups, eq(chatMessages.authorGroupId, guestGroups.id))
      .where(eq(chatMessages.eventId, event.id))
      .orderBy(asc(chatMessages.createdAt)),
    db.select().from(changeLog).where(and(eq(changeLog.eventId, event.id), eq(changeLog.isAfterCutoff, true))).orderBy(desc(changeLog.changedAt)),
    db.select({ id: admins.id, name: admins.name, email: admins.email }).from(eventOwners).innerJoin(admins, eq(eventOwners.userId, admins.id)).where(eq(eventOwners.eventId, event.id)),
    db.select({ id: admins.id, name: admins.name, email: admins.email }).from(admins)
  ]);
  const ownerIds = new Set(ownerRows.map((owner) => owner.id));
  const availableOwners = allUsers.filter((candidate) => !ownerIds.has(candidate.id));

  const groupIds = groups.map((group) => group.id);
  const allPeople = groupIds.length ? await db.select().from(people).where(inArray(people.groupId, groupIds)) : [];
  const availabilityList = groupIds.length ? await db.select().from(guestAvailability).where(inArray(guestAvailability.groupId, groupIds)) : [];
  const personIds = allPeople.map((person) => person.id);
  const responses = personIds.length ? await db.select().from(guestResponses).where(inArray(guestResponses.personId, personIds)) : [];

  const peopleByGroup = new Map<string, typeof allPeople>();
  for (const person of allPeople) peopleByGroup.set(person.groupId, [...(peopleByGroup.get(person.groupId) ?? []), person]);
  const availabilityByGroup = new Map<string, typeof availabilityList>();
  for (const item of availabilityList) {
    availabilityByGroup.set(item.groupId, [
      ...(availabilityByGroup.get(item.groupId) ?? []),
      item
    ]);
  }
  const changeCountByMeal = new Map<string, number>();
  for (const entry of cutoffChanges) {
    if (entry.mealId) changeCountByMeal.set(entry.mealId, (changeCountByMeal.get(entry.mealId) ?? 0) + 1);
  }

  const mealStats = new Map(
    mealsList.map((meal) => [meal.id, calculateMealStats(meal, groups, allPeople, availabilityList, responses)])
  );
  const diets = allPeople.filter((person) => person.dietType && person.dietType !== "none");
  const notes = allPeople.filter((person) => person.dietNotes);
  const answeredInvitations = groups.filter((group) => group.eventStatus !== "invited").length;

  return (
    <div className="app-view admin-view">
      <div className="admin-toolbar">
        <Link className="button ghost" href="/admin">← Alle events</Link>
        <div className="button-row" style={{ marginTop: 0 }}>
          <a className="button ghost" href={`/api/events/${event.id}/export?type=summary`}>Eksportér CSV</a>
        </div>
      </div>

      <section className="event-hero">
        <div>
          <span className="eyebrow">Admin · Eventdashboard</span>
          <h1>{event.title}</h1>
          <p>{event.description || "Tilføj en beskrivelse under eventindstillinger."}</p>
        </div>
        <div className="event-meta">
          <span>📍 {event.location || "Intet sted angivet"}</span>
          <span>🗓 {formatDateTime(event.startsAt)} – {formatDateTime(event.endsAt)}</span>
          <span>⏱ Svar senest (standard) {formatDateTime(event.signupDeadlineAt)}</span>
        </div>
      </section>

      {cutoffChanges.length > 0 ? (
        <div className="alert" style={{ marginTop: 14 }}>
          <div><strong>⚠ {cutoffChanges.length} ændring(er) efter Svar senest</strong><div className="muted">Åbn et måltid for at se før/efter.</div></div>
          <span className="badge warning">Kræver overblik</span>
        </div>
      ) : null}

      <div className="dashboard-top-grid">
        <div className="dashboard-overview">
          <div className="stats-grid">
            <article className="stat-card"><span>Gæster</span><strong>{allPeople.length}</strong><small className="muted">{groups.length} invitationer</small></article>
            <article className="stat-card"><span>Invitationssvar</span><strong>{answeredInvitations}</strong><small className="muted">har gemt deres deltagelse</small></article>
            <article className="stat-card"><span>Måltidsafvigelser</span><strong>{responses.length}</strong><small className="muted">ellers følges eventstatus</small></article>
            <article className="stat-card"><span>Kosthensyn</span><strong>{diets.length}</strong><small className="muted">{notes.length} noter</small></article>
            <article className="stat-card"><span>Måltider</span><strong>{mealsList.length}</strong><small className="muted">i eventet</small></article>
          </div>

          <section className="card">
            <div className="item-heading"><div><span className="eyebrow">Madantal</span><h2>Måltider</h2></div></div>
            {mealsList.length === 0 ? <div className="empty-state">Opret det første måltid nedenfor.</div> : (
              <div className="meal-grid">
                {mealsList.map((meal) => {
                  const stats = mealStats.get(meal.id)!;
                  const changes = changeCountByMeal.get(meal.id) ?? 0;
                  return (
                    <article className="meal-card" key={meal.id}>
                      <div className="item-heading"><div><h3>{meal.name}</h3><span className="muted">{new Date(meal.startsAt).toLocaleString("da-DK")}</span></div>{changes > 0 ? <span className="badge warning">⚠ {changes}</span> : null}</div>
                      <div className="count-row"><span className="count yes" title="Ja, inkl. eventstatus">Ja {stats.yes}</span><span className="count maybe" title="Måske, inkl. eventstatus">? {stats.maybe}</span><span className="count no" title="Nej, inkl. eventstatus">Nej {stats.no}</span><span className="count" title="Afventer eventstatus">∅ {stats.unspecified}</span></div>
                      <div><strong>Forventet: {stats.expected}</strong><div className="muted">{stats.expectedAdults} voksne · {stats.expectedChildren} børn</div></div>
                      <Link className="button ghost" href={`/admin/events/${event.id}/meals/${meal.id}`}>Se detaljer →</Link>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="chat-sidebar card">
          <div className="item-heading"><div><span className="eyebrow">Fælles beskeder</span><h2>Chatvæg</h2></div><span className="badge accent">{chatList.length}</span></div>
          <ChatPanel eventId={event.id} messages={chatList} />
        </aside>
      </div>

      <CollapsibleSection title={`Gæster og invitationslinks (${groups.length})`} defaultOpen>
        <div className={`companion-access ${event.allowPartner || event.allowChildren ? "is-enabled" : "is-disabled"}`}>
          <div className="item-heading">
            <div><span className="eyebrow">Fælles eventregel</span><h3>Ekstra deltagere</h3></div>
            <span className={`badge ${event.allowPartner || event.allowChildren ? "accent" : ""}`}>
              {event.allowPartner || event.allowChildren ? "Tilladt for alle invitationer" : "Ikke tilladt"}
            </span>
          </div>
          <p className="helper-text">
            {event.allowPartner && event.allowChildren
              ? "Alle gæster må tilføje én partner og børn."
              : event.allowPartner
                ? "Alle gæster må tilføje én partner."
                : event.allowChildren
                  ? "Alle gæster må tilføje børn."
                  : "Gæster kan ikke selv tilføje partner eller børn."}
          </p>
        </div>
        <GuestGroupForm eventId={event.id} />
        <div className="list">
          {groups.length === 0 ? <div className="empty-state">Ingen gæster endnu.</div> : groups.map((group) => (
            <GuestGroupRow key={group.id} group={group} people={peopleByGroup.get(group.id) ?? []} availability={availabilityByGroup.get(group.id) ?? []} eventStartsAt={event.startsAt} eventEndsAt={event.endsAt} />
          ))}
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Kostoversigt">
        {diets.length === 0 && notes.length === 0 ? <div className="empty-state">Ingen kosthensyn angivet.</div> : (
          <div className="list">{allPeople.filter((person) => person.dietType !== "none" || person.dietNotes).map((person) => <div className="list-item" key={person.id}><div className="item-heading"><strong>{person.name}</strong><span className="badge">{person.dietType || "none"}</span></div>{person.dietNotes ? <p>{person.dietNotes}</p> : null}</div>)}</div>
        )}
      </CollapsibleSection>

      <CollapsibleSection title="Opret og redigér måltider og program" defaultOpen>
        <AdminScheduleCalendar
          event={event}
          meals={mealsList}
          programItems={programList}
        />
      </CollapsibleSection>

      <CollapsibleSection title="Eventindstillinger">
        <EventEditForm event={event} />
      </CollapsibleSection>

      <CollapsibleSection title={`Eventejere (${ownerRows.length})`}>
        <EventOwnersForm eventId={event.id} owners={ownerRows} availableUsers={availableOwners} />
      </CollapsibleSection>
    </div>
  );
}
