"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ScheduleCalendarGrid } from "@/components/schedule-calendar-grid";
import {
  parseDateTimeInput,
  toLocalDateTimeInput
} from "@/lib/datetime";
import { ScheduleItem } from "@/lib/schedule";

type Availability = { comesAt: number | null; leavesAt: number | null };
type DraftWindow = { comesAt: string; leavesAt: string };

export function AvailabilityWindowsEditor({
  saveUrl,
  availability,
  eventStartsAt,
  eventEndsAt,
  scheduleItems = []
}: {
  saveUrl: string;
  availability: Availability[];
  eventStartsAt: number;
  eventEndsAt: number;
  scheduleItems?: ScheduleItem[];
}) {
  const router = useRouter();
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

  const attendanceWindows = windows.flatMap((window, index) => {
    const startsAt = parseDateTimeInput(window.comesAt);
    const endsAt = parseDateTimeInput(window.leavesAt);
    if (!Number.isFinite(startsAt) || !Number.isFinite(endsAt) || endsAt <= startsAt) return [];
    return [{
      id: `attendance-${index}`,
      name: `Tidsrum ${index + 1}`,
      startsAt,
      endsAt
    }];
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
          <div><h3>Din samlede kalender</h3><p className="helper-text">Se dine deltagelsestider sammen med måltider og program.</p></div>
          <span className="badge accent">Samlet overblik</span>
        </div>
        <div className="calendar-legend" aria-label="Kalenderforklaring">
          <span><i className="legend-swatch attendance" /> Din deltagelse</span>
          <span><i className="legend-swatch meal" /> Måltid</span>
          <span><i className="legend-swatch program" /> Program</span>
        </div>
        <ScheduleCalendarGrid
          eventStartsAt={eventStartsAt}
          eventEndsAt={eventEndsAt}
          items={scheduleItems}
          attendance={attendanceWindows}
        />
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
