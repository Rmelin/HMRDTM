import { asc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { CollapsibleSection } from "@/components/collapsible-section";
import { GuestAvailabilityPanel } from "@/components/guest-availability-panel";
import { GuestChatPanel } from "@/components/guest-chat-panel";
import { GuestMealsPanel } from "@/components/guest-meals-panel";
import { GuestProfilePanel } from "@/components/guest-profile-panel";
import { db } from "@/lib/db";
import { formatDateTime, formatTime } from "@/lib/datetime";
import { getGuestContext } from "@/lib/guest";
import {
  chatMessages,
  guestAvailability,
  guestGroups,
  guestResponses,
  meals,
  people,
  programItems
} from "@/lib/schema";

export const metadata: Metadata = {
  title: "Invitation"
};

export default async function GuestPage({ params }: { params: { token: string } }) {
  const context = await getGuestContext(params.token);
  if (!context) return notFound();

  const [programList, mealsList, peopleList, availability, chatList, guestList] = await Promise.all([
    db.select().from(programItems).where(eq(programItems.eventId, context.event.id)).orderBy(programItems.startsAt),
    db.select().from(meals).where(eq(meals.eventId, context.event.id)).orderBy(meals.startsAt),
    db.select().from(people).where(eq(people.groupId, context.group.id)),
    db.select().from(guestAvailability).where(eq(guestAvailability.groupId, context.group.id)),
    db
      .select({
        id: chatMessages.id,
        message: chatMessages.message,
        createdAt: chatMessages.createdAt,
        authorName: guestGroups.displayName
      })
      .from(chatMessages)
      .leftJoin(guestGroups, eq(chatMessages.authorGroupId, guestGroups.id))
      .where(eq(chatMessages.eventId, context.event.id))
      .orderBy(asc(chatMessages.createdAt)),
    context.event.allowGuestList
      ? db
          .select({
            id: guestGroups.id,
            displayName: guestGroups.displayName,
            eventStatus: guestGroups.eventStatus
          })
          .from(guestGroups)
          .where(eq(guestGroups.eventId, context.event.id))
          .orderBy(guestGroups.createdAt)
      : Promise.resolve([])
  ]);

  const personIds = peopleList.map((person) => person.id);
  const responses = personIds.length
    ? await db.select().from(guestResponses).where(inArray(guestResponses.personId, personIds))
    : [];
  const visibleProgram = programList.filter((item) => item.isVisible);
  const scheduleItems = [
    ...mealsList.map((meal) => ({
      id: meal.id,
      type: "meal" as const,
      name: meal.name,
      startsAt: meal.startsAt,
      endsAt: meal.endsAt
    })),
    ...visibleProgram.map((item) => ({
      id: item.id,
      type: "program" as const,
      name: item.name,
      startsAt: item.startsAt,
      endsAt: item.endsAt
    }))
  ];
  const otherGuests = guestList.filter((group) => group.id !== context.group.id);
  const guestStatus: Record<string, string> = {
    yes: "Deltager",
    maybe: "Måske",
    no: "Deltager ikke",
    invited: "Inviterede"
  };
  const guestStatusCounts = {
    yes: otherGuests.filter((group) => group.eventStatus === "yes").length,
    maybe: otherGuests.filter((group) => group.eventStatus === "maybe").length,
    invited: otherGuests.filter((group) => group.eventStatus === "invited").length,
    no: otherGuests.filter((group) => group.eventStatus === "no").length
  };

  return (
    <div className="app-view guest-view">
      <section className="event-hero">
        <div>
          <span className="eyebrow">Din invitation</span>
          <h1>{context.event.title}</h1>
          <p>{context.event.description || "Du er inviteret – fortæl os, hvornår du kommer, og hvilke måltider du deltager i."}</p>
        </div>
        <a className="button ghost" href={`/api/guest/${params.token}/ics`}>＋ Tilføj til kalender</a>
        <div className="event-meta">
          <span>📍 {context.event.location || "Sted kommer senere"}</span>
          <span>🗓 {formatDateTime(context.event.startsAt)} – {formatDateTime(context.event.endsAt)}</span>
        </div>
      </section>

      {context.event.allowGuestList ? (
        <section className="card guest-list-overview">
          <div className="item-heading">
            <div><span className="eyebrow">Hurtigt overblik</span><h2>Gæsteliste</h2></div>
            <span className="badge accent">{otherGuests.length} andre gæster</span>
          </div>
          <div className="tag-row guest-list-counts">
            <span className="badge accent">Deltager {guestStatusCounts.yes}</span>
            <span className="badge warning">Måske {guestStatusCounts.maybe}</span>
            <span className="badge">Inviterede {guestStatusCounts.invited}</span>
            <span className="badge">Deltager ikke {guestStatusCounts.no}</span>
          </div>
          {otherGuests.length > 0 ? (
            <div className="guest-list-quick-grid">
              {otherGuests.map((group) => (
                <div className="guest-list-quick-person" key={group.id}>
                  <strong>{group.displayName}</strong>
                  <span className={`badge ${group.eventStatus === "yes" ? "accent" : group.eventStatus === "maybe" ? "warning" : ""}`}>
                    {guestStatus[group.eventStatus] ?? "Inviterede"}
                  </span>
                </div>
              ))}
            </div>
          ) : <div className="empty-state">Der er ikke andre gæster endnu.</div>}
        </section>
      ) : null}

      <section className="progress-card">
        <div><strong>Hej {context.group.displayName}</strong><span className="muted">Deltagelsesstatus gemmes automatisk. Navn og kost gemmes med knappen i profilen.</span></div>
        <span className="badge accent">{responses.length} individuelle måltidsafvigelser</span>
      </section>

      <CollapsibleSection title="1. Deltagelse og kost" defaultOpen>
        <GuestProfilePanel
          token={params.token}
          displayName={context.group.displayName}
          eventStatus={context.group.eventStatus}
          allowPartner={context.event.allowPartner}
          allowChildren={context.event.allowChildren}
          people={peopleList}
        />
      </CollapsibleSection>

      <CollapsibleSection title="2. Kommer og går – kan du ikke deltage hele tiden?">
        <GuestAvailabilityPanel
          token={params.token}
          availability={availability}
          eventStartsAt={context.event.startsAt}
          eventEndsAt={context.event.endsAt}
          scheduleItems={scheduleItems}
        />
      </CollapsibleSection>

      <CollapsibleSection title="3. Måltider" defaultOpen>
        <GuestMealsPanel token={params.token} meals={mealsList} people={peopleList} responses={responses} eventStatus={context.group.eventStatus} />
      </CollapsibleSection>

      {visibleProgram.length > 0 ? (
        <CollapsibleSection title="Program">
          <div className="list">
            {visibleProgram.map((item) => (
              <article className="list-item" key={item.id}>
                <div className="item-heading"><strong>{item.name}</strong><span className="badge">{formatTime(item.startsAt)}</span></div>
                {item.description ? <p>{item.description}</p> : null}
              </article>
            ))}
          </div>
        </CollapsibleSection>
      ) : null}

      <CollapsibleSection title="4. Chatvæg" defaultOpen>
        <GuestChatPanel token={params.token} messages={chatList} />
      </CollapsibleSection>
    </div>
  );
}
