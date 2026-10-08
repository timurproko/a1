import { describe, expect, it } from "vitest";
import {
  createNativeProcessInspector,
  LinuxNativeProcessInspector,
  WindowsNativeProcessInspector,
} from "../../../src/foundation/process-containment/index.js";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";

describe("native process inspector selection", () => {
  it("loads only the selected platform inspector", async () => {
    await expect(createNativeProcessInspector({}, "linux")).resolves.toBeInstanceOf(LinuxNativeProcessInspector);
    await expect(createNativeProcessInspector({ [PRODUCT_IDENTITY.environment.processGuardianPath]: "guardian.exe" }, "win32"))
      .resolves.toBeInstanceOf(WindowsNativeProcessInspector);
  });

  it("requires a packaged helper and rejects unsupported platforms", async () => {
    await expect(createNativeProcessInspector({}, "win32")).rejects.toThrow(/helper is unavailable/);
    await expect(createNativeProcessInspector({}, "freebsd")).rejects.toThrow(/unsupported/);
  });
});
