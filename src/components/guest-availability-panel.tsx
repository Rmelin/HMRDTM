"use client";

import { AvailabilityWindowsEditor } from "@/components/availability-windows-editor";

type Availability = { comesAt: number | null; leavesAt: number | null };

export function GuestAvailabilityPanel({
  token,
  availability,
  eventStartsAt,
  eventEndsAt
}: {
  token: string;
  availability: Availability[];
  eventStartsAt: number;
  eventEndsAt: number;
}) {
  return <AvailabilityWindowsEditor saveUrl={`/api/guest/${token}/availability`} availability={availability} eventStartsAt={eventStartsAt} eventEndsAt={eventEndsAt} />;
}
