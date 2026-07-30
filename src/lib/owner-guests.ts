type EventWindow = {
  id: string;
  startsAt: number;
  endsAt: number;
};

export type EventOwnerAttendance = {
  id: string;
  name: string;
  email: string;
  countsAsGuest: boolean;
};

const ownerGroupId = (ownerId: string) => `event-owner-group:${ownerId}`;

export function buildOwnerGuestData(
  event: EventWindow,
  owners: EventOwnerAttendance[]
) {
  const countedOwners = owners.filter((owner) => owner.countsAsGuest);

  return {
    groups: countedOwners.map((owner) => ({
      id: ownerGroupId(owner.id),
      eventId: event.id,
      displayName: `${owner.name || owner.email} (eventejer)`,
      inviteToken: "",
      eventStatus: "yes",
      contactEmail: null,
      contactPhone: null,
      shareEmail: false,
      sharePhone: false,
      createdAt: 0,
      lastSeenAt: null
    })),
    people: countedOwners.map((owner) => ({
      id: `event-owner-person:${owner.id}`,
      groupId: ownerGroupId(owner.id),
      name: owner.name || owner.email,
      type: "adult",
      dietType: null,
      dietNotes: null
    })),
    availability: countedOwners.map((owner) => ({
      groupId: ownerGroupId(owner.id),
      comesAt: event.startsAt,
      leavesAt: event.endsAt
    }))
  };
}
