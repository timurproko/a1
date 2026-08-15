import { describe, expect, it } from "vitest";
import {
  PiComponentConformanceError,
  runPiComponentConformance,
} from "../../../src/foundation/pi-component-adapter/index.js";

describe("Pi public component upgrade conformance", () => {
  it("validates public component constructor and render contracts", async () => {
    const report = await runPiComponentConformance();

    expect(report.packageName).toBe("@earendil-works/pi-coding-agent");
    expect(report.packageVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(report.ownedUiContractVersion).toBe(1);
    expect(report.componentResults).toEqual([
      { component: "user-message", renderRows: expect.any(Number), width: 80 },
      { component: "assistant-message", renderRows: expect.any(Number), width: 80 },
      { component: "tool-execution", renderRows: expect.any(Number), width: 80 },
    ]);
    for (const result of report.componentResults) expect(result.renderRows).toBeGreaterThan(0);
  });

  it("reports component failures through an adapter-owned stage", () => {
    const error = new PiComponentConformanceError("components", new Error("render contract changed"));
    expect(error.name).toBe("PiComponentConformanceError");
    expect(error.stage).toBe("components");
    expect(error.message).toContain("render contract changed");
  });
});
