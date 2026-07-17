export function toLocalDateTimeInput(value: number | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function formatTime(value: number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatDateTime(value: number | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return `${date.toLocaleDateString("da-DK", { day: "2-digit", month: "2-digit", year: "numeric" })}, ${formatTime(date)}`;
}
