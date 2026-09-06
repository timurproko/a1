import { describe, expect, it, vi } from "vitest";
import { DarwinNativeProcessInspector, type InspectorCommandRunner } from "../../../src/foundation/process-containment/index.js";

describe("Darwin native process inspector", () => {
  it("returns a guardian-observed Darwin process start token", async () => {
    const runner = fakeRunner({ exitCode: 0, stdout: '{"pid":42,"startIdentity":"darwin-proc-start:123:456"}', stderr: "" });
    const inspector = new DarwinNativeProcessInspector("process-guardian", runner);
    await expect(inspector.observe(42)).resolves.toEqual({ pid: 42, startIdentity: "darwin-proc-start:123:456" });
    expect(runner.run).toHaveBeenCalledWith("process-guardian", ["--inspect-pid", "42"]);
  });

  it("distinguishes dead and reused process identities", async () => {
    const dead = new DarwinNativeProcessInspector("process-guardian", fakeRunner({ exitCode: 3, stdout: "", stderr: "" }));
    await expect(dead.observe(42)).resolves.toBeNull();

    const reused = new DarwinNativeProcessInspector("process-guardian", fakeRunner({
      exitCode: 0,
      stdout: '{"pid":42,"startIdentity":"darwin-proc-start:124:1"}',
      stderr: "",
    }));
    await expect(reused.matches({ pid: 42, startIdentity: "darwin-proc-start:123:456" })).resolves.toBe(false);
  });

  it("rejects non-Darwin, malformed, mismatched, and failed results", async () => {
    for (const result of [
      { exitCode: 0, stdout: "not-json", stderr: "" },
      { exitCode: 0, stdout: '{"pid":41,"startIdentity":"darwin-proc-start:1:1"}', stderr: "" },
      { exitCode: 0, stdout: '{"pid":42,"startIdentity":"windows-filetime:1"}', stderr: "" },
    ]) {
      await expect(new DarwinNativeProcessInspector("process-guardian", fakeRunner(result)).observe(42))
        .rejects.toMatchObject({ code: "PROCESS_INSPECTION_INVALID" });
    }
    await expect(new DarwinNativeProcessInspector("process-guardian", fakeRunner({ exitCode: 2, stdout: "", stderr: "denied" })).observe(42))
      .rejects.toMatchObject({ code: "PROCESS_INSPECTION_FAILED" });
  });
});

function fakeRunner(result: { exitCode: number; stdout: string; stderr: string }): InspectorCommandRunner & { run: ReturnType<typeof vi.fn> } {
  return { run: vi.fn(async () => result) };
}
