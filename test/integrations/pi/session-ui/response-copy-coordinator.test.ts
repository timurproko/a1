import { afterEach, describe, expect, it, vi } from "vitest";
import { ResponseCopyCoordinator } from "../../../../src/integrations/pi/session-ui/response-copy-coordinator.js";
import { COPY_CLEANUP_MS, COPY_DEADLINE_MS, type CopyResult, type ResponseCopyEvent } from "../../../../src/integrations/pi/session-ui/response-copy-protocol.js";
import type { CopyPhaseObserver, ResponseCopyExecutor } from "../../../../src/integrations/pi/session-ui/response-copy-transport.js";
import type { SelectionCopySnapshot } from "../../../../src/ui/components/selection-copy.js";

function snapshot(text = "secret selected text"): SelectionCopySnapshot {
  return { selection: { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } },
    revision: 1, rows: [{ text }], sourceUnits: text.length };
}
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
function fixture() {
  vi.useFakeTimers();
  const executions: { result: ReturnType<typeof deferred<CopyResult>>; stopped: ReturnType<typeof deferred<void>>; cancel: ReturnType<typeof vi.fn>; phase: CopyPhaseObserver; text: string }[] = [];
  const events: ResponseCopyEvent[] = [];
  const failures = vi.fn();
  const execute: ResponseCopyExecutor = (source, phase) => {
    const result = deferred<CopyResult>(), stopped = deferred<void>(), cancel = vi.fn();
    executions.push({ result, stopped, cancel, phase, text: source.rows[0]!.text });
    return { result: result.promise, stopped: stopped.promise, cancel };
  };
  const coordinator = new ResponseCopyCoordinator({ execute, onFailure: failures, onEvent: event => events.push(event) });
  return { coordinator, executions, failures, events };
}
afterEach(() => { vi.useRealTimers(); });

