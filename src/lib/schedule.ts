export type ScheduleItemType = "meal" | "program";

export type ScheduleItem = {
  id: string;
  type: ScheduleItemType;
  name: string;
  startsAt: number;
  endsAt: number;
  isHidden?: boolean;
};

export type ScheduleSegment<T extends ScheduleItem = ScheduleItem> = T & {
  dayStart: number;
  segmentStart: number;
  segmentEnd: number;
};

export { addLocalDays, localDayStart };

export function calendarDays(startsAt: number, endsAt: number) {
  const days: number[] = [];
  for (
    let day = localDayStart(startsAt);
    day <= localDayStart(endsAt);
    day = addLocalDays(day, 1)
  ) {
    days.push(day);
  }
  return days;
}

export function minutesAfterDayStart(value: number, dayStart: number) {
  if (value <= dayStart) return 0;
  if (value >= addLocalDays(dayStart, 1)) return 24 * 60;
  const parts = getLocalDateTimeParts(value);
  return parts.hour * 60 + parts.minute + Math.round(parts.second / 60);
}

export function splitScheduleItems<T extends ScheduleItem>(
  items: T[],
  days: number[]
): ScheduleSegment<T>[] {
  return items.flatMap((item) =>
    days.flatMap((dayStart) => {
      const dayEnd = addLocalDays(dayStart, 1);
      const segmentStart = Math.max(item.startsAt, dayStart);
      const segmentEnd = Math.min(item.endsAt, dayEnd);
      return segmentEnd > segmentStart
        ? [{ ...item, dayStart, segmentStart, segmentEnd }]
        : [];
    })
  );
}
import {
  addLocalDays,
  getLocalDateTimeParts,
  localDayStart
} from "@/lib/datetime";
