"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toLocalDateTimeInput } from "@/lib/datetime";

type EventData = {
  id: string;
  title: string;
  location: string | null;
  description: string | null;
  startsAt: number;
  endsAt: number;
  signupDeadlineAt: number;
  allowPartner: boolean;
  allowChildren: boolean;
  allowGuestList: boolean;
};

type OwnerAttendance = {
  id: string;
  name: string;
  email: string;
  countsAsGuest: boolean;
};

export function EventEditForm({
  event,
  owners
}: {
  event: EventData;
  owners: OwnerAttendance[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(event.title);
  const [location, setLocation] = useState(event.location ?? "");
  const [description, setDescription] = useState(event.description ?? "");
  const [startsAt, setStartsAt] = useState(toLocalDateTimeInput(event.startsAt));
  const [endsAt, setEndsAt] = useState(toLocalDateTimeInput(event.endsAt));
  const [deadline, setDeadline] = useState(
    toLocalDateTimeInput(event.signupDeadlineAt)
  );
  const [allowPartner, setAllowPartner] = useState(event.allowPartner);
  const [allowChildren, setAllowChildren] = useState(event.allowChildren);
  const [allowGuestList, setAllowGuestList] = useState(event.allowGuestList);
  const [countedOwnerIds, setCountedOwnerIds] = useState(
    () => new Set(owners.filter((owner) => owner.countsAsGuest).map((owner) => owner.id))
  );
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    setError(null);
    const response = await fetch(`/api/events/${event.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        location: location || null,
        description: description || null,
        startsAt,
        endsAt,
        signupDeadlineAt: deadline,
        allowPartner,
        allowChildren,
        allowGuestList,
        countedOwnerIds: [...countedOwnerIds]
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke gemme event");
      return;
    }

    router.refresh();
  };

  return (
    <div>
      <div className="form-grid">
        <label>
          Titel
          <input value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label>
          Sted
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
          />
        </label>
        <label>
          Start
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </label>
        <label>
          Slut
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </label>
        <label>
          Deadline
          <input
            type="datetime-local"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
        <label>
          Beskrivelse
          <textarea
            rows={3}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>
      </div>
      <div className={`companion-access ${allowPartner || allowChildren ? "is-enabled" : "is-disabled"}`} style={{ marginTop: 16 }}>
        <div>
          <span className="eyebrow">Fælles eventregel</span>
          <h3>Må gæster tage flere med?</h3>
          <p className="helper-text">Reglen gælder automatisk for alle eventets invitationer.</p>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={allowPartner} onChange={(inputEvent) => setAllowPartner(inputEvent.target.checked)} />
          <span><strong>Tillad én partner pr. invitation</strong><small>Hver gæst kan selv tilføje én partner ved navn.</small></span>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={allowChildren} onChange={(inputEvent) => setAllowChildren(inputEvent.target.checked)} />
          <span><strong>Tillad børn</strong><small>Gæster kan selv tilføje børn ved navn.</small></span>
        </label>
      </div>
      <div className={`companion-access ${allowGuestList ? "is-enabled" : "is-disabled"}`} style={{ marginTop: 16 }}>
        <div>
          <span className="eyebrow">Gæsternes synlighed</span>
          <h3>Kan gæster se hinanden?</h3>
          <p className="helper-text">Når reglen er aktiv, kan gæster se invitationsnavn og deltagelsesstatus for de andre gæster.</p>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={allowGuestList} onChange={(inputEvent) => setAllowGuestList(inputEvent.target.checked)} />
          <span><strong>Gæster kan se gæstelisten</strong><small>Viser kun navn og status — aldrig invitationslinks eller kostoplysninger.</small></span>
        </label>
      </div>
      <div className={`companion-access ${countedOwnerIds.size > 0 ? "is-enabled" : "is-disabled"}`} style={{ marginTop: 16 }}>
        <div>
          <span className="eyebrow">Eventejere som deltagere</span>
          <h3>Hvilke eventejere skal tælle med?</h3>
          <p className="helper-text">
            Valgte ejere tælles som voksne under hele eventet og til alle
            overlappende måltider.
          </p>
        </div>
        {owners.map((owner) => (
          <label className="checkbox-row" key={owner.id}>
            <input
              type="checkbox"
              checked={countedOwnerIds.has(owner.id)}
              onChange={(inputEvent) => {
                setCountedOwnerIds((current) => {
                  const next = new Set(current);
                  if (inputEvent.target.checked) next.add(owner.id);
                  else next.delete(owner.id);
                  return next;
                });
              }}
            />
            <span>
              <strong>{owner.name || owner.email}</strong>
              <small>{owner.email}</small>
            </span>
          </label>
        ))}
        <p className="helper-text">
          Har en ejer andre komme/gå-tider, skal ejeren ikke markeres her, men
          i stedet oprettes som almindelig gæst med et invitationslink.
        </p>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" onClick={save}>
          Gem event
        </button>
      </div>
    </div>
  );
}
