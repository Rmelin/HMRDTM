import assert from "node:assert/strict";
import test from "node:test";

import { parseLocalDateTimeInput } from "./datetime";
import {
  addLocalDays,
  calendarDays,
  localDayStart,
  splitScheduleItems
} from "@/lib/schedule";

test("opretter én kalenderkolonne pr. lokal eventdag", () => {
  const startsAt = parseLocalDateTimeInput("2026-07-24T18:00");
  const endsAt = parseLocalDateTimeInput("2026-07-26T10:00");

  assert.deepEqual(calendarDays(startsAt, endsAt), [
    parseLocalDateTimeInput("2026-07-24T00:00"),
    parseLocalDateTimeInput("2026-07-25T00:00"),
    parseLocalDateTimeInput("2026-07-26T00:00")
  ]);
});

test("deler et punkt over midnat i én blok pr. dag", () => {
  const firstDay = parseLocalDateTimeInput("2026-07-24T00:00");
  const secondDay = addLocalDays(firstDay, 1);
  const item = {
    id: "program-1",
    type: "program" as const,
    name: "Natprogram",
    startsAt: parseLocalDateTimeInput("2026-07-24T23:00"),
    endsAt: parseLocalDateTimeInput("2026-07-25T01:00")
  };

  const segments = splitScheduleItems([item], [firstDay, secondDay]);

  assert.equal(segments.length, 2);
  assert.deepEqual(
    segments.map(({ dayStart, segmentStart, segmentEnd }) => ({
      dayStart,
      segmentStart,
      segmentEnd
    })),
    [
      { dayStart: firstDay, segmentStart: item.startsAt, segmentEnd: secondDay },
      {
        dayStart: secondDay,
        segmentStart: secondDay,
        segmentEnd: item.endsAt
      }
    ]
  );
});

test("udelader punkter uden for de viste dage", () => {
  const day = localDayStart(parseLocalDateTimeInput("2026-07-24T12:00"));
  const item = {
    id: "meal-1",
    type: "meal" as const,
    name: "Morgenmad",
    startsAt: addLocalDays(day, 2),
    endsAt: addLocalDays(day, 2) + 60 * 60 * 1000
  };

  assert.deepEqual(splitScheduleItems([item], [day]), []);
});
