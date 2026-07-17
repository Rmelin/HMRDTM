"use client";

import { PointerEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { toLocalDateTimeInput } from "@/lib/datetime";
import { validateMealWindow } from "@/lib/meal-window";

type CalendarMeal = {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
  cutoffAt: number;
  description: string | null;
};

type EventWindow = {
  id: string;
  startsAt: number;
  endsAt: number;
  signupDeadlineAt: number;
};

type Draft = {
  id: string | null;
  name: string;
  startsAt: string;
  endsAt: string;
  cutoffAt: string;
  description: string;
};

type Selection = { dayStart: number; anchorMinute: number; currentMinute: number };

const DAY_MINUTES = 24 * 60;
const PIXELS_PER_MINUTE = 0.5;
const SNAP_MINUTES = 15;

function localDayStart(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

function addLocalDays(value: number, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

function minutesAfterDayStart(value: number, dayStart: number) {
  return Math.round((value - dayStart) / 60_000);
}

function snapMinute(value: number) {
  return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
}

function dateForApi(value: number) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function MealCalendar({ event, meals }: { event: EventWindow; meals: CalendarMeal[] }) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const days = useMemo(() => {
    const result: number[] = [];
    const firstDay = localDayStart(event.startsAt);
    const lastDay = localDayStart(event.endsAt);
    for (let day = firstDay; day <= lastDay; day = addLocalDays(day, 1)) result.push(day);
    return result;
  }, [event.endsAt, event.startsAt]);

  const openCreate = (startsAt: number, endsAt: number) => {
    setDraft({
      id: null,
      name: "",
      startsAt: toLocalDateTimeInput(startsAt),
      endsAt: toLocalDateTimeInput(endsAt),
      cutoffAt: toLocalDateTimeInput(event.signupDeadlineAt),
      description: ""
    });
    setError(null);
  };

  const openEdit = (meal: CalendarMeal) => {
    setDraft({
      id: meal.id,
      name: meal.name,
      startsAt: toLocalDateTimeInput(meal.startsAt),
      endsAt: toLocalDateTimeInput(meal.endsAt),
      cutoffAt: toLocalDateTimeInput(meal.cutoffAt),
      description: meal.description ?? ""
    });
    setError(null);
  };

  const minuteFromPointer = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    const bounds = pointerEvent.currentTarget.getBoundingClientRect();
    const minute = snapMinute((pointerEvent.clientY - bounds.top) / PIXELS_PER_MINUTE);
    return Math.max(0, Math.min(DAY_MINUTES, minute));
  };

  const validMinutesForDay = (dayStart: number) => ({
    start: Math.max(0, minutesAfterDayStart(event.startsAt, dayStart)),
    end: Math.min(DAY_MINUTES, minutesAfterDayStart(event.endsAt, dayStart))
  });

  const pointerDown = (pointerEvent: PointerEvent<HTMLDivElement>, dayStart: number) => {
    if (pointerEvent.button !== 0) return;
    const minute = minuteFromPointer(pointerEvent);
    const valid = validMinutesForDay(dayStart);
    if (minute < valid.start || minute >= valid.end) return;
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    setSelection({ dayStart, anchorMinute: minute, currentMinute: minute });
    setDidDrag(false);
    setError(null);
  };

  const pointerMove = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (!selection) return;
    const minute = minuteFromPointer(pointerEvent);
    const valid = validMinutesForDay(selection.dayStart);
    const boundedMinute = Math.max(valid.start, Math.min(valid.end, minute));
    if (boundedMinute !== selection.anchorMinute) setDidDrag(true);
    setSelection((current) => current ? { ...current, currentMinute: boundedMinute } : null);
  };

  const pointerUp = (pointerEvent: PointerEvent<HTMLDivElement>) => {
    if (!selection) return;
    const valid = validMinutesForDay(selection.dayStart);
    const firstMinute = Math.min(selection.anchorMinute, selection.currentMinute);
    const lastMinute = Math.max(selection.anchorMinute, selection.currentMinute);
    const startMinute = Math.max(valid.start, firstMinute);
    const endMinute = didDrag
      ? Math.min(valid.end, Math.max(startMinute + SNAP_MINUTES, lastMinute))
      : Math.min(valid.end, startMinute + 60);
    pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    setSelection(null);
    openCreate(selection.dayStart + startMinute * 60_000, selection.dayStart + endMinute * 60_000);
  };

  const save = async () => {
    if (!draft) return;
    setError(null);
    const startsAt = new Date(draft.startsAt).getTime();
    const endsAt = new Date(draft.endsAt).getTime();
    const windowError = validateMealWindow({ startsAt, endsAt }, event);
    if (!draft.name.trim()) return setError("Skriv et navn til måltidet");
    if (windowError) return setError(windowError);

    setSaving(true);
    const response = await fetch(
      draft.id ? `/api/meals/${draft.id}` : `/api/events/${event.id}/meals`,
      {
        method: draft.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          date: dateForApi(startsAt),
          startsAt: draft.startsAt,
          endsAt: draft.endsAt,
          cutoffAt: draft.cutoffAt || undefined,
          description: draft.description || (draft.id ? null : undefined)
        })
      }
    );
    const payload = await response.json();
    setSaving(false);
    if (!response.ok) return setError(payload.error ?? "Kunne ikke gemme måltidet");
    setDraft(null);
    router.refresh();
  };

  const remove = async () => {
    if (!draft?.id) return;
    setSaving(true);
    const response = await fetch(`/api/meals/${draft.id}`, { method: "DELETE" });
    setSaving(false);
    if (!response.ok) return setError("Kunne ikke slette måltidet");
    setDraft(null);
    router.refresh();
  };

  const selectionStyle = selection ? {
    top: Math.min(selection.anchorMinute, selection.currentMinute) * PIXELS_PER_MINUTE,
    height: Math.max(SNAP_MINUTES, Math.abs(selection.currentMinute - selection.anchorMinute)) * PIXELS_PER_MINUTE
  } : null;

  return (
    <div className="meal-calendar-shell">
      <div className="item-heading">
        <div>
          <h3>Vælg tid i kalenderen</h3>
          <p className="helper-text">Klik for 1 time, eller træk for at vælge start og slut. Klik på et måltid for at redigere.</p>
        </div>
        <span className="badge accent">15 min. trin</span>
      </div>

      <div className="meal-calendar-scroll">
        <div className="meal-calendar" style={{ gridTemplateColumns: `54px repeat(${days.length}, minmax(150px, 1fr))` }}>
          <div className="calendar-corner" />
          {days.map((dayStart) => (
            <div className="calendar-day-title" key={`title-${dayStart}`}>
              <strong>{new Date(dayStart).toLocaleDateString("da-DK", { weekday: "short" })}</strong>
              <span>{new Date(dayStart).toLocaleDateString("da-DK", { day: "numeric", month: "short" })}</span>
            </div>
          ))}

          <div className="calendar-times" aria-hidden="true">
            {Array.from({ length: 24 }, (_, hour) => (
              <span key={hour} style={{ top: hour * 60 * PIXELS_PER_MINUTE }}>{String(hour).padStart(2, "0")}:00</span>
            ))}
          </div>

          {days.map((dayStart) => {
            const valid = validMinutesForDay(dayStart);
            return (
              <div
                className="calendar-day-column"
                key={dayStart}
                onPointerDown={(pointerEvent) => pointerDown(pointerEvent, dayStart)}
                onPointerMove={pointerMove}
                onPointerUp={pointerUp}
              >
                {valid.start > 0 ? <div className="calendar-locked" style={{ top: 0, height: valid.start * PIXELS_PER_MINUTE }} /> : null}
                {valid.end < DAY_MINUTES ? <div className="calendar-locked" style={{ top: valid.end * PIXELS_PER_MINUTE, bottom: 0 }} /> : null}
                {meals.filter((meal) => localDayStart(meal.startsAt) === dayStart).map((meal) => {
                  const startMinute = minutesAfterDayStart(meal.startsAt, dayStart);
                  const endMinute = Math.min(DAY_MINUTES, minutesAfterDayStart(meal.endsAt, dayStart));
                  return (
                    <button
                      className="calendar-meal"
                      key={meal.id}
                      onPointerDown={(pointerEvent) => pointerEvent.stopPropagation()}
                      onClick={(clickEvent) => { clickEvent.stopPropagation(); openEdit(meal); }}
                      style={{ top: startMinute * PIXELS_PER_MINUTE, height: Math.max(24, (endMinute - startMinute) * PIXELS_PER_MINUTE) }}
                      type="button"
                    >
                      <strong>{meal.name}</strong>
                      <span>{new Date(meal.startsAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}–{new Date(meal.endsAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</span>
                    </button>
                  );
                })}
                {selection?.dayStart === dayStart && selectionStyle ? <div className="calendar-selection" style={selectionStyle}>Nyt måltid</div> : null}
              </div>
            );
          })}
        </div>
      </div>

      {draft ? (
        <div className="calendar-editor subcard">
          <div className="item-heading">
            <div><span className="eyebrow">{draft.id ? "Redigér" : "Nyt måltid"}</span><h3>{draft.id ? draft.name : "Tilføj oplysninger"}</h3></div>
            <button className="icon-button" onClick={() => setDraft(null)} type="button" aria-label="Luk editor">×</button>
          </div>
          <div className="form-grid">
            <label>Navn<input autoFocus value={draft.name} onChange={(inputEvent) => setDraft({ ...draft, name: inputEvent.target.value })} /></label>
            <label>Start<input type="datetime-local" min={toLocalDateTimeInput(event.startsAt)} max={toLocalDateTimeInput(event.endsAt)} value={draft.startsAt} onChange={(inputEvent) => setDraft({ ...draft, startsAt: inputEvent.target.value })} /></label>
            <label>Slut<input type="datetime-local" min={toLocalDateTimeInput(event.startsAt)} max={toLocalDateTimeInput(event.endsAt)} value={draft.endsAt} onChange={(inputEvent) => setDraft({ ...draft, endsAt: inputEvent.target.value })} /></label>
            <label>Svar senest<input type="datetime-local" value={draft.cutoffAt} onChange={(inputEvent) => setDraft({ ...draft, cutoffAt: inputEvent.target.value })} /></label>
            <label>Beskrivelse<textarea rows={2} value={draft.description} onChange={(inputEvent) => setDraft({ ...draft, description: inputEvent.target.value })} /></label>
          </div>
          <p className="helper-text">Måltidet skal ligge mellem {new Date(event.startsAt).toLocaleString("da-DK")} og {new Date(event.endsAt).toLocaleString("da-DK")}.</p>
          {error ? <p className="error">{error}</p> : null}
          <div className="button-row">
            <button className="button" disabled={saving} onClick={save} type="button">{saving ? "Gemmer…" : draft.id ? "Gem ændringer" : "Opret måltid"}</button>
            {draft.id ? <button className="button danger" disabled={saving} onClick={remove} type="button">Slet</button> : null}
            <button className="button ghost" onClick={() => setDraft(null)} type="button">Annuller</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
