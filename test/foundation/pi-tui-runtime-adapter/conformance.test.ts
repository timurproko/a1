import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import {
  PI_TUI_PACKAGE_VERSION,
  PiTuiRuntimeError,
  runPiTuiRuntimeConformance,
} from "../../../src/foundation/pi-tui-runtime-adapter/index.js";

describe("public Pi TUI runtime conformance", () => {
  it("pins the public package directly and exactly", async () => {
    const manifest = JSON.parse(await readFile("package.json", "utf8")) as {
      dependencies: Record<string, string>;
    };
    const lock = JSON.parse(await readFile("package-lock.json", "utf8")) as {
      packages: Record<string, { version?: string; integrity?: string; dependencies?: Record<string, string> }>;
    };

    expect(manifest.dependencies["@earendil-works/pi-tui"]).toBe(PI_TUI_PACKAGE_VERSION);
    expect(lock.packages[""]?.dependencies?.["@earendil-works/pi-tui"]).toBe(PI_TUI_PACKAGE_VERSION);
    expect(lock.packages["node_modules/@earendil-works/pi-tui"]).toMatchObject({
      version: PI_TUI_PACKAGE_VERSION,
      integrity: expect.stringMatching(/^sha512-/),
    });
  });

  it("validates the pinned fullscreen runtime contract", async () => {
    const report = await runPiTuiRuntimeConformance();

    expect(report).toEqual({
      packageName: "@earendil-works/pi-tui",
      packageVersion: "0.84.1",
      mode: "fullscreen",
      lifecycleRestored: true,
      inputRouted: true,
      overlayRouted: true,
      differentialRendering: true,
      resizeRedraw: true,
    });
    expect(report.packageVersion).toBe(PI_TUI_PACKAGE_VERSION);
  });

  it("reports failures through an adapter-owned stage", () => {
    const error = new PiTuiRuntimeError("restoration", new Error("synthetic restore failure"));
    expect(error.name).toBe("PiTuiRuntimeError");
    expect(error.stage).toBe("restoration");
    expect(error.message).toContain("synthetic restore failure");
  });
});
