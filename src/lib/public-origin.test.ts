import assert from "node:assert/strict";
import test from "node:test";

import { getPublicOrigin } from "./public-origin";

test("bruger det offentlige domæne bag en reverse proxy", () => {
  const request = new Request("http://localhost:3000/api/events/event-1/export", {
    headers: {
      host: "localhost:3000",
      "x-forwarded-host": "event.graasboell.dk",
      "x-forwarded-proto": "https"
    }
  });

  assert.equal(getPublicOrigin(request), "https://event.graasboell.dk");
});

test("bruger requestens host og protokol uden en reverse proxy", () => {
  const request = new Request("http://localhost:3000/api/events/event-1/export");

  assert.equal(getPublicOrigin(request), "http://localhost:3000");
});

test("bruger første værdi i videresendte proxy-headere", () => {
  const request = new Request("http://localhost:3000/api/events/event-1/export", {
    headers: {
      "x-forwarded-host": "event.graasboell.dk, localhost:3000",
      "x-forwarded-proto": "https, http"
    }
  });

  assert.equal(getPublicOrigin(request), "https://event.graasboell.dk");
});
