import assert from "node:assert/strict";
import test from "node:test";

import { buildContactBook } from "@/lib/contact";

test("viser kun kontaktfelter, som personen selv har valgt at dele", () => {
  const [contact] = buildContactBook([
    {
      id: "guest:1",
      name: "Anna",
      role: "Gæst",
      email: "anna@example.dk",
      phone: "+45 12 34 56 78",
      shareEmail: true,
      sharePhone: false
    }
  ]);

  assert.deepEqual(contact, {
    id: "guest:1",
    name: "Anna",
    role: "Gæst",
    email: "anna@example.dk",
    phone: null
  });
});

test("udelader personer, som ikke deler nogen kontaktoplysninger", () => {
  const contacts = buildContactBook([
    {
      id: "owner:1",
      name: "Eventleder",
      role: "Eventleder",
      email: "leder@example.dk",
      phone: "+45 87 65 43 21",
      shareEmail: false,
      sharePhone: false
    }
  ]);

  assert.deepEqual(contacts, []);
});

test("udelader et valgt felt, hvis der ikke er gemt en værdi", () => {
  const contacts = buildContactBook([
    {
      id: "guest:2",
      name: "Bo",
      role: "Gæst",
      email: null,
      phone: null,
      shareEmail: true,
      sharePhone: true
    }
  ]);

  assert.deepEqual(contacts, []);
});
