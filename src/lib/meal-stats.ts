import { hasOverlap } from "@/lib/overlap";

export type MealStatus = "yes" | "no" | "maybe";

type MealLike = { id: string; startsAt: number; endsAt: number };
type GroupLike = { id: string; displayName: string; eventStatus: string };
type PersonLike = {
  id: string;
  groupId: string;
  name: string;
  type: string;
  dietType: string | null;
  dietNotes: string | null;
};
type AvailabilityLike = {
  groupId: string;
  comesAt: number | null;
  leavesAt: number | null;
};
type ResponseLike = { personId: string; mealId: string; status: string };

export type MealGuest = PersonLike & {
  groupName: string;
  eventStatus: string;
  status: MealStatus | null;
  explicitStatus: MealStatus | null;
  overlaps: boolean;
  expected: boolean;
};

export type MealStats = {
  yes: number;
  no: number;
  maybe: number;
  unspecified: number;
  expected: number;
  expectedAdults: number;
  expectedChildren: number;
  guests: MealGuest[];
};

export function calculateMealStats(
  meal: MealLike,
  groups: GroupLike[],
  people: PersonLike[],
  availability: AvailabilityLike[],
  responses: ResponseLike[]
): MealStats {
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const availabilityByGroup = new Map<string, AvailabilityLike[]>();
  for (const item of availability) {
    availabilityByGroup.set(item.groupId, [
      ...(availabilityByGroup.get(item.groupId) ?? []),
      item
    ]);
  }
  const responseByPerson = new Map(
    responses
      .filter((response) => response.mealId === meal.id)
      .map((response) => [response.personId, response.status as MealStatus])
  );

  const guests = people.map((person): MealGuest => {
    const group = groupById.get(person.groupId);
    const windows = availabilityByGroup.get(person.groupId) ?? [];
    const overlaps = windows.some((window) =>
      hasOverlap(
          meal.startsAt,
          meal.endsAt,
          window.comesAt ?? null,
          window.leavesAt ?? null
        )
    );
    const explicitStatus = responseByPerson.get(person.id) ?? null;
    const inheritedStatus = ["yes", "maybe", "no"].includes(group?.eventStatus ?? "")
      ? group?.eventStatus as MealStatus
      : null;
    const status = explicitStatus ?? inheritedStatus;
    const expected = status === "yes" && overlaps;

    return {
      ...person,
      groupName: group?.displayName ?? "Ukendt gæst",
      eventStatus: group?.eventStatus ?? "invited",
      status,
      explicitStatus,
      overlaps,
      expected
    };
  });

  return {
    yes: guests.filter((guest) => guest.status === "yes").length,
    no: guests.filter((guest) => guest.status === "no").length,
    maybe: guests.filter((guest) => guest.status === "maybe").length,
    unspecified: guests.filter((guest) => guest.status === null).length,
    expected: guests.filter((guest) => guest.expected).length,
    expectedAdults: guests.filter(
      (guest) => guest.expected && guest.type !== "child"
    ).length,
    expectedChildren: guests.filter(
      (guest) => guest.expected && guest.type === "child"
    ).length,
    guests
  };
}
