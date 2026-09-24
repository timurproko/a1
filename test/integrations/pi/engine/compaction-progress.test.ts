import { describe, expect, it, vi } from "vitest";
import { observeCompactionProgress } from "../../../../src/integrations/pi/engine/compaction-progress.js";

function controlledStream(): {
  stream: unknown;
  push(event: unknown): void;
  end(): void;
  fail(error: Error): void;
} {
  const queue: unknown[] = [];
  const waiters: Array<{
    resolve(value: IteratorResult<unknown>): void;
    reject(error: Error): void;
  }> = [];
  let outcome: "open" | "ended" | "failed" = "open";
  let failure: Error | null = null;
  return {
    stream: {
      result: () => Promise.resolve({}),
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
    end() {
      outcome = "ended";
      for (const waiter of waiters.splice(0)) waiter.resolve({ value: undefined, done: true });
    },
    fail(error: Error) {
      outcome = "failed";
      failure = error;
      for (const waiter of waiters.splice(0)) waiter.reject(error);
    },
  };
}

const settleObservation = () => new Promise<void>(resolve => setImmediate(resolve));

describe("compaction progress observer", () => {
  it("caps text estimates at 99 and reports 100 only after normal stream exhaustion", async () => {
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
    controlled.end();
    await vi.waitFor(() => expect(progress.at(-1)).toBe(100));

    expect(progress).toEqual([0, 99, 100]);
    observer!.dispose();
  });

  it.each(["ended", "disposed", "failed"] as const)("does not report completion from a %s observation", async outcome => {
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
    else controlled.end();
    await settleObservation();

    expect(progress).toEqual([0]);
    if (outcome !== "disposed") observer!.dispose();
    expect(session.agent.streamFunction).toBe(original);
  });
});
