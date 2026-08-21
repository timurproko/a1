import { describe, expect, it, vi } from "vitest";
import { WindowsNativeProcessInspector, type InspectorCommandRunner } from "../../../src/foundation/process-containment/index.js";

describe("Windows native process inspector", () => {
  it("returns a helper-observed OS start token for a live process", async () => {
    const runner = fakeRunner({ exitCode: 0, stdout: '{"pid":42,"startIdentity":"windows-filetime:123456"}', stderr: "" });
    const inspector = new WindowsNativeProcessInspector("guardian.exe", runner);
    await expect(inspector.observe(42)).resolves.toEqual({ pid: 42, startIdentity: "windows-filetime:123456" });
    expect(runner.run).toHaveBeenCalledWith("guardian.exe", ["--inspect-pid", "42"]);
  });

  it("reports a dead exact process without fabricating identity", async () => {
    const inspector = new WindowsNativeProcessInspector("guardian.exe", fakeRunner({ exitCode: 3, stdout: "", stderr: "" }));
    await expect(inspector.observe(42)).resolves.toBeNull();
    await expect(inspector.matches({ pid: 42, startIdentity: "windows-filetime:old" })).resolves.toBe(false);
  });

  it("distinguishes a reused PID by its independently observed start token", async () => {
    const inspector = new WindowsNativeProcessInspector("guardian.exe", fakeRunner({
      exitCode: 0,
      stdout: '{"pid":42,"startIdentity":"windows-filetime:new"}',
      stderr: "",
    }));
    await expect(inspector.matches({ pid: 42, startIdentity: "windows-filetime:old" })).resolves.toBe(false);
  });

  it("rejects malformed, mismatched, and failed helper results", async () => {
    await expect(new WindowsNativeProcessInspector("guardian.exe", fakeRunner({ exitCode: 0, stdout: "not-json", stderr: "" })).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_INVALID" });
    await expect(new WindowsNativeProcessInspector("guardian.exe", fakeRunner({ exitCode: 0, stdout: '{"pid":41,"startIdentity":"windows-filetime:1"}', stderr: "" })).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_INVALID" });
    await expect(new WindowsNativeProcessInspector("guardian.exe", fakeRunner({ exitCode: 2, stdout: "", stderr: "access denied" })).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_FAILED" });
  });
});

function fakeRunner(result: { exitCode: number; stdout: string; stderr: string }): InspectorCommandRunner & { run: ReturnType<typeof vi.fn> } {
  return { run: vi.fn(async () => result) };
}
