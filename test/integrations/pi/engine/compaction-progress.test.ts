import { describe, expect, it, vi } from "vitest";
import { observeCompactionProgress } from "../../../../src/integrations/pi/engine/compaction-progress.js";

function controlledStream(): {
  stream: unknown;
  push(event: unknown): void;
  resolve(stopReason: "stop" | "error" | "aborted" | "length"): void;
  end(): void;
  fail(error: Error): void;
} {
  const queue: unknown[] = [];
  const waiters: Array<{
    resolve(value: IteratorResult<unknown>): void;
    reject(error: Error): void;
  }> = [];
  let resolveResult!: (value: { stopReason: string }) => void;
  let rejectResult!: (error: Error) => void;
  const result = new Promise<{ stopReason: string }>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  let outcome: "open" | "ended" | "failed" = "open";
  let failure: Error | null = null;
  return {
    stream: {
      result: () => result,
      [Symbol.asyncIterator]() {
        return {
          next: () => {
            if (queue.length > 0) return Promise.resolve({ value: queue.shift(), done: false });
            if (outcome === "ended") return Promise.resolve({ value: undefined, done: true });
            if (outcome === "failed") return Promise.reject(failure);
            return new Promise<IteratorResult<unknown>>((resolve, reject) => waiters.push({ resolve, reject }));
          },
        };
      },
    },
    push(event: unknown) {
      const waiter = waiters.shift();
      if (waiter) waiter.resolve({ value: event, done: false });
      else queue.push(event);
    },
    resolve(stopReason) {
      resolveResult({ stopReason });
    },
    end() {
      outcome = "ended";
      for (const waiter of waiters.splice(0)) waiter.resolve({ value: undefined, done: true });
    },
    fail(error: Error) {
      outcome = "failed";
      failure = error;
      rejectResult(error);
      for (const waiter of waiters.splice(0)) waiter.reject(error);
    },
  };
}

const settleObservation = () => new Promise<void>(resolve => setImmediate(resolve));

describe("compaction progress observer", () => {
  it("caps text estimates at 99 and reports 100 from a successful result before iterator exhaustion", async () => {
    const controlled = controlledStream();
    const original = vi.fn(async () => controlled.stream);
    const session = {
      agent: { streamFunction: original },
      sessionManager: { getBranch: () => [{ type: "compaction", summary: "xxxx" }] },
    };
    const progress: number[] = [];
    const observer = observeCompactionProgress(session, percent => progress.push(percent));
    expect(observer).not.toBeNull();

    observer!.begin();
    await session.agent.streamFunction();
    controlled.push({ type: "text_delta", delta: "xxxx" });
    await vi.waitFor(() => expect(progress.at(-1)).toBe(99));
    controlled.resolve("stop");
    await vi.waitFor(() => expect(progress.at(-1)).toBe(100));
    controlled.push({ type: "text_delta", delta: "late" });
    await settleObservation();

    expect(progress).toEqual([0, 99, 100]);
    observer!.end();
    controlled.end();
    observer!.dispose();
  });

  it.each(["ended", "disposed", "failed", "error-result", "aborted-result", "length-result"] as const)(
    "does not report completion from a %s observation",
    async outcome => {
      const controlled = controlledStream();
      const original = vi.fn(async () => controlled.stream);
      const session = { agent: { streamFunction: original } };
      const progress: number[] = [];
      const observer = observeCompactionProgress(session, percent => progress.push(percent));
      expect(observer).not.toBeNull();

      observer!.begin();
      await session.agent.streamFunction();
      if (outcome === "ended") observer!.end();
      if (outcome === "disposed") observer!.dispose();
      if (outcome === "failed") controlled.fail(new Error("stream failed"));
      else if (outcome.endsWith("-result")) controlled.resolve(outcome.slice(0, -7) as "error" | "aborted" | "length");
      else controlled.resolve("stop");
      await settleObservation();

      expect(progress).toEqual([0]);
      controlled.end();
      if (outcome !== "disposed") observer!.dispose();
      expect(session.agent.streamFunction).toBe(original);
    },
  );
});
