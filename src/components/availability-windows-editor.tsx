"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { formatTime, toLocalDateTimeInput } from "@/lib/datetime";

type Availability = { comesAt: number | null; leavesAt: number | null };
type DraftWindow = { comesAt: string; leavesAt: string };

const PIXELS_PER_MINUTE = 0.5;
const DAY_MINUTES = 24 * 60;

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

export function AvailabilityWindowsEditor({
  saveUrl,
  availability,
  eventStartsAt,
  eventEndsAt
}: {
  saveUrl: string;
  availability: Availability[];
  eventStartsAt: number;
  eventEndsAt: number;
}) {
  const router = useRouter();
  const calendarScrollRef = useRef<HTMLDivElement>(null);
  const min = toLocalDateTimeInput(eventStartsAt);
  const max = toLocalDateTimeInput(eventEndsAt);
  const [windows, setWindows] = useState<DraftWindow[]>(
    availability.length > 0
      ? availability.map((window) => ({
          comesAt: toLocalDateTimeInput(window.comesAt),
          leavesAt: toLocalDateTimeInput(window.leavesAt)
        }))
      : [{ comesAt: "", leavesAt: "" }]
  );
  const [message, setMessage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const firstDay = localDayStart(eventStartsAt);
    const startMinute = minutesAfterDayStart(eventStartsAt, firstDay);
    if (calendarScrollRef.current) {
      calendarScrollRef.current.scrollTop = Math.max(0, startMinute * PIXELS_PER_MINUTE - 90);
    }
  }, [eventStartsAt]);

  const days: number[] = [];
  for (
    let day = localDayStart(eventStartsAt);
    day <= localDayStart(eventEndsAt);
    day = addLocalDays(day, 1)
  ) {
    days.push(day);
  }

  const calendarWindows = windows.flatMap((window, index) => {
    const startsAt = new Date(window.comesAt).getTime();
    const endsAt = new Date(window.leavesAt).getTime();
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return [];
    return days.flatMap((dayStart) => {
      const dayEnd = addLocalDays(dayStart, 1);
      const segmentStart = Math.max(startsAt, dayStart);
      const segmentEnd = Math.min(endsAt, dayEnd);
      return segmentEnd > segmentStart
        ? [{ index, dayStart, segmentStart, segmentEnd, startsAt, endsAt }]
        : [];
    });
  });

  function updateWindow(index: number, update: Partial<DraftWindow>) {
    setWindows((current) => current.map((window, windowIndex) =>
      windowIndex === index ? { ...window, ...update } : window
    ));
  }

  function removeWindow(index: number) {
    setWindows((current) => {
      const next = current.filter((_, windowIndex) => windowIndex !== index);
      return next.length > 0 ? next : [{ comesAt: "", leavesAt: "" }];
    });
  }

  async function save(nextWindows: DraftWindow[] = windows, fullEvent = false) {
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch(saveUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ windows: nextWindows, fullEvent })
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        setMessage(body?.error ?? "Kunne ikke gemme tider");
        return;
      }
      setMessage(
        body.affectedMeals > 0
          ? `Gemt · ${body.affectedMeals} måltid(er) markeret efter Svar senest`
          : "Tiderne er gemt"
      );
      router.refresh();
    } catch {
      setMessage("Der kunne ikke oprettes forbindelse til serveren");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stack">
      <p className="helper-text"><strong>Som standard deltager du i hele eventet.</strong> Kan du ikke være med hele tiden, kan du rette tiderne eller tilføje flere tidsrum her. Tiderne bruges til at beregne, hvilke måltider du forventes til.</p>
      <div className="meal-calendar-shell">
        <div className="item-heading">
          <div><h3>Dine tider i kalenderen</h3><p className="helper-text">De markerede blokke viser, hvornår du deltager.</p></div>
          <span className="badge accent">Visuelt overblik</span>
        </div>
        <div className="meal-calendar-scroll attendance-calendar-scroll" ref={calendarScrollRef}>
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
              const validStart = Math.max(0, minutesAfterDayStart(eventStartsAt, dayStart));
              const validEnd = Math.min(DAY_MINUTES, minutesAfterDayStart(eventEndsAt, dayStart));
              return (
                <div className="calendar-day-column attendance-calendar-day" key={dayStart}>
                  {validStart > 0 ? <div className="calendar-locked" style={{ top: 0, height: validStart * PIXELS_PER_MINUTE }} /> : null}
                  {validEnd < DAY_MINUTES ? <div className="calendar-locked" style={{ top: validEnd * PIXELS_PER_MINUTE, bottom: 0 }} /> : null}
                  {calendarWindows.filter((window) => window.dayStart === dayStart).map((window) => (
                    <div
                      className="calendar-meal attendance-calendar-window"
                      key={`${window.index}-${dayStart}`}
                      style={{
                        top: minutesAfterDayStart(window.segmentStart, dayStart) * PIXELS_PER_MINUTE,
                        height: Math.max(28, minutesAfterDayStart(window.segmentEnd, window.segmentStart) * PIXELS_PER_MINUTE)
                      }}
                    >
                      <strong>Tidsrum {window.index + 1}</strong>
                      <span>{formatTime(window.segmentStart)}–{formatTime(window.segmentEnd)}</span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
      <div className="button-row" style={{ marginTop: 0 }}>
        <button
          className="button ghost"
          type="button"
          disabled={saving}
          onClick={() => {
            const wholeEvent = [{ comesAt: min, leavesAt: max }];
            setWindows(wholeEvent);
            void save(wholeEvent, true);
          }}
        >
          {saving ? "Gemmer…" : "Deltag i hele eventet"}
        </button>
        <button className="button ghost" type="button" onClick={() => setWindows((current) => [...current, { comesAt: "", leavesAt: "" }])}>
          ＋ Tilføj tidsrum
        </button>
      </div>
      <div className="list">
        {windows.map((window, index) => (
          <div className="subcard" key={index}>
            <div className="item-heading"><strong>Tidsrum {index + 1}</strong>{windows.length > 1 ? <button className="button danger" type="button" onClick={() => removeWindow(index)}>Fjern</button> : null}</div>
            <div className="input-grid">
              <label><span className="field-label">Jeg kommer</span><input type="datetime-local" min={min} max={max} value={window.comesAt} onChange={(event) => updateWindow(index, { comesAt: event.target.value })} /></label>
              <label><span className="field-label">Jeg går</span><input type="datetime-local" min={min} max={max} value={window.leavesAt} onChange={(event) => updateWindow(index, { leavesAt: event.target.value })} /></label>
            </div>
          </div>
        ))}
      </div>
      {message ? <p className="form-message">{message}</p> : null}
      <button className="button" type="button" onClick={() => void save()} disabled={saving}>{saving ? "Gemmer…" : "Gem tider"}</button>
    </div>
  );
}
