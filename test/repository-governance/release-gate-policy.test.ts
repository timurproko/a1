import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("mandatory release compatibility policy", () => {
  it("gates architecture, authority, candidate conformance, oracle, package, UI, and extensions", async () => {
    const source = await readFile("scripts/run-release-gates.mjs", "utf8");
    for (const gate of [
      "architecture", "compatibility-authority", "candidate-engine-conformance", "exact-vanilla-oracle",
      "packaged-public-entry", "owned-ui-regression", "extension-behavior", "architecture-independent-n-minus-one-update-transition",
    ]) expect(source, gate).toContain(`id: "${gate}"`);
    expect(source).toContain("MANDATORY_RELEASE_GATES.map");
  });

  it("never runs optional UI synchronization in mandatory release gates", async () => {
    const source = await readFile("scripts/run-release-gates.mjs", "utf8");
    expect(source).not.toMatch(/sync:pi-ui|update:pi-component-parity|update:pi-event-frame-parity|update-pinned-pi-source/);
  });
});
