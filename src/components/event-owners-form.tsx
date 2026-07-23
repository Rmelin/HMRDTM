"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  contactPhone: string | null;
  shareEmail: boolean;
  sharePhone: boolean;
};

function OwnerRow({
  eventId,
  owner,
  isCurrentUser,
  canRemove,
  onRemove
}: {
  eventId: string;
  owner: User;
  isCurrentUser: boolean;
  canRemove: boolean;
  onRemove: () => void;
}) {
  const router = useRouter();
  const [contactPhone, setContactPhone] = useState(owner.contactPhone ?? "");
  const [shareEmail, setShareEmail] = useState(owner.shareEmail);
  const [sharePhone, setSharePhone] = useState(owner.sharePhone);
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveContact() {
    setMessage(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/events/${eventId}/owners`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: owner.id,
          contactPhone,
          shareEmail,
          sharePhone
        })
      });
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(result?.error ?? "Kontaktvalgene kunne ikke gemmes");
        return;
      }
      setMessage("Kontaktvalgene er gemt");
      router.refresh();
    } catch {
      setMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="list-item">
      <div className="item-heading">
        <div><strong>{owner.name || owner.email}</strong><div className="muted">{owner.email}</div></div>
        <div className="tag-row" style={{ marginTop: 0 }}>
          <span className="badge accent">Ejer</span>
          {owner.shareEmail ? <span className="badge">Deler e-mail</span> : null}
          {owner.sharePhone ? <span className="badge">Deler telefon</span> : null}
        </div>
      </div>
      {isCurrentUser ? (
        <div className={`companion-access ${shareEmail || sharePhone ? "is-enabled" : "is-disabled"}`}>
          <div>
            <span className="eyebrow">Din kontaktprofil</span>
            <h3>Frivillig deling i telefonbogen</h3>
            <p className="helper-text">
              Valgte oplysninger vises til alle med et gyldigt gæstelink til dette event.
            </p>
          </div>
          <label>
            <span className="field-label">Telefon</span>
            <input
              type="tel"
              value={contactPhone}
              maxLength={30}
              onChange={(event) => {
                setContactPhone(event.target.value);
                if (!event.target.value.trim()) setSharePhone(false);
              }}
              placeholder="+45 12 34 56 78"
            />
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={shareEmail}
              onChange={(event) => setShareEmail(event.target.checked)}
            />
            <span><strong>Del min konto-e-mail</strong><small>{owner.email}</small></span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={sharePhone}
              disabled={!contactPhone.trim()}
              onChange={(event) => setSharePhone(event.target.checked)}
            />
            <span><strong>Del mit telefonnummer</strong><small>Vises i telefonbogen for dette event.</small></span>
          </label>
          <button className="button ghost" type="button" disabled={saving} onClick={saveContact}>
            {saving ? "Gemmer…" : "Gem kontaktvalg"}
          </button>
          {message ? <p className={message.includes("gemt") ? "success" : "error"}>{message}</p> : null}
        </div>
      ) : (
        <p className="helper-text">Kun {owner.name || owner.email} kan ændre denne kontaktprofil.</p>
      )}
      {canRemove ? <button className="button danger" type="button" onClick={onRemove}>Fjern som ejer</button> : null}
    </div>
  );
}

export function EventOwnersForm({
  eventId,
  owners,
  availableUsers,
  currentUserId
}: {
  eventId: string;
  owners: User[];
  availableUsers: Array<Pick<User, "id" | "name" | "email">>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [userId, setUserId] = useState(availableUsers[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  async function update(method: "POST" | "DELETE", selectedUserId: string) {
    setError(null);
    const response = await fetch(`/api/events/${eventId}/owners`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: selectedUserId })
    });
    const result = await response.json();
    if (!response.ok) return setError(result.error ?? "Kunne ikke ændre eventejere");
    router.refresh();
  }

  return (
    <div>
      <p className="helper-text">
        Alle eventejere kan redigere eventet. Hver eventejer styrer selv, om e-mail eller telefon deles med gæsterne.
      </p>
      <div className="list">
        {owners.map((owner) => (
          <OwnerRow
            key={owner.id}
            eventId={eventId}
            owner={owner}
            isCurrentUser={owner.id === currentUserId}
            canRemove={owners.length > 1}
            onRemove={() => update("DELETE", owner.id)}
          />
        ))}
      </div>
      {availableUsers.length ? (
        <div className="button-row">
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            {availableUsers.map((user) => (
              <option value={user.id} key={user.id}>{user.name || user.email} · {user.email}</option>
            ))}
          </select>
          <button className="button" disabled={!userId} onClick={() => update("POST", userId)}>
            Tilføj medejer
          </button>
        </div>
      ) : <p className="muted">Alle brugere er allerede tilknyttet eventet.</p>}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
