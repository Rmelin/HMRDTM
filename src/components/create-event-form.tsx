"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateEventForm() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [allowPartner, setAllowPartner] = useState(false);
  const [allowChildren, setAllowChildren] = useState(false);
  const [allowGuestList, setAllowGuestList] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const response = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        location: location || undefined,
        startsAt,
        endsAt: endsAt || undefined,
        signupDeadlineAt: deadline || undefined,
        description: description || undefined,
        allowPartner,
        allowChildren,
        allowGuestList
      })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke oprette event");
      return;
    }

    setTitle("");
    setLocation("");
    setStartsAt("");
    setEndsAt("");
    setDeadline("");
    setDescription("");
    setAllowPartner(false);
    setAllowChildren(false);
    setAllowGuestList(true);
    router.refresh();
  };

  return (
    <section>
      <h2>Opret event</h2>
      <div className="form-grid">
        <label>
          Titel
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
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
          Slut (valgfri)
          <input
            type="datetime-local"
            value={endsAt}
            onChange={(event) => setEndsAt(event.target.value)}
          />
        </label>
        <label>
          Deadline (valgfri)
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
          <p className="helper-text">Valget gælder for alle invitationer til eventet.</p>
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
          <p className="helper-text">Denne mulighed er slået til som standard.</p>
        </div>
        <label className="checkbox-row">
          <input type="checkbox" checked={allowGuestList} onChange={(inputEvent) => setAllowGuestList(inputEvent.target.checked)} />
          <span><strong>Gæster kan se gæstelisten</strong><small>Viser kun invitationsnavn og deltagelsesstatus.</small></span>
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" onClick={submit}>
          Opret
        </button>
      </div>
    </section>
  );
}
