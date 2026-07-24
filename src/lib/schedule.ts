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

export function localDayStart(value: number) {
  const date = new Date(value);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

export function addLocalDays(value: number, days: number) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date.getTime();
}

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
  return Math.round((value - dayStart) / 60_000);
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
