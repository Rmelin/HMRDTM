import assert from "node:assert/strict";
import test from "node:test";

import {
  addLocalDays,
  formatDateTime,
  parseLocalDateTimeInput,
  toLocalDateTimeInput
} from "./datetime";

test("fortolker sommertid som dansk lokal tid", () => {
  const timestamp = parseLocalDateTimeInput("2026-07-24T12:00");
  assert.equal(new Date(timestamp).toISOString(), "2026-07-24T10:00:00.000Z");
  assert.equal(toLocalDateTimeInput(timestamp), "2026-07-24T12:00");
});

test("fortolker vintertid som dansk lokal tid", () => {
  const timestamp = parseLocalDateTimeInput("2026-02-24T12:00");
  assert.equal(new Date(timestamp).toISOString(), "2026-02-24T11:00:00.000Z");
  assert.equal(formatDateTime(timestamp), "24.02.2026, 12:00");
});

test("afviser et lokalt tidspunkt som ikke findes ved skift til sommertid", () => {
  assert.equal(
    Number.isNaN(parseLocalDateTimeInput("2026-03-29T02:30")),
    true
  );
});

test("lægger kalenderdage til hen over skift til sommertid", () => {
  const saturday = parseLocalDateTimeInput("2026-03-28T00:00");
  const sunday = addLocalDays(saturday, 1);
  const monday = addLocalDays(sunday, 1);

  assert.equal(toLocalDateTimeInput(sunday), "2026-03-29T00:00");
  assert.equal(toLocalDateTimeInput(monday), "2026-03-30T00:00");
  assert.equal(monday - sunday, 23 * 60 * 60 * 1000);
});
