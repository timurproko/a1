import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { createValidationPhaseRecorder, type ValidationPhaseEvent } from "../../scripts/release/validation-phase.mjs";

function fixture() {
  const events: ValidationPhaseEvent[] = [];
  let time = 0;
  const recorder = createValidationPhaseRecorder("fixture-test", {
    clock: () => time,
    head: "a".repeat(40),
    emit: event => events.push(event),
    environment: { GITHUB_SHA: "a".repeat(40), GITHUB_RUN_ID: "123", GITHUB_RUN_ATTEMPT: "1", RUNNER_OS: "Windows", SECRET: "do-not-record" },
  });
  return { recorder, events, advance: (ms: number) => { time += ms; } };
}

describe("bounded validation phase evidence", () => {
  it("records a start before work and keeps incomplete attempts observable", async () => {
    const { recorder, events, advance } = fixture();
    let release!: () => void;
    const pending = recorder.run("install", () => new Promise<void>(resolvePromise => { release = resolvePromise; }));
    expect(events.map(value => value.status)).toEqual(["started"]);
    advance(25);
    release();
    await pending;
    expect(events.map(value => [value.status, value.durationMs])).toEqual([["started", 0], ["passed", 25]]);
  });

  it("preserves setup failure identity without recording errors, stdout, or credentials", async () => {
    const { recorder, events } = fixture();
    const failure = Object.assign(new Error("secret-token"), { stdout: "private output" });
    await expect(recorder.run("install", () => { throw failure; })).rejects.toBe(failure);
    expect(events.at(-1)?.status).toBe("failed");
    expect(JSON.stringify(events)).not.toMatch(/secret-token|private output|do-not-record|SECRET/);
  });

  it("does not replace a primary error when writing its failure evidence also fails", async () => {
    const primary = new Error("fixture failed");
    const recorder = createValidationPhaseRecorder("fixture-test", {
      emit: event => { if (event.status === "failed") throw new Error("sink failed"); },
    });
    await expect(recorder.run("install", () => { throw primary; })).rejects.toBe(primary);
  });

  it("fails before work when start evidence cannot be recorded", async () => {
    const recorder = createValidationPhaseRecorder("fixture-test", { emit: () => { throw new Error("sink failed"); } });
    let ran = false;
    await expect(recorder.run("install", () => { ran = true; })).rejects.toThrow("sink failed");
    expect(ran).toBe(false);
  });

  it("still performs cleanup when its start evidence cannot be written", async () => {
    let cleaned = false;
    const recorder = createValidationPhaseRecorder("fixture-test", { emit: () => { throw new Error("sink failed"); } });
    await expect(recorder.cleanup("cleanup", () => { cleaned = true; })).rejects.toThrow("sink failed");
    expect(cleaned).toBe(true);
  });

  it("preserves a launch failure when teardown also fails and records both", async () => {
    const { recorder, events } = fixture();
    const primary = new Error("launch failed");
    await expect(recorder.runWithCleanup("launch", () => { throw primary; }, "cleanup", () => { throw new Error("cleanup failed"); })).rejects.toBe(primary);
    expect(events.filter(event => event.status === "failed").map(event => event.phase)).toEqual(["launch", "cleanup"]);
  });

  it("reports cleanup failure after a successful operation", async () => {
    const { recorder } = fixture();
    await expect(recorder.runWithCleanup("launch", () => 42, "cleanup", () => { throw new Error("cleanup failed"); })).rejects.toThrow("cleanup failed");
  });

  it("binds subsequent phases to exact bytes and records deferred cleanup distinctly", async () => {
    const { recorder, events } = fixture();
    recorder.bindCandidate(Buffer.from("candidate"));
    const result = await recorder.run("cleanup", () => "locked", () => "deferred");
    expect(result).toBe("locked");
    expect(events.at(-1)).toMatchObject({ status: "deferred", head: "a".repeat(40), runId: "123", cacheState: "unmeasured" });
    expect(events.at(-1)?.candidateSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("times synchronous packing and retains its failure", () => {
    const { recorder, events, advance } = fixture();
    expect(recorder.runSync("pack", () => { advance(12); return 42; })).toBe(42);
    const primary = new Error("pack failed");
    expect(() => recorder.runSync("pack", () => { throw primary; })).toThrow(primary);
    expect(events.map(value => value.status)).toEqual(["started", "passed", "started", "failed"]);
    expect(events[1]?.durationMs).toBe(12);
  });

  it("bounds phase count and labels and refuses duplicate completion", () => {
    const { recorder, events } = fixture();
    expect(() => recorder.start("\nraw output")).toThrow("invalid");
    const finish = recorder.start("install");
    finish();
    expect(() => finish()).toThrow("already completed");
    for (let index = 1; index < 128; index++) recorder.start("install")();
    expect(() => recorder.start("install")).toThrow("budget exhausted");
    expect(events).toHaveLength(256);
  });

  it("does not copy invalid environment values into evidence", () => {
    const events: ValidationPhaseEvent[] = [];
    const recorder = createValidationPhaseRecorder("fixture-test", {
      head: "invalid",
      emit: event => events.push(event), environment: { GITHUB_SHA: "secret", RUNNER_OS: "private-path" },
    });
    recorder.start("install")();
    expect(events[0]).toMatchObject({ head: null, runnerOS: null, runId: null });
  });

  it("binds the actual checkout rather than a synthetic GitHub merge SHA", () => {
    const events: ValidationPhaseEvent[] = [];
    const recorder = createValidationPhaseRecorder("fixture-test", {
      emit: event => events.push(event), environment: { GITHUB_SHA: "0".repeat(40) },
    });
    recorder.start("install")();
    expect(events[0]?.head).toBe(execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim());
    expect(events[0]?.head).not.toBe("0".repeat(40));
  });

  it("persists start records without waiting for teardown and separates invocations", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "validation-phase-"));
    try {
      const first = createValidationPhaseRecorder("fixture-test", { directory });
      const second = createValidationPhaseRecorder("fixture-test", { directory });
      first.start("install");
      await second.run("install", () => undefined);
      expect(first.outputPath).not.toBe(second.outputPath);
      const partial = (await readFile(first.outputPath, "utf8")).trim().split("\n").map(line => JSON.parse(line));
      expect(partial).toHaveLength(1);
      expect(partial[0].status).toBe("started");
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
