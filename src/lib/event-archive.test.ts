import assert from "node:assert/strict";
import test from "node:test";

import { partitionEventsByArchive } from "@/lib/event-archive";

test("holder arkiverede events ude af dashboardlisten", () => {
  const result = partitionEventsByArchive([
    { id: "active", archivedAt: null },
    { id: "archived", archivedAt: 1_785_415_745_803 }
  ]);

  assert.deepEqual(result.active.map((event) => event.id), ["active"]);
  assert.deepEqual(result.archived.map((event) => event.id), ["archived"]);
});
