import { describe, expect, it, vi } from "vitest";
import { AddonProcessInspector } from "../../../src/foundation/process-containment/index.js";

describe("addon process inspector", () => {
  it.each([
    ["windows-filetime:", "windows-filetime:1337"],
    ["darwin-proc-start:", "darwin-proc-start:12:34"],
  ])("observes and matches %s identities", async (prefix, startIdentity) => {
    const inspectProcessStart = vi.fn(() => startIdentity);
    const inspector = new AddonProcessInspector({ inspectProcessStart }, prefix);

    await expect(inspector.observe(42)).resolves.toEqual({ pid: 42, startIdentity });
    await expect(inspector.matches({ pid: 42, startIdentity })).resolves.toBe(true);
    await expect(inspector.matches({ pid: 42, startIdentity: `${prefix}other` })).resolves.toBe(false);
    expect(inspectProcessStart).toHaveBeenCalledWith(42);
  });

  it("returns null for an absent process", async () => {
    const inspector = new AddonProcessInspector({ inspectProcessStart: () => null }, "windows-filetime:");
    await expect(inspector.observe(42)).resolves.toBeNull();
  });

  it("rejects invalid inputs, native failures, and mismatched identities", async () => {
    const prefix = "windows-filetime:";
    await expect(new AddonProcessInspector({ inspectProcessStart: () => "windows-filetime:1" }, prefix).observe(0))
      .rejects.toThrow(/positive safe integer/u);
    await expect(new AddonProcessInspector({ inspectProcessStart: () => { throw new Error("access denied"); } }, prefix).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_FAILED" });
    await expect(new AddonProcessInspector({ inspectProcessStart: () => "darwin-proc-start:1:2" }, prefix).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_INVALID" });
  });
});
