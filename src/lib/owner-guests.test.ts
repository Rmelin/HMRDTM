import assert from "node:assert/strict";
import test from "node:test";

import { calculateMealStats } from "@/lib/meal-stats";
import { buildOwnerGuestData } from "@/lib/owner-guests";

test("valgte eventejere tæller som voksne under hele eventet", () => {
  const event = { id: "event", startsAt: 100, endsAt: 300 };
  const ownerGuests = buildOwnerGuestData(event, [
    {
      id: "owner-1",
      name: "Anna",
      email: "anna@example.dk",
      countsAsGuest: true
    },
    {
      id: "owner-2",
      name: "Bo",
      email: "bo@example.dk",
      countsAsGuest: false
    }
  ]);

  const stats = calculateMealStats(
    { id: "meal", startsAt: 150, endsAt: 200 },
    ownerGuests.groups,
    ownerGuests.people,
    ownerGuests.availability,
    []
  );

  assert.equal(ownerGuests.people.length, 1);
  assert.equal(stats.expected, 1);
  assert.equal(stats.expectedAdults, 1);
  assert.equal(stats.guests[0].name, "Anna");
  assert.equal(stats.guests[0].eventStatus, "yes");
});
