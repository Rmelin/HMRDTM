import assert from "node:assert/strict";
import test from "node:test";

import { parseAvailabilityWindows } from "./availability";

const event = {
  startsAt: new Date("2026-08-17T08:00:00+02:00").getTime(),
  endsAt: new Date("2026-08-18T20:00:00+02:00").getTime()
};

test("accepterer flere separate komme/gå-tidsrum", () => {
  const result = parseAvailabilityWindows([
    { comesAt: "2026-08-17T08:00:00+02:00", leavesAt: "2026-08-17T16:00:00+02:00" },
    { comesAt: "2026-08-18T09:00:00+02:00", leavesAt: "2026-08-18T18:00:00+02:00" }
  ], event);

  assert.equal("error" in result, false);
  if (!("error" in result)) assert.equal(result.windows.length, 2);
});

test("afviser overlappende tidsrum", () => {
  const result = parseAvailabilityWindows([
    { comesAt: "2026-08-17T08:00:00+02:00", leavesAt: "2026-08-17T16:00:00+02:00" },
    { comesAt: "2026-08-17T15:00:00+02:00", leavesAt: "2026-08-17T18:00:00+02:00" }
  ], event);

  assert.equal("error" in result ? result.error : null, "Tidsrummene må ikke overlappe hinanden");
});

test("accepterer hele eventets tidsrum", () => {
  const result = parseAvailabilityWindows([{
    comesAt: new Date(event.startsAt).toISOString(),
    leavesAt: new Date(event.endsAt).toISOString()
  }], event);

  assert.deepEqual("error" in result ? null : result.windows, [{
    comesAt: event.startsAt,
    leavesAt: event.endsAt
  }]);
});
