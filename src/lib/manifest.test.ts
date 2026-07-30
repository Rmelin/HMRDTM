import assert from "node:assert/strict";
import test from "node:test";

import manifest from "@/app/manifest";

test("angiver standard- og maskable hjemmeskærmsikoner", () => {
  const appManifest = manifest();

  assert.equal(appManifest.display, "standalone");
  assert.deepEqual(
    appManifest.icons?.map((icon) => ({
      sizes: icon.sizes,
      purpose: icon.purpose
    })),
    [
      { sizes: "192x192", purpose: "any" },
      { sizes: "512x512", purpose: "any" },
      { sizes: "512x512", purpose: "maskable" }
    ]
  );
});
