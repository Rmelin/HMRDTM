import assert from "node:assert/strict";
import test from "node:test";

import { hasOverlap } from "@/lib/overlap";

test("overlap kræver at intervallerne skærer hinanden", () => {
  assert.equal(hasOverlap(100, 200, 150, 250), true);
  assert.equal(hasOverlap(100, 200, 50, 150), true);
});

test("berøring præcis ved kanten tæller ikke", () => {
  assert.equal(hasOverlap(100, 200, 200, 250), false);
  assert.equal(hasOverlap(100, 200, 50, 100), false);
});

test("helt manglende tider tæller ikke", () => {
  assert.equal(hasOverlap(100, 200, null, null), false);
});
