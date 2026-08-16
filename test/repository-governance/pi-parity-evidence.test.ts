import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("Pi parity machine-readable evidence", () => {
  it("classifies the failed candidate fixtures as regression evidence", async () => {
    const evidence = JSON.parse(await readFile(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pi-parity-acceptance.json",
      "utf8",
    )) as {
      schema: string;
      result: string;
      manualAcceptanceStatus: string;
      evidenceClassification: string;
      invalidation: { replacementInventory: string };
      source: { commit: string; license: string };
      addOneParityBaselineCommit: string;
      packages: { name: string; version: string; integrity: string }[];
      fixtures: { path: string; sha256: string; classification: string; coverage: string[]; tolerance: { ignored: string[]; preserved: string[] } }[];
      visualDivergences: unknown[];
      gateCorrections: { status: string }[];
      gates: { command: string; result: string }[];
    };

    expect(evidence.schema).toBe("addone-pi-parity-acceptance-v1");
    expect(evidence.result).toBe("invalidated");
    expect(evidence.manualAcceptanceStatus).toBe("blocked-pending-independent-parity");
    expect(evidence.evidenceClassification).toBe("regression-only-not-parity");
    expect(evidence.invalidation.replacementInventory).toBe(
      "openspec/changes/build-owned-pi-ui-foundation/evidence/pinned-pi-interactive-baseline.json",
    );
    expect(evidence.source).toMatchObject({ commit: "914cf1472e715297caa30db4b9535d534a9eb718", license: "MIT" });
    expect(evidence.addOneParityBaselineCommit).toMatch(/^[0-9a-f]{40}$/);
    expect(evidence.packages.map(value => `${value.name}@${value.version}`)).toEqual([
      "@earendil-works/pi-coding-agent@0.84.2",
      "@earendil-works/pi-tui@0.84.2",
    ]);
    for (const value of evidence.packages) expect(value.integrity).toMatch(/^sha512-/);
    for (const fixture of evidence.fixtures) {
      const bytes = await readFile(fixture.path);
      expect(createHash("sha256").update(bytes).digest("hex"), fixture.path).toBe(fixture.sha256);
      expect(fixture.classification).toContain("no independent upstream producer");
      expect(fixture.coverage.length).toBeGreaterThan(0);
      expect(fixture.tolerance.ignored.length).toBeGreaterThan(0);
      expect(fixture.tolerance.preserved.length).toBeGreaterThan(0);
    }
    expect(evidence.visualDivergences).toHaveLength(4);
    expect(evidence.gateCorrections.every(value => value.status === "corrected")).toBe(true);
    expect(evidence.gates.every(value => /passed|tests passed|0 vulnerabilities/.test(value.result))).toBe(true);
  });
});
