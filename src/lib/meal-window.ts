export type EventWindow = {
  startsAt: number;
  endsAt: number;
};

export type MealWindow = {
  startsAt: number;
  endsAt: number;
};

export function validateEventItemWindow(
  item: MealWindow,
  event: EventWindow,
  itemName = "Punktet"
): string | null {
  if (!Number.isFinite(item.startsAt) || !Number.isFinite(item.endsAt)) {
    return "Start og slut skal være gyldige tidspunkter";
  }

  if (item.endsAt <= item.startsAt) {
    return "Slut skal være efter start";
  }

  if (item.startsAt < event.startsAt || item.endsAt > event.endsAt) {
    return `${itemName} skal ligge inden for eventets start- og sluttid`;
  }

  return null;
}

export function validateMealWindow(meal: MealWindow, event: EventWindow): string | null {
  return validateEventItemWindow(meal, event, "Måltidet");
}
