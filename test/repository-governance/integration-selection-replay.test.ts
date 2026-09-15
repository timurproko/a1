import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { describe, expect, it } from "vitest";

const exec = promisify(execFile);
const path = "openspec/changes/archive/2026-09-15-shorten-development-validation/evidence/integration-impact-replay.json";

describe("recorded integration selection replay", () => {
  it("retains historical identities and conservative current-graph interpretation", async () => {
    const report = JSON.parse(await readFile(path, "utf8"));
    expect(report).toMatchObject({
      schema: "a1-integration-impact-replay-v1",
      interpretation: expect.stringContaining("not claims that this future classifier ran on those old heads"),
      workflowControls: { draftSuppression: true, docsExemption: true, versionExemption: true, selectionEnabledForSkips: false },
    });
    expect(report.sourceHead).toBe("f364a1a076d20b44fcd5bd8b0f2ac942a705f21a");
    await expect(exec("git", ["merge-base", "--is-ancestor", "4f7b18c235af5c99b630865fbdc455dd42047ab7", "HEAD"])).resolves.toBeDefined();
    expect(report.historical.map((item: any) => [item.label, item.actualBase, item.actualHead, item.changes])).toEqual([
      ["pr-398", "6788860dc4e0b045bfd7d7e174557d8805bafbf6", "5079baf8b5469ec05e3f81de28e776802c3ae9c6", 17],
      ["pr-400", "0bc3624fd4d81eb131c31fdd0ad443fd786742f0", "fd7f1258a4c8814f0215259cb5f072b228ff3a6c", 24],
      ["baseline-34883033336", "d5d7c1b100158e9d0efdb44f0490ced2ee4ea266", "47d2adbe26e7d13ad1b98ecafccedcc92209d75e", 18],
    ]);
    expect(report.historical.every((item: any) => item.kind === "historical-path-replay-against-current-reviewed-graph")).toBe(true);
    expect(report.historical.every((item: any) => item.result.selection.owners.every((owner: any) => owner.selected))).toBe(true);
  });

  it("records expected synthetic reasons without hiding conservative over-selection", async () => {
    const report = JSON.parse(await readFile(path, "utf8"));
    const scenarios = Object.fromEntries(report.scenarios.map((item: any) => [item.label, item]));
    expect(scenarios["unrelated-governance"].result.selection.owners.every((owner: any) => !owner.selected && owner.reasons[0].code === "unrelated")).toBe(true);
    for (const [label, expected] of [["startup-source", "startup"], ["image-source", "image-compatibility"], ["history-source", "history-compatibility"]] as const) {
      const owner = scenarios[label].result.selection.owners.find((candidate: any) => candidate.owner === expected);
      expect(owner, label).toMatchObject({ selected: true, reasons: expect.arrayContaining([expect.objectContaining({ code: "reachable" })]) });
      expect(scenarios[label].result.selection.owners.some((candidate: any) => candidate.reasons.some((reason: any) => reason.code === "conservative-fallback")), label).toBe(true);
    }
    for (const label of ["native-input", "validation-policy"]) {
      expect(scenarios[label].result.selection.owners.every((owner: any) => owner.reasons.some((reason: any) => reason.code === "invalidator")), label).toBe(true);
    }
    expect(scenarios["unknown-operational"].result).toMatchObject({ fallback: "unclassified-operational-input" });
    expect(scenarios["unknown-operational"].result.selection.owners.every((owner: any) => owner.selected)).toBe(true);
    expect(report.exemptions.map((item: any) => item.exemption)).toEqual(["docs-only", "version-only"]);
    expect(report.exemptions.every((item: any) => item.selection.owners.every((owner: any) => !owner.selected && owner.reasons[0].code === item.exemption))).toBe(true);
  });

  it("keeps replay generation read-only and explicit about graph/source identities", async () => {
    const source = await readFile("scripts/release/replay-integration-impact.mjs", "utf8");
    expect(source).toContain("createRevisionDependencyReader");
    expect(source).toContain("collectCommitChanges");
    expect(source).toContain("historical-path-replay-against-current-reviewed-graph");
    expect(source).not.toMatch(/git\s+(?:commit|push|checkout|switch)|gh\s|writeFile\([^,]*(?:config|scripts|\.github)/);
    const report = JSON.parse(await readFile(path, "utf8"));
    expect(report.graphFixture).toEqual({
      base: expect.stringMatching(/^[0-9a-f]{40}$/), head: expect.stringMatching(/^[0-9a-f]{40}$/), contentRevision: report.sourceHead,
    });
    expect(report.readerStats).toMatchObject({ gitCommands: 2, revisions: 1 });
  });
});
