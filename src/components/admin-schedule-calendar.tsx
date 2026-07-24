"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ScheduleCalendarGrid } from "@/components/schedule-calendar-grid";
import {
  formatDateTime,
  formatLocalDate,
  parseDateTimeInput,
  toLocalDateTimeInput
} from "@/lib/datetime";
import {
  validateEventItemWindow,
  validateMealWindow
} from "@/lib/meal-window";
import { ScheduleItem, ScheduleItemType } from "@/lib/schedule";

type CalendarMeal = {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  cutoffAt: number;
  description: string | null;
};

type ProgramItem = {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  description: string | null;
  isVisible: boolean;
};

type EventWindow = {
  id: string;
  startsAt: number;
  endsAt: number;
  signupDeadlineAt: number;
};

type Draft = {
  id: string | null;
  type: ScheduleItemType;
  name: string;
  startsAt: string;
  endsAt: string;
  cutoffAt: string;
  description: string;
  isVisible: boolean;
};

export function AdminScheduleCalendar({
  event,
  meals,
  programItems
}: {
  event: EventWindow;
  meals: CalendarMeal[];
  programItems: ProgramItem[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const calendarItems = useMemo<ScheduleItem[]>(
    () => [
      ...meals.map((meal) => ({
        id: meal.id,
        type: "meal" as const,
        name: meal.name,
        startsAt: meal.startsAt,
        endsAt: meal.endsAt
      })),
      ...programItems.map((item) => ({
        id: item.id,
        type: "program" as const,
        name: item.name,
        startsAt: item.startsAt,
        endsAt: item.endsAt,
        isHidden: !item.isVisible
      }))
    ],
    [meals, programItems]
  );

  function openCreate(startsAt: number, endsAt: number) {
    setDraft({
      id: null,
      type: "meal",
      name: "",
      startsAt: toLocalDateTimeInput(startsAt),
      endsAt: toLocalDateTimeInput(endsAt),
      cutoffAt: toLocalDateTimeInput(event.signupDeadlineAt),
      description: "",
      isVisible: true
    });
    setError(null);
  }

  function openEdit(item: ScheduleItem) {
    if (item.type === "meal") {
      const meal = meals.find((candidate) => candidate.id === item.id);
      if (!meal) return;
      setDraft({
        id: meal.id,
        type: "meal",
        name: meal.name,
        startsAt: toLocalDateTimeInput(meal.startsAt),
        endsAt: toLocalDateTimeInput(meal.endsAt),
        cutoffAt: toLocalDateTimeInput(meal.cutoffAt),
        description: meal.description ?? "",
        isVisible: true
      });
    } else {
      const programItem = programItems.find(
        (candidate) => candidate.id === item.id
      );
      if (!programItem) return;
      setDraft({
        id: programItem.id,
        type: "program",
        name: programItem.name,
        startsAt: toLocalDateTimeInput(programItem.startsAt),
        endsAt: toLocalDateTimeInput(programItem.endsAt),
        cutoffAt: toLocalDateTimeInput(event.signupDeadlineAt),
        description: programItem.description ?? "",
        isVisible: programItem.isVisible
      });
    }
    setError(null);
  }

  async function save() {
    if (!draft) return;
    setError(null);
    const startsAt = parseDateTimeInput(draft.startsAt);
    const endsAt = parseDateTimeInput(draft.endsAt);
    const windowError =
      draft.type === "meal"
        ? validateMealWindow({ startsAt, endsAt }, event)
        : validateEventItemWindow(
            { startsAt, endsAt },
            event,
            "Programpunktet"
          );
    if (!draft.name.trim()) {
      setError(
        draft.type === "meal"
          ? "Skriv et navn til måltidet"
          : "Skriv et navn til programpunktet"
      );
      return;
    }
    if (windowError) {
      setError(windowError);
      return;
    }

    const isMeal = draft.type === "meal";
    const url = draft.id
      ? isMeal
        ? `/api/meals/${draft.id}`
        : `/api/program-items/${draft.id}`
      : isMeal
        ? `/api/events/${event.id}/meals`
        : `/api/events/${event.id}/program-items`;

    setSaving(true);
    try {
      const response = await fetch(url, {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isMeal
            ? {
                name: draft.name.trim(),
                date: formatLocalDate(startsAt),
                startsAt: draft.startsAt,
                endsAt: draft.endsAt,
                cutoffAt: draft.cutoffAt || undefined,
                description: draft.description || (draft.id ? null : undefined)
              }
            : {
                name: draft.name.trim(),
                startsAt: draft.startsAt,
                endsAt: draft.endsAt,
                description: draft.description || (draft.id ? null : undefined),
                isVisible: draft.isVisible
              }
        )
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(
          payload?.error ??
            (isMeal
              ? "Kunne ikke gemme måltidet"
              : "Kunne ikke gemme programpunktet")
        );
        return;
      }
      setDraft(null);
      router.refresh();
    } catch {
      setError("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!draft?.id) return;
    const isMeal = draft.type === "meal";
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(
        isMeal
          ? `/api/meals/${draft.id}`
          : `/api/program-items/${draft.id}`,
        { method: "DELETE" }
      );
      if (!response.ok) {
        setError(
          isMeal
            ? "Kunne ikke slette måltidet"
            : "Kunne ikke slette programpunktet"
        );
        return;
      }
      setDraft(null);
      router.refresh();
    } catch {
      setError("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="meal-calendar-shell">
      <div className="item-heading">
        <div>
          <h3>Samlet kalender</h3>
          <p className="helper-text">
            Klik for én time, eller træk for at vælge start og slut. Vælg
            derefter, om punktet er et måltid eller et programpunkt.
          </p>
        </div>
        <span className="badge accent">15 min. trin</span>
      </div>
      <div className="calendar-legend" aria-label="Kalenderforklaring">
        <span><i className="legend-swatch meal" /> Måltid</span>
        <span><i className="legend-swatch program" /> Program</span>
        <span><i className="legend-swatch hidden" /> Skjult program</span>
      </div>

      <ScheduleCalendarGrid
        eventStartsAt={event.startsAt}
        eventEndsAt={event.endsAt}
        items={calendarItems}
        onCreateRange={openCreate}
        onItemClick={openEdit}
      />

      {draft ? (
        <div className="calendar-editor subcard">
          <div className="item-heading">
            <div>
              <span className="eyebrow">
                {draft.id ? "Redigér" : "Nyt kalenderpunkt"}
              </span>
              <h3>{draft.id ? draft.name : "Tilføj oplysninger"}</h3>
            </div>
            <button
              className="icon-button"
              onClick={() => setDraft(null)}
              type="button"
              aria-label="Luk editor"
            >
              ×
            </button>
          </div>
          <div className="form-grid">
            <label>
              Type
              <select
                value={draft.type}
                disabled={Boolean(draft.id)}
                onChange={(inputEvent) =>
                  setDraft({
                    ...draft,
                    type: inputEvent.target.value as ScheduleItemType
                  })
                }
              >
                <option value="meal">Måltid</option>
                <option value="program">Programpunkt</option>
              </select>
            </label>
            <label>
              Navn
              <input
                autoFocus
                value={draft.name}
                onChange={(inputEvent) =>
                  setDraft({ ...draft, name: inputEvent.target.value })
                }
              />
            </label>
            <label>
              Start
              <input
                type="datetime-local"
                min={toLocalDateTimeInput(event.startsAt)}
                max={toLocalDateTimeInput(event.endsAt)}
                value={draft.startsAt}
                onChange={(inputEvent) =>
                  setDraft({ ...draft, startsAt: inputEvent.target.value })
                }
              />
            </label>
            <label>
              Slut
              <input
                type="datetime-local"
                min={toLocalDateTimeInput(event.startsAt)}
                max={toLocalDateTimeInput(event.endsAt)}
                value={draft.endsAt}
                onChange={(inputEvent) =>
                  setDraft({ ...draft, endsAt: inputEvent.target.value })
                }
              />
            </label>
            {draft.type === "meal" ? (
              <label>
                Svar senest
                <input
                  type="datetime-local"
                  value={draft.cutoffAt}
                  onChange={(inputEvent) =>
                    setDraft({ ...draft, cutoffAt: inputEvent.target.value })
                  }
                />
              </label>
            ) : (
              <label className="checkbox-label">
                Synlig for gæster
                <input
                  type="checkbox"
                  checked={draft.isVisible}
                  onChange={(inputEvent) =>
                    setDraft({ ...draft, isVisible: inputEvent.target.checked })
                  }
                />
              </label>
            )}
            <label>
              Beskrivelse
              <textarea
                rows={2}
                value={draft.description}
                onChange={(inputEvent) =>
                  setDraft({ ...draft, description: inputEvent.target.value })
                }
              />
            </label>
          </div>
          <p className="helper-text">
            Punktet skal ligge mellem {formatDateTime(event.startsAt)} og{" "}
            {formatDateTime(event.endsAt)}.
          </p>
          {error ? <p className="error">{error}</p> : null}
          <div className="button-row">
            <button
              className="button"
              disabled={saving}
              onClick={save}
              type="button"
            >
              {saving
                ? "Gemmer…"
                : draft.id
                  ? "Gem ændringer"
                  : draft.type === "meal"
                    ? "Opret måltid"
                    : "Opret programpunkt"}
            </button>
            {draft.id ? (
              <button
                className="button danger"
                disabled={saving}
                onClick={remove}
                type="button"
              >
                Slet
              </button>
            ) : null}
            <button
              className="button ghost"
              onClick={() => setDraft(null)}
              type="button"
            >
              Annuller
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
