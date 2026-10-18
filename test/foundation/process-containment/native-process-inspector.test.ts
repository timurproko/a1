import { describe, expect, it, vi } from "vitest";
import {
  AddonProcessInspector,
  createNativeProcessInspector,
  LinuxNativeProcessInspector,
  type ProcessGuardianAddon,
} from "../../../src/foundation/process-containment/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

describe("native process inspector selection", () => {
  it("loads only the selected platform inspector", async () => {
    const loadAddon = vi.fn(() => addon());
    await expect(createNativeProcessInspector({}, "linux", undefined, loadAddon)).resolves.toBeInstanceOf(LinuxNativeProcessInspector);
    await expect(createNativeProcessInspector({ [PRODUCT_IDENTITY.environment.processGuardianPath]: "guardian.node" }, "win32", undefined, loadAddon))
      .resolves.toBeInstanceOf(AddonProcessInspector);
    expect(loadAddon).toHaveBeenCalledOnce();
  });

  it("requires a packaged addon and rejects unsupported platforms", async () => {
    await expect(createNativeProcessInspector({}, "win32", undefined, () => addon())).rejects.toThrow(/addon is unavailable/u);
    await expect(createNativeProcessInspector({}, "freebsd", undefined, () => addon())).rejects.toThrow(/unsupported/u);
  });
});

function addon(): ProcessGuardianAddon {
  return {
    version: () => ({ crateVersion: "0.1.0-dev", protocolVersion: 2, target: "windows" }),
    inspectProcessStart: () => "windows-filetime:1",
    captureTerminalModes: () => "-:-",
    restoreTerminalModes() {},
    deliverExitNotice() {},
    spawnContained: () => { throw new Error("unused"); },
    spawnWatcher: () => 1,
    waitForProcessExit: async () => undefined,
    stopProcessGroup() {},
    restoreForegroundGroup() {},
    ignoreConsoleControl() {},
  };
}
