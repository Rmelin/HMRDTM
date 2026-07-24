"use client";

import { useState } from "react";

import { formatDateTime, formatTime } from "@/lib/datetime";

type Meal = { id: string; name: string; startsAt: number; endsAt: number; cutoffAt: number };
type Person = { id: string; name: string; type: string };
type Response = { personId: string; mealId: string; status: string };
type Status = "yes" | "no" | "maybe";

const labels: Record<Status, string> = { yes: "Ja", maybe: "Måske", no: "Nej" };

export function GuestMealsPanel({
  token,
  meals,
  people,
  responses,
  eventStatus
}: {
  token: string;
  meals: Meal[];
  people: Person[];
  responses: Response[];
  eventStatus: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [responseMap, setResponseMap] = useState(
    () => new Map(responses.map((response) => [`${response.personId}:${response.mealId}`, response.status]))
  );

  const setStatus = async (mealId: string, personId: string, status: Status | "default") => {
    setError(null);
    const response = await fetch(`/api/guest/${token}/meals/${mealId}/response`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ personId, status })
    });
    if (!response.ok) {
      const payload = await response.json();
      setError(payload.error ?? "Kunne ikke gemme svar");
      return;
    }
    setResponseMap((current) => {
      const next = new Map(current);
      if (status === "default") next.delete(`${personId}:${mealId}`);
      else next.set(`${personId}:${mealId}`, status);
      return next;
    });
  };

  if (meals.length === 0) return <div className="empty-state">Ingen måltider endnu.</div>;

  return (
    <div className="stack">
      <div className="meal-default-explainer">
        <strong>Du behøver ikke svare på hvert måltid</strong>
        <p className="helper-text">Alle på invitationen følger som udgangspunkt dit eventsvar og dine komme/gå-tider. Vælg kun et måltidssvar, hvis en person deltager anderledes.</p>
      </div>
      {error ? <p className="error">{error}</p> : null}
      {meals.map((meal) => (
        <article key={meal.id} className="subcard stack">
          <div className="item-heading">
            <div>
              <h3>{meal.name}</h3>
              <span className="muted">{formatDateTime(meal.startsAt)} – {formatTime(meal.endsAt)}</span>
            </div>
            <span className={`badge ${Date.now() > meal.cutoffAt ? "warning" : ""}`}>
              {Date.now() > meal.cutoffAt ? "Svar senest er passeret" : `Svar senest ${formatDateTime(meal.cutoffAt)}`}
            </span>
          </div>
          {people.map((person) => {
            const key = `${person.id}:${meal.id}`;
            const current = (responseMap.get(key) as Status | undefined) ?? null;
            return (
              <div key={key} className="meal-person">
                <div className="item-heading">
                  <strong>{person.name}</strong>
                  <span className={`badge ${!current && eventStatus === "yes" ? "accent" : ""}`}>
                    {current ? `Afvigelse: ${labels[current]}` : eventStatus === "invited" ? "Afventer eventsvar" : `Følger event: ${labels[eventStatus as Status]}`}
                  </span>
                </div>
                <div className="segmented meal-response-segmented" role="group" aria-label={`Svar for ${person.name}`}>
                  <button type="button" className={current === null ? "is-selected" : ""} onClick={() => setStatus(meal.id, person.id, "default")}>Følg event</button>
                  {(Object.keys(labels) as Status[]).map((status) => (
                    <button key={status} type="button" className={current === status ? "is-selected" : ""} onClick={() => setStatus(meal.id, person.id, status)}>
                      {labels[status]}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </article>
      ))}
    </div>
  );
}
