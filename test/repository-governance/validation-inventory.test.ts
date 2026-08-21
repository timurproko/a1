import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

interface Inventory {
  schema: string;
  observations: { installAndGateSeconds: number; cleanPackageInstallGateSeconds: number };
  releaseGates: Array<{ id: string; arguments: string[] }>;
  duplicateContracts: Array<{ id: string; repeatedByReleaseGate: string }>;
  buildTriggers: Array<{ id: string; source: string }>;
}

describe("validation invocation inventory", () => {
  it("reproduces the measured preview bottleneck and duplicate ownership", () => {
    const output = execFileSync(process.execPath, ["scripts/report-validation-inventory.mjs", "--json"], { encoding: "utf8" });
    const inventory = JSON.parse(output) as Inventory;

    expect(inventory.schema).toBe("a1-validation-inventory-v1");
    expect(inventory.observations.installAndGateSeconds).toBe(277);
    expect(inventory.observations.cleanPackageInstallGateSeconds).toBe(150.49);
    expect(inventory.releaseGates.map(gate => gate.id)).toContain("packaged-public-entry");
    expect(inventory.duplicateContracts.map(duplicate => duplicate.id)).toEqual(expect.arrayContaining([
      "architecture",
      "exact-vanilla-oracle",
      "owned-ui-regression",
    ]));
    expect(inventory.buildTriggers.map(trigger => trigger.id)).toEqual([
      "root-prepare",
      "engine-conformance",
      "exact-entry",
      "package-surface",
      "preview-pack",
    ]);
  });
});
