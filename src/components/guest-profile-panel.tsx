"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AnswerStatus = "yes" | "no" | "maybe";
type Status = AnswerStatus | "invited";
type DietType = "none" | "vegetarian" | "vegan" | "allergy" | "other";
type Person = { id: string; name: string; type: string; dietType: string | null; dietNotes: string | null };
type CompanionType = "partner" | "child";

const statusLabels: Record<AnswerStatus, string> = { yes: "Ja", maybe: "Måske", no: "Deltager ikke" };

export function GuestProfilePanel({
  token,
  displayName: initialDisplayName,
  eventStatus: initialEventStatus,
  allowPartner,
  allowChildren,
  people: initialPeople
}: {
  token: string;
  displayName: string;
  eventStatus: string;
  allowPartner: boolean;
  allowChildren: boolean;
  people: Person[];
}) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [eventStatus, setEventStatus] = useState<Status>(initialEventStatus as Status);
  const [people, setPeople] = useState(
    initialPeople.map((person) => ({
      ...person,
      dietType: (person.dietType ?? "none") as DietType,
      dietNotes: person.dietNotes ?? ""
    }))
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<CompanionType | null>(null);
  const [companionName, setCompanionName] = useState("");
  const [companionMessage, setCompanionMessage] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const hasPartner = people.some((person) => person.type === "partner");

  const updatePerson = (id: string, patch: Partial<(typeof people)[number]>) => {
    setPeople((current) =>
      current.map((person) => (person.id === id ? { ...person, ...patch } : person))
    );
  };

  const saveStatus = async (nextStatus: AnswerStatus) => {
    if (statusSaving || nextStatus === eventStatus) return;
    const previousStatus = eventStatus;
    setEventStatus(nextStatus);
    setStatusSaving(true);
    setStatusMessage(null);
    try {
      const response = await fetch(`/api/guest/${token}/event-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventStatus: nextStatus })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setEventStatus(previousStatus);
        setStatusMessage(body?.error ?? "Deltagelsesstatus kunne ikke gemmes");
        return;
      }
      setStatusMessage(
        body.affectedMeals > 0
          ? `Gemt automatisk · ${body.affectedMeals} måltid(er) markeret efter Svar senest`
          : "Deltagelsesstatus er gemt automatisk"
      );
      router.refresh();
    } catch {
      setEventStatus(previousStatus);
      setStatusMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setStatusSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const response = await fetch(`/api/guest/${token}/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, eventStatus, people })
    });
    const body = await response.json();
    setSaving(false);
    if (!response.ok) {
      setMessage(body.error ?? "Kunne ikke gemme profilen");
      return;
    }
    setMessage(
      body.affectedMeals > 0
        ? `Gemt · ${body.affectedMeals} måltid(er) markeret efter Svar senest`
        : "Profilen er gemt"
    );
    router.refresh();
  };

  const addCompanion = async () => {
    if (!addingType) return;
    setAdding(true);
    setCompanionMessage(null);
    try {
      const response = await fetch(`/api/guest/${token}/people`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companionName, type: addingType })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setCompanionMessage(body?.error ?? "Kunne ikke tilføje personen");
        return;
      }
      setPeople((current) => [...current, { ...body.person, dietType: "none", dietNotes: "" }]);
      setCompanionName("");
      setAddingType(null);
      setCompanionMessage(`${body.person.name} er tilføjet`);
      router.refresh();
    } catch {
      setCompanionMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setAdding(false);
    }
  };

  const removeCompanion = async (person: (typeof people)[number]) => {
    if (!window.confirm(`Fjern ${person.name} fra invitationen?`)) return;
    const response = await fetch(`/api/guest/${token}/people`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: person.id })
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) {
      setCompanionMessage(body?.error ?? "Kunne ikke fjerne personen");
      return;
    }
    setPeople((current) => current.filter((item) => item.id !== person.id));
    setCompanionMessage(`${person.name} er fjernet`);
    router.refresh();
  };

  return (
    <div className="guest-profile-sections">
      <section className="subcard guest-status-section">
        <div className="guest-profile-section-heading">
          <div><span className="eyebrow">Deltagelsesstatus</span><h3>Deltager du i eventet?</h3></div>
          <span className="badge accent">Gemmes automatisk</span>
        </div>
        <div className="segmented" role="group" aria-label="Deltagelse i event">
          {(Object.keys(statusLabels) as AnswerStatus[]).map((status) => (
            <button
              key={status}
              type="button"
              className={eventStatus === status ? "is-selected" : ""}
              disabled={statusSaving}
              onClick={() => void saveStatus(status)}
            >
              {statusLabels[status]}
            </button>
          ))}
        </div>
        {eventStatus === "invited" ? <p className="form-message" style={{ marginTop: 8 }}>Du har ikke svaret på invitationen endnu.</p> : null}
        {statusMessage ? <p className={statusMessage.includes("gemt") || statusMessage.includes("Gemt") ? "success compact-message" : "error compact-message"}>{statusMessage}</p> : null}
      </section>

      <section className="subcard stack guest-details-section">
        <div className="guest-profile-section-heading">
          <div><span className="eyebrow">Profil og medfølgende</span><h3>Navn, kost og partner/børn</h3></div>
          <span className="badge">Gem med knappen nederst</span>
        </div>
        <label>
          <span className="field-label">Dit displaynavn</span>
          <input
            value={displayName}
            maxLength={80}
            onChange={(event) => setDisplayName(event.target.value)}
            placeholder="Det navn de andre ser"
          />
        </label>
        <div className={`companion-access ${allowPartner || allowChildren ? "is-enabled" : "is-disabled"}`}>
        <div className="item-heading">
          <div>
            <span className="eyebrow">Flere deltagere</span>
            <h3>{allowPartner || allowChildren ? "Du må tilføje flere til invitationen" : "Invitationen kan ikke udvides"}</h3>
          </div>
          <span className={`badge ${allowPartner || allowChildren ? "accent" : ""}`}>
            {allowPartner || allowChildren ? "Tilladt" : "Ikke tilladt"}
          </span>
        </div>
        {allowPartner || allowChildren ? (
          <>
            <p className="helper-text">
              {allowPartner && allowChildren
                ? "Du kan tilføje én partner og børn ved navn."
                : allowPartner
                  ? "Du kan tilføje én partner ved navn."
                  : "Du kan tilføje børn ved navn."}
            </p>
            <div className="button-row">
              {allowPartner && !hasPartner ? <button className="button ghost" type="button" onClick={() => { setAddingType("partner"); setCompanionName(""); }}>＋ Tilføj partner</button> : null}
              {allowPartner && hasPartner ? <span className="badge">✓ Partner tilføjet</span> : null}
              {allowChildren ? <button className="button ghost" type="button" onClick={() => { setAddingType("child"); setCompanionName(""); }}>＋ Tilføj barn</button> : null}
            </div>
            {addingType ? (
              <div className="companion-form">
                <label>
                  <span className="field-label">{addingType === "partner" ? "Partners navn" : "Barnets navn"}</span>
                  <input autoFocus value={companionName} maxLength={80} onChange={(event) => setCompanionName(event.target.value)} placeholder="Skriv navn" />
                </label>
                <div className="button-row" style={{ marginTop: 0 }}>
                  <button className="button" type="button" disabled={adding || !companionName.trim()} onClick={addCompanion}>{adding ? "Tilføjer…" : `Tilføj ${addingType === "partner" ? "partner" : "barn"}`}</button>
                  <button className="button ghost" type="button" disabled={adding} onClick={() => setAddingType(null)}>Annuller</button>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <p className="helper-text">Kontakt den, der har inviteret dig, hvis du har brug for at tage partner eller børn med.</p>
        )}
        {companionMessage ? <p className="form-message">{companionMessage}</p> : null}
        </div>
        {people.map((person) => (
          <div className="subcard stack" key={person.id}>
          <div className="item-heading">
            <strong>{person.type === "partner" ? "Partner" : person.type === "child" ? "Barn" : "Inviteret"}</strong>
            {person.type === "partner" || person.type === "child" ? <button className="button danger" type="button" onClick={() => void removeCompanion(person)}>Fjern</button> : null}
          </div>
          <label>
            <span className="field-label">Navn</span>
            <input value={person.name} maxLength={80} onChange={(event) => updatePerson(person.id, { name: event.target.value })} />
          </label>
          <label>
            <span className="field-label">Kosttype</span>
            <select value={person.dietType} onChange={(event) => updatePerson(person.id, { dietType: event.target.value as DietType })}>
              <option value="none">Ingen særlige hensyn</option>
              <option value="vegetarian">Vegetar</option>
              <option value="vegan">Veganer</option>
              <option value="allergy">Allergi</option>
              <option value="other">Andet</option>
            </select>
          </label>
          <label>
            <span className="field-label">Kostnote eller præference</span>
            <textarea rows={2} maxLength={500} value={person.dietNotes} onChange={(event) => updatePerson(person.id, { dietNotes: event.target.value })} placeholder="Fx nøddeallergi eller ingen tomat" />
          </label>
          </div>
        ))}
        {message ? <p className="form-message">{message}</p> : null}
        <button className="button" type="button" onClick={save} disabled={saving}>
          {saving ? "Gemmer…" : "Gem navn og kostoplysninger"}
        </button>
      </section>
    </div>
  );
}