/** Controlled deadlines are the automated gate; shared-CI wall-clock latency is not. */
describe("bounded response-copy coordinator", () => {
  it("yields before starting and does not gate input/timers on clipboard resolution", async () => {
    const { coordinator, executions, events } = fixture();
    const result = coordinator.submit(snapshot());
    expect(executions).toHaveLength(0);
    let input = false;
    setTimeout(() => { input = true; }, 80);
    await vi.advanceTimersByTimeAsync(80);
    expect(executions).toHaveLength(1);
    expect(input).toBe(true);
    executions[0]!.phase("submitting", 20, "injected");
    executions[0]!.result.resolve({ outcome: "delivered" });
    executions[0]!.stopped.resolve();
    await expect(result).resolves.toEqual({ outcome: "delivered" });
    expect(JSON.stringify(events)).not.toContain("secret");
    expect(JSON.stringify(events)).not.toContain(Buffer.from("secret selected text").toString("base64"));
    coordinator.dispose();
  });

  it("expires automatically and quarantines an executor until its actual stop fence", async () => {
    const { coordinator, executions, failures } = fixture();
    const result = coordinator.submit(snapshot());
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.phase("submitting", 20, "injected");
    await vi.advanceTimersByTimeAsync(COPY_DEADLINE_MS);
    await expect(result).resolves.toEqual({ outcome: "timed-out" });
    expect(executions[0]!.cancel).toHaveBeenCalledOnce();
    expect(failures).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(COPY_CLEANUP_MS);
    await expect(coordinator.submit(snapshot("next"))).resolves.toMatchObject({ outcome: "failed", failure: "unsafe" });
    expect(executions).toHaveLength(1);
    executions[0]!.result.resolve({ outcome: "delivered" });
    executions[0]!.stopped.resolve();
    await vi.advanceTimersByTimeAsync(0);
    const next = coordinator.submit(snapshot("recovered"));
    await vi.advanceTimersByTimeAsync(0);
    expect(executions[1]!.text).toBe("recovered");
    executions[1]!.result.resolve({ outcome: "delivered" }); executions[1]!.stopped.resolve();
    await expect(next).resolves.toMatchObject({ outcome: "delivered" });
    coordinator.dispose();
  });

  it("keeps one active and only the newest pending request without late overwrite", async () => {
    const { coordinator, executions, events } = fixture();
    const first = coordinator.submit(snapshot("first"));
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.phase("submitting", 5, "injected");
    const middle = coordinator.submit(snapshot("middle"));
    const latest = coordinator.submit(snapshot("latest"));
    await expect(middle).resolves.toEqual({ outcome: "superseded" });
    expect(executions).toHaveLength(1);
    executions[0]!.result.resolve({ outcome: "delivered" });
    await expect(first).resolves.toEqual({ outcome: "delivered" });
    await vi.advanceTimersByTimeAsync(0);
    expect(executions).toHaveLength(1); // Concurrency: promise resolution alone is not a side-effect fence.
    executions[0]!.stopped.resolve();
    await vi.advanceTimersByTimeAsync(1);
    expect(executions.map(job => job.text)).toEqual(["first", "latest"]);
    executions[1]!.result.resolve({ outcome: "delivered" }); executions[1]!.stopped.resolve();
    await expect(latest).resolves.toMatchObject({ outcome: "delivered" });
    expect(Math.max(...events.map(event => event.pending))).toBeLessThanOrEqual(2);
    coordinator.dispose();
  });

  it("supersedes preparation before delivery and does not start until the old worker stops", async () => {
    const { coordinator, executions } = fixture();
    const first = coordinator.submit(snapshot("old"));
    await vi.advanceTimersByTimeAsync(0);
    const next = coordinator.submit(snapshot("new"));
    await expect(first).resolves.toEqual({ outcome: "superseded" });
    expect(executions[0]!.cancel).toHaveBeenCalledOnce();
    executions[0]!.result.resolve({ outcome: "canceled" }); executions[0]!.stopped.resolve();
    await vi.advanceTimersByTimeAsync(1);
    expect(executions[1]!.text).toBe("new");
    coordinator.dispose();
    await expect(next).resolves.toEqual({ outcome: "canceled" });
    executions[1]!.result.resolve({ outcome: "canceled" }); executions[1]!.stopped.resolve();
  });

  it("bounds a prior prompt gate and prevents its late completion from starting a canceled copy", async () => {
    const { coordinator, executions } = fixture();
    const prompt = deferred<void>();
    const copy = coordinator.submit(snapshot(), prompt.promise);
    await vi.advanceTimersByTimeAsync(COPY_DEADLINE_MS);
    await expect(copy).resolves.toEqual({ outcome: "timed-out" });
    prompt.resolve();
    await vi.advanceTimersByTimeAsync(1);
    expect(executions).toHaveLength(0);
    coordinator.dispose();
  });

  it("bounds paste waiting and does not reuse a prior clipboard value after known failure", async () => {
    const { coordinator, executions } = fixture();
    coordinator.submit(snapshot());
    const paste = coordinator.canPaste(new AbortController().signal);
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.result.resolve({ outcome: "failed", failure: "denied" }); executions[0]!.stopped.resolve();
    await expect(paste).resolves.toBe(false);
    await expect(coordinator.canPaste(new AbortController().signal)).resolves.toBe(true);
    coordinator.dispose();
  });

  it("does not let a later prompt write overtake a quarantined response", async () => {
    const { coordinator, executions } = fixture();
    coordinator.submit(snapshot());
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.phase("submitting", 20, "injected");
    await vi.advanceTimersByTimeAsync(COPY_DEADLINE_MS + COPY_CLEANUP_MS);
    await expect(coordinator.submitText("prompt copy")).resolves.toMatchObject({ outcome: "failed", failure: "unsafe" });
    expect(executions).toHaveLength(1);
    executions[0]!.result.resolve({ outcome: "canceled" }); executions[0]!.stopped.resolve();
    coordinator.dispose();
  });

  it("expires a stuck prompt write without poisoning later independent paste", async () => {
    const { coordinator, executions } = fixture();
    const copy = coordinator.submitText("exact prompt");
    const dependent = coordinator.capturePasteBarrier();
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.phase("submitting", 12, "injected");
    await vi.advanceTimersByTimeAsync(COPY_DEADLINE_MS);
    await expect(copy).resolves.toEqual({ outcome: "timed-out" });
    await expect(dependent(new AbortController().signal)).resolves.toBe(false);
    await expect(coordinator.capturePasteBarrier()(new AbortController().signal)).resolves.toBe(true);
    executions[0]!.result.resolve({ outcome: "canceled" }); executions[0]!.stopped.resolve();
    coordinator.dispose();
  });

  it("does not add a later write to an already captured independent paste", async () => {
    const { coordinator } = fixture();
    const independent = coordinator.capturePasteBarrier();
    coordinator.submitText("later");
    await expect(independent(new AbortController().signal)).resolves.toBe(true);
    coordinator.dispose();
  });

  it("cancels pending work on replacement and disposal with no late feedback", async () => {
    const { coordinator, executions, failures } = fixture();
    const first = coordinator.submit(snapshot());
    await vi.advanceTimersByTimeAsync(0);
    executions[0]!.phase("submitting", 20, "injected");
    const second = coordinator.submit(snapshot("pending"));
    coordinator.reset();
    await expect(first).resolves.toEqual({ outcome: "canceled" });
    await expect(second).resolves.toEqual({ outcome: "canceled" });
    executions[0]!.result.resolve({ outcome: "failed" }); executions[0]!.stopped.resolve();
    await vi.advanceTimersByTimeAsync(1);
    expect(failures).not.toHaveBeenCalled();
    coordinator.dispose();
    await expect(coordinator.submit(snapshot())).resolves.toMatchObject({ outcome: "canceled" });
    expect(executions).toHaveLength(1);
  });
});
