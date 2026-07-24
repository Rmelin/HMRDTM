"use client";

import { AvailabilityWindowsEditor } from "@/components/availability-windows-editor";
import { ScheduleItem } from "@/lib/schedule";

type Availability = { comesAt: number | null; leavesAt: number | null };

export function GuestAvailabilityPanel({
  token,
  availability,
  eventStartsAt,
  eventEndsAt,
  scheduleItems
}: {
  token: string;
  availability: Availability[];
  eventStartsAt: number;
  eventEndsAt: number;
  scheduleItems: ScheduleItem[];
}) {
  return (
    <AvailabilityWindowsEditor
      saveUrl={`/api/guest/${token}/availability`}
      availability={availability}
      eventStartsAt={eventStartsAt}
      eventEndsAt={eventEndsAt}
      scheduleItems={scheduleItems}
    />
  );
}
