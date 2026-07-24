import {
  addLocalDays,
  localDateTimeAtMinutes,
  localDayStart
} from "@/lib/datetime";

export function defaultEventEnd(startsAt: number) {
  return startsAt + 3 * 60 * 60 * 1000;
}

export function defaultSignupDeadline(startsAt: number) {
  const fiveDaysBefore = addLocalDays(localDayStart(startsAt), -5);
  return localDateTimeAtMinutes(fiveDaysBefore, 16 * 60);
}

export function defaultMealEnd(startsAt: number) {
  return startsAt + 60 * 60 * 1000;
}
