import { describe, expect, it } from "vitest";
import {
  PiTuiRuntimeError,
  runPiTuiRuntimeConformance,
} from "../../../../src/integrations/pi/tui-runtime/index.js";
import { readPiCompatibilityAuthority } from "../../../../scripts/governance/pi-compatibility-authority.mjs";

describe("public Pi TUI runtime conformance", () => {
  it("pins the public package directly and exactly", async () => {
    const authority = await readPiCompatibilityAuthority(".");
    const tui = authority.packages.find(record => record.name === "@earendil-works/pi-tui");

    expect(tui).toMatchObject({
      requested: tui?.version,
      version: expect.stringMatching(/^\d+\.\d+\.\d+$/),
      integrity: expect.stringMatching(/^sha512-/),
      lockPath: "node_modules/@earendil-works/pi-tui",
    });
  });

  it("validates the pinned regular main-screen runtime contract", async () => {
    const authority = await readPiCompatibilityAuthority(".");
    const tui = authority.packages.find(record => record.name === "@earendil-works/pi-tui");
    if (!tui) throw new Error("Pi TUI compatibility authority is missing");
    const report = await runPiTuiRuntimeConformance({ packageVersion: tui.version });

    expect(report).toEqual({
      packageName: "@earendil-works/pi-tui",
      packageVersion: tui.version,
      mode: "regular",
      constructedModes: ["regular", "fullscreen"],
      lifecycleRestored: true,
      inputRouted: true,
      overlayRouted: true,
      focusRouted: true,
      widthBounded: true,
      differentialRendering: true,
      resizeRedraw: true,
      terminalNativeSelection: true,
    });
    expect(report.packageVersion).toBe(tui.version);
  });

  it("reports failures through an adapter-owned stage", () => {
    const error = new PiTuiRuntimeError("restoration", new Error("synthetic restore failure"));
    expect(error.name).toBe("PiTuiRuntimeError");
    expect(error.stage).toBe("restoration");
    expect(error.message).toContain("synthetic restore failure");
  });
});
