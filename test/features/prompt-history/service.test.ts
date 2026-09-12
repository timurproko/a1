import { EventEmitter } from "node:events";
import type { Worker } from "node:worker_threads";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PromptHistoryService } from "../../../src/features/prompt-history/index.js";
import type { HistoryWorkerRequest } from "../../../src/features/prompt-history/worker.js";

class TestWorker extends EventEmitter {
  readonly requests: HistoryWorkerRequest[] = [];
  stdout = { resume() {} }; stderr = { resume() {} };
  stopped = false;
  terminate = vi.fn(async () => { this.stopped = true; this.emit("exit", 0); return 0; });
  unref() {}
  postMessage(request: HistoryWorkerRequest) { this.requests.push(request); }
  reply(ok = true, extra: object = {}, id = this.requests.at(-1)?.id ?? 0) { this.emit("message", { id, ok, ...extra }); }
}
const submission = { id: "test", text: "private sentinel", timestamp: 1, kind: "prompt" as const };
const snapshot = { revision: 1, limit: 100, entries: [] };
async function fixture() {
  vi.useFakeTimers();
  const workers: TestWorker[] = [];
  const service = new PromptHistoryService({ dataDir: tmpdir(), profileRoot: join(tmpdir(), "synthetic-history-profile"), limit: 100, random: () => 0,
    createWorker: () => { const worker = new TestWorker(); workers.push(worker); return worker as unknown as Worker; },
  });
  const failures: string[] = [];
  service.onFailure(code => failures.push(code));
  service.start();
  await vi.waitFor(() => expect(workers).toHaveLength(1));
  const worker = workers[0]!;
  worker.reply(); worker.reply(true, { value: snapshot });
  return { service, worker, workers, failures };
}
afterEach(() => { vi.useRealTimers(); });

