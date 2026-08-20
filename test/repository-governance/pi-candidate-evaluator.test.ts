import { access } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { evaluatePiCandidate, type PiCandidateOperations } from "../../scripts/pi-candidate-evaluator.mjs";

const packages = { "@earendil-works/pi-coding-agent": "0.84.2", "@earendil-works/pi-tui": "0.84.2" } as const;
function operations(overrides: Partial<PiCandidateOperations> = {}): PiCandidateOperations {
  return {
    install: async () => "installed",
    compile: async () => "compiled",
    runtime: async () => "runtime passed",
    ...overrides,
  };
}

describe("isolated Pi candidate evaluator", () => {
  it("reports successful exact install, compile, runtime, and cleanup", async () => {
    let root = "";
    const report = await evaluatePiCandidate({ packages }, {
      operations: operations(),
      createRoot: async () => { root = `${process.cwd()}/.candidate-success-${Date.now()}`; const { mkdir } = await import("node:fs/promises"); await mkdir(root); return root; },
    });
    expect(report).toMatchObject({ schema: "pi-candidate-migration-report-v1", packages, passed: true, migrations: [] });
    expect(report.stages.map(stage => stage.stage)).toEqual(["install", "compile", "runtime"]);
    await expect(access(root)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("returns a bounded incompatibility migration report", async () => {
    const report = await evaluatePiCandidate({ packages }, { operations: operations({ compile: async () => { throw new Error(`API changed\n${"x".repeat(700)}`); } }) });
    expect(report.passed).toBe(false);
    expect(report.migrations[0]).toMatchObject({ stage: "compile" });
    expect(report.migrations[0]!.message.length).toBeLessThanOrEqual(500);
    expect(report.stages.map(stage => stage.stage)).toEqual(["install", "compile"]);
  });

  it("bounds timeout and always cleans the isolated root", async () => {
    let root = "";
    const runtime = vi.fn((_root: string, _packages: Readonly<Record<string, string>>, signal: AbortSignal) => new Promise<string>((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), { once: true });
    }));
    const report = await evaluatePiCandidate({ packages, timeoutMs: 10 }, {
      operations: operations({ runtime }),
      createRoot: async () => { root = `${process.cwd()}/.candidate-timeout-${Date.now()}`; const { mkdir } = await import("node:fs/promises"); await mkdir(root); return root; },
    });
    expect(report).toMatchObject({ passed: false, migrations: [{ stage: "runtime", message: "timed out after 10ms" }] });
    await expect(access(root)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejects non-exact candidate requests before installation", async () => {
    await expect(evaluatePiCandidate({ packages: { "@earendil-works/pi-coding-agent": "^0.84.2" } }, { operations: operations() })).rejects.toThrow(/not exact/);
  });
});
