import { eq } from "drizzle-orm";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CollapsibleSection } from "@/components/collapsible-section";
import { CreateEventForm } from "@/components/create-event-form";
import { LogoutButton } from "@/components/logout-button";
import { PasswordForm } from "@/components/password-form";
import { UserManagement } from "@/components/user-management";
import { getCurrentUser, isSystemAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDateTime } from "@/lib/datetime";
import { admins, eventOwners, events, guestGroups, meals } from "@/lib/schema";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");

  const [allEvents, ownedEvents, groups, mealList, users] = await Promise.all([
    isSystemAdmin(user) ? db.select().from(events).orderBy(events.startsAt) : Promise.resolve([]),
    db.select({ event: events }).from(eventOwners).innerJoin(events, eq(eventOwners.eventId, events.id)).where(eq(eventOwners.userId, user.id)).orderBy(events.startsAt),
    db.select().from(guestGroups),
    db.select().from(meals),
    isSystemAdmin(user) ? db.select({ id: admins.id, name: admins.name, email: admins.email, role: admins.role }).from(admins) : Promise.resolve([])
  ]);
  const list = isSystemAdmin(user) ? allEvents : ownedEvents.map((row) => row.event);
  const groupCount = new Map<string, number>();
  const mealCount = new Map<string, number>();
  for (const group of groups) groupCount.set(group.eventId, (groupCount.get(group.eventId) ?? 0) + 1);
  for (const meal of mealList) mealCount.set(meal.eventId, (mealCount.get(meal.eventId) ?? 0) + 1);

  return (
    <div className="app-view">
      <div className="admin-toolbar"><div><span className="eyebrow">{isSystemAdmin(user) ? "Administration" : "Mine events"}</span><h1>Events</h1><p className="muted">Logget ind som {user.name || user.email}. Opret events, invitér gæster og følg madantallet.</p></div><LogoutButton /></div>
      <div className="meal-grid">
        {list.map((event) => (
          <article className="meal-card" key={event.id}>
            <div><span className="badge accent">{event.endsAt < Date.now() ? "Afsluttet" : event.startsAt < Date.now() ? "I gang" : "Kommende"}</span><h2 style={{ marginTop: 10 }}>{event.title}</h2><p>{event.location || "Intet sted angivet"}</p></div>
            <div className="event-meta"><span>🗓 {formatDateTime(event.startsAt)}</span><span>👥 {groupCount.get(event.id) ?? 0} invitationer</span><span>🍽 {mealCount.get(event.id) ?? 0} måltider</span></div>
            <Link className="button" href={`/admin/events/${event.id}`}>Åbn dashboard →</Link>
          </article>
        ))}
        {list.length === 0 ? <div className="empty-state">Der er ingen events endnu.</div> : null}
      </div>
      <CollapsibleSection title="Opret nyt event" defaultOpen={list.length === 0}><CreateEventForm /></CollapsibleSection>
      {isSystemAdmin(user) ? <CollapsibleSection title={`Brugere (${users.length})`}><UserManagement users={users} currentUserId={user.id} /></CollapsibleSection> : null}
      <CollapsibleSection title="Skift password"><PasswordForm /></CollapsibleSection>
    </div>
  );
}
