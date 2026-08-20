import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("terminal-host proof stop/go policy", () => {
  it("keeps the acceptance record pending with integration and merge forbidden", async () => {
    const record = JSON.parse(await readFile("openspec/changes/evolve-bare-a1-into-multi-agent-workspace/evidence/terminal-spike-acceptance-record.json", "utf8")) as Record<string, unknown>;
    expect(record).toMatchObject({
      schema: "a1-terminal-spike-acceptance-record-v1",
      hostMode: "console-inside-existing-terminal",
      technicalVerdict: "pending",
      physicalVerdict: "pending",
      physicalMethod: "not-run",
      decision: "pending",
      integrationAllowed: false,
      milestoneMergeAllowedForComposedTerminal: false,
      waiverPolicy: "no-waivers-after-evidence",
      structuredWorkIndependent: true,
      transparentModesIndependent: true,
    });
    expect(record.waivers).toEqual([]);
  });

  it("documents mandatory physical acceptance and non-waivable failure", async () => {
    const policy = await readFile("docs/architecture/terminal-host-proof-gate.md", "utf8");
    for (const required of [
      "stop/go gate",
      "inside an existing terminal without creating a desktop window",
      "physical verdict is `accepted`",
      "isolated disposable worker",
      "Input-to-process p95 latency is at most 16 ms",
      "Output-to-present p95 latency is at most 33 ms",
      "Missed frames are zero",
      "Resize paint gaps are zero",
      "cannot be waived",
      "forbids milestone merge",
      "structured-agent and transparent-mode work as independently usable",
      "prevents investment in a postponed desktop-native application shell",
      "custom rendering/input remediation loop",
    ]) {
      expect(policy).toContain(required);
    }
  });
});
