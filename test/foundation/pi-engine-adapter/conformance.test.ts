import { describe, expect, it } from "vitest";
import {
  PiUpgradeConformanceError,
  runPiUpgradeConformance,
} from "../../../src/foundation/pi-engine-adapter/index.js";

describe("Pi public upgrade conformance", () => {
  it("constructs isolated services and sessions against the public SDK", async () => {
    const report = await runPiUpgradeConformance();

    expect(report.packageName).toBe("@earendil-works/pi-coding-agent");
    expect(report.packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.ownedUiContractVersion).toBe(1);
    expect(report.serviceDiagnostics).toBeGreaterThanOrEqual(0);
    expect(report.sessionId).toMatch(/^[a-f0-9-]+$/i);
    expect(report.commandSurface).toEqual([
      "prompt",
      "abort",
      "compact",
      "setModel",
      "setThinkingLevel",
      "subscribe",
      "dispose",
    ]);
  });

  it("reports the failing stage in an adapter-owned error", () => {
    const error = new PiUpgradeConformanceError("session", new Error("contract changed"));
    expect(error.name).toBe("PiUpgradeConformanceError");
    expect(error.stage).toBe("session");
    expect(error.message).toContain("contract changed");
  });
});
