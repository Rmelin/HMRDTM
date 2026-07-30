"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  eventId: string;
  eventTitle: string;
  archived?: boolean;
};

export function EventArchiveButton({
  eventId,
  eventTitle,
  archived = false
}: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateArchiveState = async () => {
    if (
      !archived &&
      !window.confirm(
        `Arkivér "${eventTitle}"? Eventet forsvinder fra dashboardet, men gæster og øvrige data bevares.`
      )
    ) {
      return;
    }

    setPending(true);
    setError(null);
    const response = await fetch(`/api/events/${eventId}`, {
      method: archived ? "PUT" : "DELETE",
      headers: archived ? { "Content-Type": "application/json" } : undefined,
      body: archived ? JSON.stringify({ archived: false }) : undefined
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      setError(
        payload.error ??
          (archived ? "Kunne ikke gendanne eventet" : "Kunne ikke arkivere eventet")
      );
      setPending(false);
      return;
    }

    if (archived) {
      router.refresh();
    } else {
      router.push("/admin");
      router.refresh();
    }
  };

  return (
    <div>
      <button
        className={`button ${archived ? "ghost" : "danger"}`}
        disabled={pending}
        onClick={updateArchiveState}
        type="button"
      >
        {pending
          ? archived
            ? "Gendanner…"
            : "Arkiverer…"
          : archived
            ? "Gendan event"
            : "Arkivér event"}
      </button>
      {error ? <p className="error">{error}</p> : null}
    </div>
  );
}