describe("bounded history recovery", () => {
  it("retries only known non-commits with the same identity and original local order", async () => {
    const { service, worker } = await fixture();
    const first = service.record(submission);
    const second = service.record({ ...submission, id: "second", text: "second" });
    worker.reply(false, { code: "busy", certainty: "uncommitted" });
    expect(service.diagnostics().state).toBe("recovering");
    await vi.advanceTimersByTimeAsync(100);
    expect(worker.requests.at(-1)).toMatchObject({ kind: "record", submission });
    worker.reply(); expect(await first).toBe("committed");
    expect(worker.requests.at(-1)).toMatchObject({ submission: { id: "second" } });
    worker.reply(); expect(await second).toBe("committed");
    worker.reply(true, { value: snapshot });
    const close = service.close(); worker.reply(); await close;
    expect(service.diagnostics().timers).toBe(0);
  });

  it("accepts delayed acknowledgements past 1.5 seconds and ignores obsolete attempt replies", async () => {
    const { service, worker } = await fixture();
    const pending = service.record(submission);
    const oldId = worker.requests.at(-1)!.id;
    worker.reply(false, { code: "busy", certainty: "uncommitted" });
    await vi.advanceTimersByTimeAsync(100);
    worker.reply(true, {}, oldId);
    await vi.advanceTimersByTimeAsync(2000);
    expect(service.diagnostics().active).toBe(true);
    worker.reply(); expect(await pending).toBe("committed");
    worker.reply(true, { value: snapshot });
    const close = service.close(); worker.reply(); await close;
  });

  it.each(["exit", "timeout", "unknown"])("does not replay an uncertain write after %s and waits for confirmed termination", async fault => {
    const { service, worker, workers } = await fixture();
    let stop!: (code: number) => void;
    worker.terminate.mockImplementation(() => new Promise(resolve => { stop = resolve; }));
    const first = service.record(submission);
    const second = service.record({ ...submission, id: "second" });
    if (fault === "timeout") await vi.advanceTimersByTimeAsync(10_000);
    else if (fault === "unknown") worker.reply(false, { code: "busy", certainty: "unknown" });
    else worker.emit("exit", 1);
    expect(await first).toBe("skipped");
    await vi.advanceTimersByTimeAsync(1000);
    expect(workers).toHaveLength(1);
    worker.reply(true, { value: { ...snapshot, revision: 99 } });
    stop(0); await vi.advanceTimersByTimeAsync(100);
    await vi.waitFor(() => expect(workers).toHaveLength(2));
    const replacement = workers[1]!; replacement.reply();
    expect(replacement.requests.at(-1)).toMatchObject({ submission: { id: "second" } });
    replacement.reply(); expect(await second).toBe("committed");
    replacement.reply(true, { value: snapshot });
    const future = service.record({ ...submission, id: "future" }); replacement.reply();
    expect(await future).toBe("committed"); replacement.reply(true, { value: snapshot });
    const close = service.close(); replacement.reply(); await close;
  });

  it("enforces count, byte, 30-second retention and capped probes without accumulating timers", async () => {
    const { service, worker } = await fixture();
    const writes = Array.from({ length: 32 }, (_, index) => service.record({ ...submission, id: String(index) }));
    expect(await service.record({ ...submission, id: "overflow" })).toBe("skipped");
    worker.reply(false, { code: "busy", certainty: "uncommitted" });
    for (let elapsed = 0; elapsed < 30_000; elapsed += 100) {
      await vi.advanceTimersByTimeAsync(100);
      if (service.diagnostics().active) worker.reply(false, { code: "busy", certainty: "uncommitted" });
      expect(service.diagnostics().timers).toBeLessThanOrEqual(3);
      expect(service.diagnostics().pending).toBeLessThanOrEqual(32);
    }
    expect(await Promise.all(writes)).toEqual(Array(32).fill("skipped"));
    expect(service.diagnostics().bytes).toBe(0);
    const attempts = worker.requests.length;
    await vi.advanceTimersByTimeAsync(5000);
    expect(worker.requests.length - attempts).toBeLessThanOrEqual(1);
    if (service.diagnostics().active) worker.reply(true, { value: snapshot });
    const large = Array.from({ length: 8 }, (_, index) => service.record({ ...submission, id: `large-${index}`, text: "x".repeat(1024 * 1024) }));
    expect(await service.record({ ...submission, id: "bytes" })).toBe("skipped");
    expect(service.diagnostics().bytes).toBe(8 * 1024 * 1024);
    const close = service.close(); await vi.advanceTimersByTimeAsync(2000); await close;
    expect(await Promise.all(large)).toEqual(Array(8).fill("skipped"));
    expect(service.diagnostics()).toMatchObject({ pending: 0, timers: 0, state: "closed" });
  });

  it.each(["schema", "corrupt"])("blocks %s conservatively and sanitizes developer-only evidence", async code => {
    const { service, worker, workers, failures } = await fixture();
    const pending = service.record(submission);
    worker.reply(false, { code, certainty: "uncommitted", error: submission.text });
    expect(await pending).toBe("skipped");
    expect(await service.record(submission)).toBe("skipped");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(workers).toHaveLength(1); expect(failures).toEqual([code]);
    expect(JSON.stringify(service.diagnostics())).not.toContain(submission.text);
    await service.close();
  });

  it("settles close during backoff, cancels timers and excludes replaced snapshot observers", async () => {
    const { service, worker, workers } = await fixture();
    const stale = vi.fn(); const detach = service.onSnapshot(stale);
    service.refresh(); detach(); const current = vi.fn(); service.onSnapshot(current);
    worker.reply(true, { value: snapshot });
    expect(stale).not.toHaveBeenCalled(); expect(current).not.toHaveBeenCalled();
    service.refresh(); worker.reply(true, { value: snapshot }); expect(current).toHaveBeenCalledOnce();
    const pending = service.record(submission); worker.reply(false, { code: "busy", certainty: "uncommitted" });
    const close = service.close(); await vi.advanceTimersByTimeAsync(2000); await close;
    expect(await pending).toBe("skipped");
    await vi.advanceTimersByTimeAsync(60_000);
    expect(workers).toHaveLength(1); expect(service.diagnostics().timers).toBe(0);
  });

  it("does not launch storage when closed before start", async () => {
    const createWorker = vi.fn();
    const service = new PromptHistoryService({ dataDir: tmpdir(), profileRoot: tmpdir(), limit: 100, createWorker });
    await service.close(); service.start();
    expect(await service.record(submission)).toBe("skipped"); expect(createWorker).not.toHaveBeenCalled();
  });
});
