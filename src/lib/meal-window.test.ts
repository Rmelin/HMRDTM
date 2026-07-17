import assert from "node:assert/strict";
import test from "node:test";

import { validateEventItemWindow, validateMealWindow } from "./meal-window";

const event = { startsAt: 1_000, endsAt: 5_000 };

test("accepts a meal exactly inside the event window", () => {
  assert.equal(validateMealWindow({ startsAt: 1_000, endsAt: 5_000 }, event), null);
});

test("rejects a meal starting before the event", () => {
  assert.match(
    validateMealWindow({ startsAt: 999, endsAt: 2_000 }, event) ?? "",
    /inden for eventets/
  );
});

test("rejects a meal ending after the event", () => {
  assert.match(
    validateMealWindow({ startsAt: 4_000, endsAt: 5_001 }, event) ?? "",
    /inden for eventets/
  );
});

test("rejects an invalid interval", () => {
  assert.equal(
    validateMealWindow({ startsAt: 3_000, endsAt: 3_000 }, event),
    "Slut skal være efter start"
  );
});

test("uses the requested item name for program validation", () => {
  assert.equal(
    validateEventItemWindow(
      { startsAt: 999, endsAt: 2_000 },
      event,
      "Programpunktet"
    ),
    "Programpunktet skal ligge inden for eventets start- og sluttid"
  );
});
