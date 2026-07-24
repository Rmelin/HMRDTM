"use client";

import { PointerEvent, useEffect, useMemo, useRef, useState } from "react";

import {
  EVENT_TIME_ZONE,
  formatTime,
  localDateTimeAtMinutes
} from "@/lib/datetime";
import {
  calendarDays,
  minutesAfterDayStart,
  ScheduleItem,
  splitScheduleItems
} from "@/lib/schedule";

type AttendanceWindow = {
  id: string;
  name: string;
  startsAt: number;
  endsAt: number;
};

type Selection = {
  dayStart: number;
  anchorMinute: number;
  currentMinute: number;
};

const DAY_MINUTES = 24 * 60;
const PIXELS_PER_MINUTE = 0.5;
const SNAP_MINUTES = 15;

function snapMinute(value: number) {
  return Math.round(value / SNAP_MINUTES) * SNAP_MINUTES;
}

export function ScheduleCalendarGrid({
  eventStartsAt,
  eventEndsAt,
  items,
  attendance = [],
  onCreateRange,
  onItemClick
}: {
  eventStartsAt: number;
  eventEndsAt: number;
  items: ScheduleItem[];
  attendance?: AttendanceWindow[];
  onCreateRange?: (startsAt: number, endsAt: number) => void;
  onItemClick?: (item: ScheduleItem) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [didDrag, setDidDrag] = useState(false);
  const days = useMemo(
    () => calendarDays(eventStartsAt, eventEndsAt),
    [eventEndsAt, eventStartsAt]
  );
  const itemSegments = useMemo(
    () => splitScheduleItems(items, days),
    [days, items]
  );
  const attendanceSegments = useMemo(
    () =>
      splitScheduleItems(
        attendance.map((window) => ({ ...window, type: "program" as const })),
        days
      ),
    [attendance, days]
  );

  useEffect(() => {
    const firstDay = days[0];
    if (!firstDay || !scrollRef.current) return;
    const startMinute = minutesAfterDayStart(eventStartsAt, firstDay);
    scrollRef.current.scrollTop = Math.max(
      0,
      startMinute * PIXELS_PER_MINUTE - 90
    );
  }, [days, eventStartsAt]);

  function validMinutesForDay(dayStart: number) {
    return {
      start: Math.max(0, minutesAfterDayStart(eventStartsAt, dayStart)),
      end: Math.min(DAY_MINUTES, minutesAfterDayStart(eventEndsAt, dayStart))
    };
  }

  function minuteFromPointer(pointerEvent: PointerEvent<HTMLDivElement>) {
    const bounds = pointerEvent.currentTarget.getBoundingClientRect();
    const minute = snapMinute(
      (pointerEvent.clientY - bounds.top) / PIXELS_PER_MINUTE
    );
    return Math.max(0, Math.min(DAY_MINUTES, minute));
  }

  function pointerDown(
    pointerEvent: PointerEvent<HTMLDivElement>,
    dayStart: number
  ) {
    if (!onCreateRange || pointerEvent.button !== 0) return;
    const minute = minuteFromPointer(pointerEvent);
    const valid = validMinutesForDay(dayStart);
    if (minute < valid.start || minute >= valid.end) return;
    pointerEvent.currentTarget.setPointerCapture(pointerEvent.pointerId);
    setSelection({
      dayStart,
      anchorMinute: minute,
      currentMinute: minute
    });
    setDidDrag(false);
  }

  function pointerMove(pointerEvent: PointerEvent<HTMLDivElement>) {
    if (!selection) return;
    const minute = minuteFromPointer(pointerEvent);
    const valid = validMinutesForDay(selection.dayStart);
    const boundedMinute = Math.max(valid.start, Math.min(valid.end, minute));
    if (boundedMinute !== selection.anchorMinute) setDidDrag(true);
    setSelection((current) =>
      current ? { ...current, currentMinute: boundedMinute } : null
    );
  }

  function pointerUp(pointerEvent: PointerEvent<HTMLDivElement>) {
    if (!selection || !onCreateRange) return;
    const valid = validMinutesForDay(selection.dayStart);
    const firstMinute = Math.min(
      selection.anchorMinute,
      selection.currentMinute
    );
    const lastMinute = Math.max(
      selection.anchorMinute,
      selection.currentMinute
    );
    const startMinute = Math.max(valid.start, firstMinute);
    const endMinute = didDrag
      ? Math.min(
          valid.end,
          Math.max(startMinute + SNAP_MINUTES, lastMinute)
        )
      : Math.min(valid.end, startMinute + 60);
    pointerEvent.currentTarget.releasePointerCapture(pointerEvent.pointerId);
    setSelection(null);
    onCreateRange(
      localDateTimeAtMinutes(selection.dayStart, startMinute),
      localDateTimeAtMinutes(selection.dayStart, endMinute)
    );
  }

  const selectionStyle = selection
    ? {
        top:
          Math.min(selection.anchorMinute, selection.currentMinute) *
          PIXELS_PER_MINUTE,
        height:
          Math.max(
            SNAP_MINUTES,
            Math.abs(selection.currentMinute - selection.anchorMinute)
          ) * PIXELS_PER_MINUTE
      }
    : null;

  return (
    <div className="meal-calendar-scroll shared-schedule-scroll" ref={scrollRef}>
      <div
        className="meal-calendar shared-schedule-calendar"
        style={{
          gridTemplateColumns: `54px repeat(${days.length}, minmax(220px, 1fr))`
        }}
      >
        <div className="calendar-corner" />
        {days.map((dayStart) => (
          <div className="calendar-day-title" key={`title-${dayStart}`}>
            <strong>
              {new Date(dayStart).toLocaleDateString("da-DK", {
                weekday: "short",
                timeZone: EVENT_TIME_ZONE
              })}
            </strong>
            <span>
              {new Date(dayStart).toLocaleDateString("da-DK", {
                day: "numeric",
                month: "short",
                timeZone: EVENT_TIME_ZONE
              })}
            </span>
          </div>
        ))}

        <div className="calendar-times" aria-hidden="true">
          {Array.from({ length: 24 }, (_, hour) => (
            <span
              key={hour}
              style={{ top: hour * 60 * PIXELS_PER_MINUTE }}
            >
              {String(hour).padStart(2, "0")}:00
            </span>
          ))}
        </div>

        {days.map((dayStart) => {
          const valid = validMinutesForDay(dayStart);
          return (
            <div
              className={`calendar-day-column ${onCreateRange ? "" : "attendance-calendar-day"}`}
              key={dayStart}
              onPointerDown={(pointerEvent) =>
                pointerDown(pointerEvent, dayStart)
              }
              onPointerMove={pointerMove}
              onPointerUp={pointerUp}
            >
              {valid.start > 0 ? (
                <div
                  className="calendar-locked"
                  style={{
                    top: 0,
                    height: valid.start * PIXELS_PER_MINUTE
                  }}
                />
              ) : null}
              {valid.end < DAY_MINUTES ? (
                <div
                  className="calendar-locked"
                  style={{ top: valid.end * PIXELS_PER_MINUTE, bottom: 0 }}
                />
              ) : null}

              {attendanceSegments
                .filter((segment) => segment.dayStart === dayStart)
                .map((segment) => (
                  <div
                    className="calendar-attendance"
                    key={`${segment.id}-${dayStart}`}
                    style={{
                      top:
                        minutesAfterDayStart(
                          segment.segmentStart,
                          dayStart
                        ) * PIXELS_PER_MINUTE,
                      height: Math.max(
                        24,
                        (minutesAfterDayStart(segment.segmentEnd, dayStart) -
                          minutesAfterDayStart(
                            segment.segmentStart,
                            dayStart
                          )) *
                          PIXELS_PER_MINUTE
                      )
                    }}
                  >
                    <span>{segment.name}</span>
                  </div>
                ))}

              {itemSegments
                .filter((segment) => segment.dayStart === dayStart)
                .map((segment) => {
                  const className = [
                    "calendar-meal",
                    "calendar-schedule-item",
                    `calendar-${segment.type}-lane`,
                    segment.type === "program" ? "calendar-program" : "",
                    segment.isHidden ? "is-hidden" : ""
                  ]
                    .filter(Boolean)
                    .join(" ");
                  const style = {
                    top:
                      minutesAfterDayStart(
                        segment.segmentStart,
                        dayStart
                      ) * PIXELS_PER_MINUTE,
                    height: Math.max(
                      24,
                      (minutesAfterDayStart(segment.segmentEnd, dayStart) -
                        minutesAfterDayStart(
                          segment.segmentStart,
                          dayStart
                        )) *
                        PIXELS_PER_MINUTE
                    )
                  };
                  const content = (
                    <>
                      <strong>{segment.name}</strong>
                      <span>
                        {formatTime(segment.segmentStart)}–
                        {formatTime(segment.segmentEnd)}
                        {segment.isHidden ? " · skjult" : ""}
                      </span>
                    </>
                  );

                  return onItemClick ? (
                    <button
                      className={className}
                      key={`${segment.id}-${dayStart}`}
                      onPointerDown={(pointerEvent) =>
                        pointerEvent.stopPropagation()
                      }
                      onClick={(clickEvent) => {
                        clickEvent.stopPropagation();
                        onItemClick(segment);
                      }}
                      style={style}
                      type="button"
                    >
                      {content}
                    </button>
                  ) : (
                    <div
                      className={className}
                      key={`${segment.id}-${dayStart}`}
                      style={style}
                    >
                      {content}
                    </div>
                  );
                })}

              {selection?.dayStart === dayStart && selectionStyle ? (
                <div className="calendar-selection" style={selectionStyle}>
                  Nyt punkt
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
