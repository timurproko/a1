import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("mandatory release compatibility policy", () => {
  it("owns architecture, authority, candidate conformance, oracle, package, UI, and extension contracts once", async () => {
    const source = await readFile("scripts/release/run-release-gates.mjs", "utf8");
    const suites = JSON.parse(await readFile("config/validation-suites.json", "utf8")) as { releaseContracts: Record<string, string> };
    expect(Object.keys(suites.releaseContracts)).toEqual([
      "architecture", "compatibility-authority", "candidate-engine-conformance", "exact-vanilla-oracle",
      "packaged-public-entry", "owned-ui-regression", "extension-behavior", "architecture-independent-n-minus-one-update-transition",
      "post-update-startup-performance", "immutable-dependency-layer-compatibility",
    ]);
    expect(new Set(Object.keys(suites.releaseContracts)).size).toBe(10);
    expect(source).toContain("createTierPlan([\"full-release\"])");
    expect(source).toContain("Object.entries(suites.releaseContracts)");
    expect(source).toContain("MANDATORY_RELEASE_GATES.map");
  });

  it("never runs optional UI synchronization in mandatory release gates", async () => {
    const source = await readFile("scripts/release/run-release-gates.mjs", "utf8");
    expect(source).not.toMatch(/sync:pi-ui|update:pi-component-parity|update:pi-event-frame-parity|update-pinned-pi-source/);
  });
});
