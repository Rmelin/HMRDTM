"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type User = { id: string; name: string; email: string };

export function EventOwnersForm({ eventId, owners, availableUsers }: { eventId: string; owners: User[]; availableUsers: User[] }) {
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
      <p className="helper-text">Alle eventejere kan redigere eventet, invitere gæster og se gæstelisten.</p>
      <div className="list">
        {owners.map((owner) => (
          <div className="list-item" key={owner.id}>
            <div className="item-heading"><div><strong>{owner.name || owner.email}</strong><div className="muted">{owner.email}</div></div><span className="badge accent">Ejer</span></div>
            {owners.length > 1 ? <button className="button danger" onClick={() => update("DELETE", owner.id)}>Fjern som ejer</button> : null}
          </div>
        ))}
      </div>
      {availableUsers.length ? (
        <div className="button-row">
          <select value={userId} onChange={(event) => setUserId(event.target.value)}>
            {availableUsers.map((user) => <option value={user.id} key={user.id}>{user.name || user.email} · {user.email}</option>)}
          </select>
          <button className="button" disabled={!userId} onClick={() => update("POST", userId)}>Tilføj medejer</button>
        </div>
      ) : <p className="muted">Alle brugere er allerede tilknyttet eventet.</p>}
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
