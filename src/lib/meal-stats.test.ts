import assert from "node:assert/strict";
import test from "node:test";

import { calculateMealStats } from "@/lib/meal-stats";

const meal = { id: "meal", startsAt: 100, endsAt: 200 };
const groups = [
  { id: "a", displayName: "Anna", eventStatus: "yes" },
  { id: "b", displayName: "Bo", eventStatus: "no" }
];
const people = [
  { id: "pa", groupId: "a", name: "Anna", type: "adult", dietType: "vegetarian", dietNotes: null },
  { id: "pb", groupId: "b", name: "Bo", type: "child", dietType: "none", dietNotes: null }
];
const availability = [
  { groupId: "a", comesAt: 50, leavesAt: 250 },
  { groupId: "b", comesAt: 50, leavesAt: 250 }
];

test("event-ja gælder automatisk som ja til måltidet", () => {
  const stats = calculateMealStats(meal, groups, people, availability, []);
  assert.equal(stats.unspecified, 0);
  assert.equal(stats.expected, 1);
  assert.equal(stats.yes, 1);
  assert.equal(stats.no, 1);
  assert.equal(stats.guests[0].explicitStatus, null);
});

test("eksplicit nej udelukker en overlappende gæst", () => {
  const stats = calculateMealStats(meal, groups, people, availability, [
    { personId: "pa", mealId: "meal", status: "no" }
  ]);
  assert.equal(stats.no, 2);
  assert.equal(stats.expected, 0);
});

test("et af flere tidsrum kan gøre en gæst forventet", () => {
  const result = calculateMealStats(
    meal,
    groups,
    people,
    [
      { groupId: "a", comesAt: 10, leavesAt: 20 },
      { groupId: "a", comesAt: 50, leavesAt: 250 },
      { groupId: "b", comesAt: 10, leavesAt: 20 }
    ],
    []
  );

  assert.equal(result.expected, 1);
  assert.equal(result.guests.find((guest) => guest.id === "pa")?.overlaps, true);
});

test("en inviteret gæst uden deltagelsessvar tæller ikke som forventet", () => {
  const result = calculateMealStats(
    meal,
    [{ id: "a", displayName: "Anna", eventStatus: "invited" }],
    [people[0]],
    [availability[0]],
    []
  );

  assert.equal(result.expected, 0);
  assert.equal(result.guests[0].eventStatus, "invited");
});

test("partner og børn arver gruppens ja til eventet", () => {
  const result = calculateMealStats(
    meal,
    [{ id: "a", displayName: "Anna", eventStatus: "yes" }],
    [
      people[0],
      { ...people[0], id: "partner", name: "Per", type: "partner" },
      { ...people[0], id: "child", name: "Alma", type: "child" }
    ],
    [availability[0]],
    []
  );

  assert.equal(result.expected, 3);
  assert.equal(result.expectedAdults, 2);
  assert.equal(result.expectedChildren, 1);
});

test("måske til et måltid tæller ikke som forventet", () => {
  const result = calculateMealStats(meal, groups, people, availability, [
    { personId: "pa", mealId: "meal", status: "maybe" }
  ]);

  assert.equal(result.maybe, 1);
  assert.equal(result.expected, 0);
});

test("eksplicit ja kan afvige fra nej til eventet", () => {
  const result = calculateMealStats(meal, groups, people, availability, [
    { personId: "pb", mealId: "meal", status: "yes" }
  ]);

  assert.equal(result.expected, 2);
});

test("komme og gå-tider begrænser automatisk event-ja", () => {
  const result = calculateMealStats(
    meal,
    [groups[0]],
    [people[0]],
    [{ groupId: "a", comesAt: 10, leavesAt: 20 }],
    []
  );

  assert.equal(result.yes, 1);
  assert.equal(result.expected, 0);
});
