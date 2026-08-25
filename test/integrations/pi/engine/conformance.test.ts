import { describe, expect, it } from "vitest";
import {
  PiUpgradeConformanceError,
  runPiUpgradeConformance,
} from "../../../../src/integrations/pi/engine/index.js";

describe("Pi public upgrade conformance", () => {
  it("constructs isolated services and sessions against the public SDK", async () => {
    const report = await runPiUpgradeConformance();

    expect(report.schema).toBe("pi-engine-conformance-v1");
    expect(report.packageName).toBe("@earendil-works/pi-coding-agent");
    expect(report.packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.ownedUiContractVersion).toBe(1);
    expect(report.serviceDiagnostics).toBeGreaterThanOrEqual(0);
    expect(report.sessionId).toMatch(/^[a-f0-9-]+$/i);
    expect(report.commandSurface).toEqual([
      "prompt", "steer", "followUp", "abort", "compact", "setModel", "setThinkingLevel", "subscribe", "dispose",
    ]);
    expect(report.capabilities.map(result => result.capability)).toEqual([
      "public-exports", "session-lifecycle", "commands-events", "models-authentication",
      "settings", "resources-extensions", "workflows", "disposal",
    ]);
    expect(report.capabilities.every(result => result.passed && result.operations.length > 0)).toBe(true);
  });

  it("reports the failing stage in an adapter-owned error", () => {
    const error = new PiUpgradeConformanceError("session", new Error("contract changed"));
    expect(error.name).toBe("PiUpgradeConformanceError");
    expect(error.stage).toBe("session");
    expect(error.message).toContain("contract changed");
  });
});
