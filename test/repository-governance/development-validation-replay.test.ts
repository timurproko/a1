import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const execFileAsync = promisify(execFile);

describe("bounded Development selection replay", () => {
  it("defers exhaustive predecessor work in all PR scenarios and evaluates timing targets", async () => {
    const directory = await mkdtemp(join(tmpdir(), "a1-development-replay-"));
    const output = join(directory, "replay.json");
    try {
      await execFileAsync(process.execPath, ["scripts/release/generate-development-validation-replay.mjs", "--output", output]);
      const report = JSON.parse(await readFile(output, "utf8"));
      expect(report).toMatchObject({
        schema: "a1-development-validation-replay-v1",
        classification: "recorded-pr429-structural-replay-not-hosted-acceptance",
        targets: { criticalPathMs: 480_000, scopeMs: 300_000 },
      });
      expect(report.scenarios.map((scenario: any) => scenario.id)).toEqual([
        "conservative-invalidator", "ordinary-release-update", "direct-exhaustive-test",
      ]);
      for (const scenario of report.scenarios) {
        expect(scenario.selectedPullRequestOwners).not.toContain("update-predecessor");
        expect(scenario.selectedPullRequestOwners).not.toContain("update-performance");
        expect(scenario.deferredExhaustiveOwners).toEqual([
          expect.objectContaining({ owner: "update-performance", reasons: [expect.objectContaining({ code: "exhaustive-cadence" })] }),
          expect.objectContaining({ owner: "update-predecessor", reasons: [expect.objectContaining({ code: "exhaustive-cadence" })] }),
        ]);
      }
      expect(report.scenarios.find((scenario: any) => scenario.id === "direct-exhaustive-test").focusedPredecessorTests)
        .toEqual(expect.arrayContaining([
          "test/foundation/release/predecessor-command.test.ts",
          "test/foundation/release/predecessor-fixture.test.ts",
        ]));
      expect(report.timing.recordedPr429.targets).toMatchObject({ criticalPathMet: false, scopeMet: false });
      expect(report.timing.cadenceFilteredReplay.targets).toMatchObject({ criticalPathMet: true, scopeMet: true });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
