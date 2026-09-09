"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AnswerStatus = "yes" | "no" | "maybe";
type Status = AnswerStatus | "invited";

const statusLabels: Record<AnswerStatus, string> = {
  yes: "Ja",
  maybe: "Måske",
  no: "Deltager ikke"
};

export function GuestStatusPanel({
  token,
  initialStatus
}: {
  token: string;
  initialStatus: string;
}) {
  const router = useRouter();
  const [eventStatus, setEventStatus] = useState<Status>(initialStatus as Status);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const saveStatus = async (nextStatus: AnswerStatus) => {
    if (saving || nextStatus === eventStatus) return;

    const previousStatus = eventStatus;
    setEventStatus(nextStatus);
    setSaving(true);
    setMessage(null);

    try {
      const response = await fetch(`/api/guest/${token}/event-status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventStatus: nextStatus })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setEventStatus(previousStatus);
        setMessage(body?.error ?? "Deltagelsesstatus kunne ikke gemmes");
        return;
      }
      setMessage(
        body.affectedMeals > 0
          ? `Gemt automatisk · ${body.affectedMeals} måltid(er) markeret efter Svar senest`
          : "Deltagelsesstatus er gemt automatisk"
      );
      router.refresh();
    } catch {
      setEventStatus(previousStatus);
      setMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="guest-rsvp-panel" aria-labelledby="guest-rsvp-title">
      <div className="guest-rsvp-heading">
        <div>
          <span className="eyebrow">Deltagelsesstatus</span>
          <h2 id="guest-rsvp-title">Deltager du?</h2>
        </div>
        <span className="badge accent">Gemmes automatisk</span>
      </div>
      <div className="segmented" role="group" aria-label="Deltagelse i event">
        {(Object.keys(statusLabels) as AnswerStatus[]).map((status) => (
          <button
            key={status}
            type="button"
            className={eventStatus === status ? "is-selected" : ""}
            disabled={saving}
            aria-pressed={eventStatus === status}
            onClick={() => void saveStatus(status)}
          >
            {statusLabels[status]}
          </button>
        ))}
      </div>
      {eventStatus === "invited" ? (
        <p className="form-message">Vælg en status for at svare på invitationen.</p>
      ) : null}
      {message ? (
        <p className={message.includes("gemt") || message.includes("Gemt") ? "success compact-message" : "error compact-message"}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
