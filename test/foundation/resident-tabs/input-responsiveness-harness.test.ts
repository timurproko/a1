import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { PRODUCT_IDENTITY } from "../../../src/product-identity.js";
import { assertMatchingInputBaseline, assertOptimizedFixture, fixtureRoleEntrySource, firstCompletedResponse, matchedResponseIndex, submitFixturePrompt, summarizeInputResponses } from "../../../scripts/development/resident-input-responsiveness.mjs";

const samples = (duration: number) => Array.from({ length: 40 }, () => duration);

describe("real-A1 input responsiveness verdict", () => {
  it("pins detached role custody to the exact artifact without inherited shell overrides", () => {
    const artifact = "D:/fixture/quoted'path/host.node";
    for (const env of [{}, {
      [PRODUCT_IDENTITY.environment.terminalHostPath]: "wrong-release.node",
      [PRODUCT_IDENTITY.environment.developmentInstanceId]: "old",
    }]) {
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

  it("keeps setup Enter separate until the complete prompt is visible, never accepting a partial echo", async () => {
    const writes: string[] = [];
    let onData: (data: string) => void = () => {};
    let disposed = false;
    let snapshot = { complete: true, markerOccurrences: 0, markerDigest: "empty" };
    const endpoint = {
      output: () => "",
      terminal: {
        write: (bytes: string) => { writes.push(bytes); },
        onData: (listener: typeof onData) => { onData = listener; return { dispose: () => { disposed = true; } }; },
      },
    };
    const addon = { TerminalFrameObserver: class {
      containsAsciiLiteral(literal: string) {
        expect(literal).toBe(prompt);
        return snapshot.complete && snapshot.markerOccurrences > 0;
      }
      observe(bytes: Uint8Array) {
        if (bytes.length > 0) snapshot = { complete: Buffer.from(bytes).toString() === "complete", markerOccurrences: 1, markerDigest: "changed" };
        return snapshot;
      }
    } };
    const prompt = "scenario=example;tab=0";
    const submitted = submitFixturePrompt(addon, endpoint, prompt, true);
    expect(writes).toEqual([prompt]);
    onData("partial");
    expect(writes).toEqual([prompt]);
    onData("complete");
    await submitted;
    expect(writes).toEqual([prompt, "\r"]);
    expect(disposed).toBe(true);
  });

  it("replays large history within the native per-call bound without dropping or recoding bytes", async () => {
    const prompt = "scenario=large-history;tab=0";
    // Invariant: the multibyte character straddles the replay chunk boundary.
    const history = "x".repeat(64 * 1024 - 1) + "界" + "y".repeat(2 * 1024 * 1024) + prompt;
    const expected = Buffer.from(history, "utf8");
    const chunks: Buffer[] = [];
    const writes: string[] = [];
    let disposed = false;
    const addon = { TerminalFrameObserver: class {
      observe(bytes: Uint8Array, marker: string) {
        if (bytes.length > 2 * 1024 * 1024) throw new Error("frame observer input is out of bounds");
        expect(marker).toBe("Type");
        chunks.push(Buffer.from(bytes));
        return { complete: true, markerOccurrences: 0, markerDigest: "empty" };
      }
      containsAsciiLiteral(literal: string) {
        expect(literal).toBe(prompt);
        expect(Buffer.concat(chunks).equals(expected)).toBe(true);
        return true;
      }
    } };
    await submitFixturePrompt(addon, {
      output: () => history,
      terminal: {
        write: bytes => { writes.push(bytes); },
        onData: () => ({ dispose: () => { disposed = true; } }),
      },
    }, prompt, true);
    expect(chunks.length).toBeGreaterThan(1);
    expect(writes).toEqual([prompt, "\r"]);
    expect(disposed).toBe(true);
  });

  it("refuses debug or unidentified native profiles rather than relaxing latency budgets", () => {
    expect(assertOptimizedFixture({ fixtureBuildProfile: () => "release" })).toBe("release");
    for (const addon of [{}, { fixtureBuildProfile: () => "debug" }, { fixtureBuildProfile: () => "unknown" }]) {
      expect(() => assertOptimizedFixture(addon)).toThrow("requires a release-profile fixture addon");
    }
  });

  it("rejects timing empty solo against a resident UI that retained the earlier streamed turn", () => {
    const resident = { complete: true, markerOccurrences: 60, markerDigest: "a".repeat(64) };
    const emptySolo = { complete: true, markerOccurrences: 0, markerDigest: "b".repeat(64) };
    expect(() => assertMatchingInputBaseline(emptySolo, resident)).toThrow("direct=0, resident=60, expected=60");
    expect(assertMatchingInputBaseline({ ...resident }, resident)).toEqual({
      matched: true, markerOccurrences: 60, semanticDigest: resident.markerDigest,
    });
  });

  it("requires matching complete content and rejects partial, duplicated, or different baselines", () => {
    const complete = { complete: true, markerOccurrences: 60, markerDigest: "a".repeat(64) };
    for (const invalid of [
      { ...complete, complete: false },
      { ...complete, markerOccurrences: 59 },
      { ...complete, markerOccurrences: 61 },
      { ...complete, markerDigest: "b".repeat(64) },
    ]) expect(() => assertMatchingInputBaseline(complete, invalid)).toThrow("unequal input baselines");
    expect(() => assertMatchingInputBaseline(complete, complete, -1)).toThrow("unequal input baselines");
    expect(() => assertMatchingInputBaseline({ ...complete, markerDigest: "invalid" }, complete)).toThrow();
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
    // Invariant: unsent input, unrelated animation, or an open/torn frame is no response.
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
