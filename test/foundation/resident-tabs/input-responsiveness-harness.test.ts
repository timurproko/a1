import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { fixtureRoleEntrySource, firstCompletedResponse, matchedResponseIndex, summarizeInputResponses } from "../../../scripts/development/resident-input-responsiveness.mjs";

const samples = (duration: number) => Array.from({ length: 40 }, () => duration);

describe("real-A1 input responsiveness verdict", () => {
  it("pins detached role custody to the exact artifact without inherited shell overrides", () => {
    const artifact = "D:/fixture/quoted'path/host.node";
    for (const env of [{}, { A1_TERMINAL_HOST_PATH: "wrong-release.node", A1_DEV_INSTANCE_ID: "old" }]) {
      const loaded: string[] = [];
      const calls: unknown[] = [];
      const process = { env, execPath: "node.exe", argv: ["node.exe", "fixed.cjs", "holder", "--tab", "synthetic"], exitCode: -1 };
      runInNewContext(fixtureRoleEntrySource(artifact), {
        process, __filename: "fixed.cjs",
        require(path: string) { loaded.push(path); return { runRole(...args: unknown[]) { calls.push(args); return 0; } }; },
      });
      expect(loaded).toEqual([artifact]);
      expect(calls).toEqual([[process.argv.slice(2), { executable: "node.exe", entry: "fixed.cjs", artifact }]]);
      expect(process.exitCode).toBe(0);
    }
  });

  it("retains the existing input plus presentation envelope relative to direct solo", () => {
    expect(summarizeInputResponses(samples(2), samples(51))).toMatchObject({ passed: true, allowedOverheadMs: 49 });
    expect(summarizeInputResponses(samples(2), samples(52))).toMatchObject({
      passed: false, faults: ["resident input response p95 exceeds direct solo plus 49 ms"],
    });
  });

  it("requires forty valid samples and rejects prolonged stalls independently of p95", () => {
    expect(summarizeInputResponses([], samples(1)).passed).toBe(false);
    expect(summarizeInputResponses(samples(1), samples(1).slice(1)).passed).toBe(false);
    for (const invalid of [-1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(summarizeInputResponses(samples(1), [...samples(1).slice(1), invalid]).passed).toBe(false);
    }
    const stalled = summarizeInputResponses(samples(1), [...samples(1).slice(1), 1_001]);
    expect(stalled.resident.p95Ms).toBe(1);
    expect(stalled.faults).toContain("resident: input response stalled beyond 1000 ms");
  });

  it("acknowledges coalesced earlier inputs only with a later known completed state", () => {
    const hashes = ["first", "second", "third"];
    const snapshot = { complete: true, markerOccurrences: 1, markerDigest: "third" };
    expect(matchedResponseIndex(hashes, snapshot, -1, 3)).toBe(2);
    // A state for an input not sent yet, unrelated animation, or an open/torn frame is no response.
    expect(matchedResponseIndex(hashes, snapshot, -1, 2)).toBe(-1);
    expect(matchedResponseIndex(hashes, { ...snapshot, markerDigest: "animation" }, -1, 3)).toBe(-1);
    expect(matchedResponseIndex(hashes, { ...snapshot, complete: false }, -1, 3)).toBe(-1);
    expect(matchedResponseIndex(hashes, { ...snapshot, markerOccurrences: 0 }, -1, 3)).toBe(-1);
  });

  it("does not make a torn early direct menu update the expected resident state", () => {
    const final = { complete: true, markerOccurrences: 2, markerDigest: "complete-menu" };
    const frames = [
      { snapshot: { ...final, markerDigest: "partially-repainted-menu" }, receivedAt: 2 },
      { snapshot: { ...final, complete: false }, receivedAt: 3 },
      { snapshot: final, receivedAt: 5 },
      { snapshot: final, receivedAt: 15 },
    ];
    expect(firstCompletedResponse(frames, final)?.receivedAt).toBe(5);
    expect(firstCompletedResponse(frames.slice(0, 2), final)).toBeUndefined();
    expect(firstCompletedResponse(frames, { ...final, complete: false })).toBeUndefined();
    expect(firstCompletedResponse(frames, { ...final, markerOccurrences: 0 })).toBeUndefined();
  });

  it("never counts stale or repeated screen states as a newer input response", () => {
    const hashes = ["first", "second", "third"];
    expect(matchedResponseIndex(hashes, { complete: true, markerOccurrences: 1, markerDigest: "first" }, 1, 3)).toBe(1);
    expect(matchedResponseIndex(hashes, { complete: true, markerOccurrences: 1, markerDigest: "second" }, 1, 3)).toBe(1);
  });
});
