import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

describe("terminal-host proof stop/go policy", () => {
  it("expresses physical acceptance and non-waivable failure as structured policy", async () => {
    const policy = JSON.parse(await readFile("config/terminal-host-proof-policy.json", "utf8"));
    expect(policy).toEqual({
      schema: "a1-terminal-host-proof-policy-v1",
      hostMode: "console-inside-existing-terminal",
      technicalVerdictRequired: "accepted",
      physicalVerdictRequired: "accepted",
      isolatedPhysicalWorkerRequired: true,
      maximumInputToProcessP95Ms: 16,
      maximumOutputToPresentP95Ms: 33,
      maximumMissedFrames: 0,
      maximumResizePaintGaps: 0,
      failureWaivable: false,
      integrationAllowedBeforeAcceptance: false,
      milestoneMergeAllowedBeforeAcceptance: false,
      structuredWorkIndependent: true,
      transparentModesIndependent: true,
      desktopNativeShellInScope: false,
    });
  });
});
