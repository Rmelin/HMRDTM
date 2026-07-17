export function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function setTime(date: Date, hours: number, minutes: number) {
  const updated = new Date(date);
  updated.setHours(hours, minutes, 0, 0);
  return updated;
}
