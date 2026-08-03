"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { GuestAvailabilityForm } from "@/components/guest-availability-form";
import { PersonForm } from "@/components/person-form";
import { PersonRow } from "@/components/person-row";
import { formatDateTime } from "@/lib/datetime";

type Person = { id: string; name: string; type: string; dietType: string | null; dietNotes: string | null };
type Availability = { comesAt: number | null; leavesAt: number | null };
type Group = { id: string; displayName: string; contactPhone: string | null; inviteToken: string; eventStatus: string; lastSeenAt: number | null };

const status: Record<string, string> = { yes: "Deltager", maybe: "Måske", no: "Deltager ikke", invited: "Inviterede" };

export function GuestGroupRow({ group, people, availability, eventStartsAt, eventEndsAt }: { group: Group; people: Person[]; availability: Availability[]; eventStartsAt: number; eventEndsAt: number }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(group.displayName);
  const [message, setMessage] = useState<string | null>(null);

  const copyLink = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/guest/${group.inviteToken}`);
    setMessage("Invitationslink kopieret");
  };

  const save = async () => {
    const response = await fetch(`/api/guest-groups/${group.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });
    const body = await response.json();
    if (!response.ok) return setMessage(body.error ?? "Kunne ikke gemme");
    setMessage("Invitationens navn er gemt");
    router.refresh();
  };

  const remove = async () => {
    if (!window.confirm(`Slet invitationen til ${group.displayName}?`)) return;
    const response = await fetch(`/api/guest-groups/${group.id}`, { method: "DELETE" });
    if (response.ok) router.refresh();
  };

  return (
    <details className="list-item">
      <summary className="item-heading" style={{ cursor: "pointer" }}>
        <div>
          <strong>{group.displayName}</strong>
          <div className="muted">
            {group.lastSeenAt ? `Senest set ${formatDateTime(group.lastSeenAt)}` : "Invitation ikke åbnet"}
            {group.contactPhone ? ` · Tlf. ${group.contactPhone}` : ""}
          </div>
        </div>
        <div className="tag-row" style={{ marginTop: 0 }}>
          <span className="badge">Event: {status[group.eventStatus] ?? "Inviterede"}</span>
          <span className="badge">{people.length} person(er)</span>
        </div>
      </summary>
      <div className="stack" style={{ marginTop: 16 }}>
        <div className="button-row" style={{ marginTop: 0 }}><button className="button" type="button" onClick={copyLink}>Kopiér gæstelink</button><a className="button ghost" href={`/guest/${group.inviteToken}`} target="_blank" rel="noreferrer">Åbn gæstevisning</a></div>
        <label><span className="field-label">Invitationsnavn</span><input value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
        {message ? <p className="form-message">{message}</p> : null}
        <div className="button-row" style={{ marginTop: 0 }}><button className="button ghost" type="button" onClick={save}>Gem invitation</button><button className="button danger" type="button" onClick={remove}>Slet invitation</button></div>
        <div className="subcard"><h3>Kommer og går</h3><GuestAvailabilityForm groupId={group.id} availability={availability} eventStartsAt={eventStartsAt} eventEndsAt={eventEndsAt} /></div>
        <div className="subcard"><h3>Personer og kost</h3><PersonForm groupId={group.id} /><div className="list">{people.map((person) => <PersonRow key={person.id} person={person} />)}</div></div>
      </div>
    </details>
  );
}
