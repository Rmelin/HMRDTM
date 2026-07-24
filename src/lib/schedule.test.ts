import assert from "node:assert/strict";
import test from "node:test";

import {
  addLocalDays,
  calendarDays,
  localDayStart,
  splitScheduleItems
} from "@/lib/schedule";

test("opretter én kalenderkolonne pr. lokal eventdag", () => {
  const startsAt = new Date(2026, 6, 24, 18, 0).getTime();
  const endsAt = new Date(2026, 6, 26, 10, 0).getTime();

  assert.deepEqual(calendarDays(startsAt, endsAt), [
    new Date(2026, 6, 24).getTime(),
    new Date(2026, 6, 25).getTime(),
    new Date(2026, 6, 26).getTime()
  ]);
});

test("deler et punkt over midnat i én blok pr. dag", () => {
  const firstDay = new Date(2026, 6, 24).getTime();
  const secondDay = addLocalDays(firstDay, 1);
  const item = {
    id: "program-1",
    type: "program" as const,
    name: "Natprogram",
    startsAt: new Date(2026, 6, 24, 23, 0).getTime(),
    endsAt: new Date(2026, 6, 25, 1, 0).getTime()
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
  const day = localDayStart(new Date(2026, 6, 24, 12, 0).getTime());
  const item = {
    id: "meal-1",
    type: "meal" as const,
    name: "Morgenmad",
    startsAt: addLocalDays(day, 2),
    endsAt: addLocalDays(day, 2) + 60 * 60 * 1000
  };

  assert.deepEqual(splitScheduleItems([item], [day]), []);
});
