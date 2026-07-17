"use client";

import { AvailabilityWindowsEditor } from "@/components/availability-windows-editor";

type Availability = { comesAt: number | null; leavesAt: number | null };

export function GuestAvailabilityForm({
  groupId,
  availability,
  eventStartsAt,
  eventEndsAt
}: {
  groupId: string;
  availability: Availability[];
  eventStartsAt: number;
  eventEndsAt: number;
}) {
  return <AvailabilityWindowsEditor saveUrl={`/api/guest-groups/${groupId}/availability`} availability={availability} eventStartsAt={eventStartsAt} eventEndsAt={eventEndsAt} />;
}
