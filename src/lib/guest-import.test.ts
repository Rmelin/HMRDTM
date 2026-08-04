import assert from "node:assert/strict";
import test from "node:test";

import { parseGuestImport } from "@/lib/guest-import";

test("læser CSV med navn og telefon", () => {
  const result = parseGuestImport(`Navn, Telefon
Anna, +45 12 34 56 78
Bo`);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.guests, [
    {
      displayName: "Anna",
      contactEmail: null,
      contactPhone: "+45 12 34 56 78",
      children: [],
      line: 2
    },
    {
      displayName: "Bo",
      contactEmail: null,
      contactPhone: null,
      children: [],
      line: 3
    }
  ]);
});

test("læser navn, telefon og mail samt indrykkede børn", () => {
  const result = parseGuestImport(`Navn, Telefon, Mail
Gæst, +45 12 34 56 78

  Barn til Gæst
Gæst2,,mail@mail.com
Gæst3,12345678, mailtil@mail.com
\tBarn til gæst3`);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.guests, [
    {
      displayName: "Gæst",
      contactEmail: null,
      contactPhone: "+45 12 34 56 78",
      children: ["Barn til Gæst"],
      line: 2
    },
    {
      displayName: "Gæst2",
      contactEmail: "mail@mail.com",
      contactPhone: null,
      children: [],
      line: 5
    },
    {
      displayName: "Gæst3",
      contactEmail: "mailtil@mail.com",
      contactPhone: "12345678",
      children: ["Barn til gæst3"],
      line: 6
    }
  ]);
});

test("knytter indrykkede børn til den foregående hovedgæst", () => {
  const result = parseGuestImport(`Anna
  Alma
  - Aksel
Bo`);

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.guests[0].children, ["Alma", "Aksel"]);
  assert.deepEqual(result.guests[1].children, []);
});

test("understøtter et barn i CSV-kolonnen efter navnet", () => {
  const result = parseGuestImport("Navn1,Barn til Navn1\nNavn2");

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.guests[0].children, ["Barn til Navn1"]);
});

test("afviser børn uden en hovedgæst", () => {
  const result = parseGuestImport("  Alma");

  assert.deepEqual(result.guests, []);
  assert.match(result.errors[0], /efter en hovedgæst/);
});

test("afviser ugyldige telefonnumre", () => {
  const result = parseGuestImport("Anna, ikke-et-nummer");

  assert.equal(result.guests.length, 1);
  assert.match(result.errors[0], /Telefonen er ugyldig/);
});

test("afviser ugyldig mail i en deklareret mailkolonne", () => {
  const result = parseGuestImport("Navn,Telefon,Mail\nAnna,+4512345678,ikke-mail");

  assert.equal(result.guests.length, 1);
  assert.match(result.errors[0], /Mailadressen er ugyldig/);
});

test("læser semikolonsepareret CSV og ekstra børnekolonner", () => {
  const result = parseGuestImport("Navn;Telefon;Barn 1;Barn 2\nAnna;+4512345678;Alma;Aksel");

  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.guests[0].children, ["Alma", "Aksel"]);
});
