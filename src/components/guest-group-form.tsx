"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GuestGroupForm({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    const response = await fetch(`/api/events/${eventId}/guest-groups`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName })
    });

    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke oprette gæstegruppe");
      return;
    }

    setDisplayName("");
    router.refresh();
  };

  return (
    <div>
      <h3>Opret gæst / invitation</h3>
      <div className="form-grid">
        <label>
          Navn (kan udfyldes senere)
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
        </label>
      </div>
      {error ? <p className="error">{error}</p> : null}
      <div className="button-row">
        <button className="button" onClick={submit}>
          Opret og generér link
        </button>
      </div>
    </div>
  );
}
