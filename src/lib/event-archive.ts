type ArchivableEvent = {
  archivedAt: number | null;
};

export function partitionEventsByArchive<T extends ArchivableEvent>(eventList: T[]) {
  const active: T[] = [];
  const archived: T[] = [];

  for (const event of eventList) {
    (event.archivedAt === null ? active : archived).push(event);
  }

  return { active, archived };
}
