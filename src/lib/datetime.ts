export const EVENT_TIME_ZONE = "Europe/Copenhagen";

type DateTimeParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: EVENT_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23"
});

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function getLocalDateTimeParts(value: number | Date): DateTimeParts {
  const date = value instanceof Date ? value : new Date(value);
  const parts = Object.fromEntries(
    partsFormatter
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)])
  );
  return parts as DateTimeParts;
}

function localOffsetAt(value: number) {
  const parts = getLocalDateTimeParts(value);
  return (
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second
    ) - Math.floor(value / 1000) * 1000
  );
}

export function parseLocalDateTimeInput(value: string) {
  const match =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value);
  if (!match) return Number.NaN;

  const [, yearText, monthText, dayText, hourText, minuteText, secondText] =
    match;
  const expected: DateTimeParts = {
    year: Number(yearText),
    month: Number(monthText),
    day: Number(dayText),
    hour: Number(hourText),
    minute: Number(minuteText),
    second: Number(secondText ?? 0)
  };
  const utcWallTime = Date.UTC(
    expected.year,
    expected.month - 1,
    expected.day,
    expected.hour,
    expected.minute,
    expected.second
  );
  const utcCheck = new Date(utcWallTime);
  if (
    utcCheck.getUTCFullYear() !== expected.year ||
    utcCheck.getUTCMonth() + 1 !== expected.month ||
    utcCheck.getUTCDate() !== expected.day ||
    utcCheck.getUTCHours() !== expected.hour ||
    utcCheck.getUTCMinutes() !== expected.minute ||
    utcCheck.getUTCSeconds() !== expected.second
  ) {
    return Number.NaN;
  }

  let timestamp = utcWallTime - localOffsetAt(utcWallTime);
  timestamp = utcWallTime - localOffsetAt(timestamp);
  const actual = getLocalDateTimeParts(timestamp);
  return Object.keys(expected).every(
    (key) =>
      actual[key as keyof DateTimeParts] === expected[key as keyof DateTimeParts]
  )
    ? timestamp
    : Number.NaN;
}

export function parseDateTimeInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)
    ? parseLocalDateTimeInput(value)
    : Date.parse(value);
}

export function toLocalDateTimeInput(value: number | null | undefined) {
  if (value === null || value === undefined) return "";
  const parts = getLocalDateTimeParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatLocalDate(value: number | Date) {
  const parts = getLocalDateTimeParts(value);
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function formatTime(value: number | Date) {
  const parts = getLocalDateTimeParts(value);
  return `${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function formatDateTime(value: number | Date) {
  const parts = getLocalDateTimeParts(value);
  return `${pad(parts.day)}.${pad(parts.month)}.${parts.year}, ${pad(parts.hour)}:${pad(parts.minute)}`;
}

export function localDayStart(value: number) {
  const parts = getLocalDateTimeParts(value);
  return parseLocalDateTimeInput(
    `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T00:00`
  );
}

export function addLocalDays(value: number, days: number) {
  const parts = getLocalDateTimeParts(value);
  const target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return parseLocalDateTimeInput(
    `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}T00:00`
  );
}

export function localDateTimeAtMinutes(dayStart: number, minutes: number) {
  const parts = getLocalDateTimeParts(dayStart);
  const target = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, 0, minutes)
  );
  const date = `${target.getUTCFullYear()}-${pad(target.getUTCMonth() + 1)}-${pad(target.getUTCDate())}`;
  const time = `${pad(target.getUTCHours())}:${pad(target.getUTCMinutes())}`;
  const parsed = parseLocalDateTimeInput(`${date}T${time}`);
  if (Number.isFinite(parsed)) return parsed;

  for (let nextMinute = minutes + 1; nextMinute <= minutes + 60; nextMinute += 1) {
    const next = new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, 0, nextMinute)
    );
    const nextValue =
      `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}` +
      `T${pad(next.getUTCHours())}:${pad(next.getUTCMinutes())}`;
    const nextParsed = parseLocalDateTimeInput(nextValue);
    if (Number.isFinite(nextParsed)) return nextParsed;
  }
  return Number.NaN;
}
