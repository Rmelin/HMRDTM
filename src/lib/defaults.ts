import { addDays, addHours, setTime } from "@/lib/time";

export function defaultEventEnd(startsAt: Date) {
  return addHours(startsAt, 3);
}

export function defaultSignupDeadline(startsAt: Date) {
  const fiveDaysBefore = addDays(startsAt, -5);
  return setTime(fiveDaysBefore, 16, 0);
}

export function defaultMealEnd(startsAt: Date) {
  return addHours(startsAt, 1);
}
