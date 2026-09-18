import { afterEach, describe, expect, it, vi } from "vitest";
import { startPasteExecutor } from "../../../../src/integrations/pi/session-ui/paste-executor.js";
import { ClipboardDiagnosticCapture } from "../../../../src/integrations/pi/session-ui/clipboard-diagnostics.js";
import { PastePreparationClient } from "../../../../src/integrations/pi/session-ui/paste-preparation-client.js";
import { PASTE_READ_MS, PASTE_TOTAL_MS, PASTE_STOP_MS, type PasteEvent } from "../../../../src/integrations/pi/session-ui/paste-protocol.js";
import type { PiShellClipboardContent } from "../../../../src/integrations/pi/components/index.js";

function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done; }); return { promise, resolve }; }
vi.mock("../../../../src/integrations/pi/session-ui/paste-executor.js", () => ({
  startPasteExecutor: vi.fn(),
  createPasteHelperPool: () => ({ warm() {}, replenish() {}, take() { return undefined; }, dispose() {}, warmed: false }),
}));
afterEach(() => { vi.useRealTimers(); vi.clearAllMocks(); });

/** Deterministic lifetime gates, separate from real blocked-helper tests in paste-executor.test.ts. */
describe("paste admission and insertion lifetime", () => {
  it("starts independent empty reads off the input stack and holds admission through insertion acknowledgment", async () => {
    vi.useFakeTimers();
    const events: PasteEvent[] = [], read = vi.fn(async () => null), adopt = vi.fn(() => "empty");
    const client = new PastePreparationClient({ onEvent: event => events.push(event) });
    const job = client.start({ kind: "provided", read }, adopt, () => {});
    expect(read).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(0);
    await expect(job.result).resolves.toBe("empty");
    expect(events.some(event => event.phase === "settled")).toBe(false);
    job.complete();
    await vi.advanceTimersByTimeAsync(0);
    expect(events.at(-1)).toMatchObject({ phase: "cleanup", pending: 0 });
    await client.dispose();
  });

  it("retains pending-byte evidence through insertion after the helper exits", async () => {
    vi.useFakeTimers();
    let snapshot = "";
    const events: PasteEvent[] = [];
    const capture = new ClipboardDiagnosticCapture("unused.json", async (_path, data) => { snapshot = data; });
    vi.mocked(startPasteExecutor).mockImplementationOnce((_content, _signal, phase) => {
      phase?.("acquired-text", 20); phase?.("classifying"); phase?.("prepared", 20); phase?.("cleanup");
      return { result: Promise.resolve({ kind: "text", text: "generated" }), stopped: Promise.resolve(), cancel() {} };
    });
    const client = new PastePreparationClient({ onEvent: event => { events.push(event); capture.paste(event); } });
    try {
      const job = client.start({ kind: "text", text: "generated" }, () => "inserted", () => {});
      await vi.advanceTimersByTimeAsync(0);
      await expect(job.result).resolves.toBe("inserted");
      await capture.flush();
      expect(events.map(event => event.phase)).toEqual(["admitted", "acquiring", "acquired-text", "classifying", "prepared", "inserting"]);
      expect(JSON.parse(snapshot).records.at(-1)).toMatchObject({ phase: "inserting", pendingBytes: 20 });
      job.complete();
      await vi.advanceTimersByTimeAsync(0); await capture.flush();
      expect(events.filter(event => event.phase === "cleanup")).toHaveLength(1);
      expect(JSON.parse(snapshot).records.at(-1)).toMatchObject({ phase: "cleanup", pending: 0, pendingBytes: 0 });
    } finally { await client.dispose(); capture.dispose(); }
  });

  it("expires acquisition at five seconds, suppresses a late result, and permits a fresh independent read", async () => {
    vi.useFakeTimers();
    const pending = deferred<PiShellClipboardContent | null>(), adopt = vi.fn(() => "stale");
    const client = new PastePreparationClient();
    const old = client.start({ kind: "provided", read: () => pending.promise }, adopt, () => {});
    await vi.advanceTimersByTimeAsync(PASTE_READ_MS - 1);
    expect(old.isCurrent()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await expect(old.result).rejects.toMatchObject({ code: "paste-timeout" });
    const fresh = client.start({ kind: "provided", read: async () => null }, () => "fresh", () => {});
    await vi.advanceTimersByTimeAsync(0);
    await expect(fresh.result).resolves.toBe("fresh"); fresh.complete();
    pending.resolve({ kind: "text", text: "must not be inserted" });
    await vi.advanceTimersByTimeAsync(0);
    expect(adopt).not.toHaveBeenCalled();
    await client.dispose();
  });

  it("includes predecessor wait in acquisition and does not acquire stale clipboard content after failure", async () => {
    vi.useFakeTimers();
    const predecessor = deferred<boolean>(), read = vi.fn(async () => null);
    const client = new PastePreparationClient();
    const job = client.start({ kind: "provided", before: () => predecessor.promise, read }, () => "", () => {});
    await vi.advanceTimersByTimeAsync(PASTE_READ_MS);
    await expect(job.result).rejects.toMatchObject({ code: "paste-timeout" });
    predecessor.resolve(true);
    await vi.advanceTimersByTimeAsync(0);
    expect(read).not.toHaveBeenCalled();
    const denied = client.start({ kind: "provided", before: async () => false, read }, () => "", () => {});
    await vi.advanceTimersByTimeAsync(0);
    await expect(denied.result).rejects.toMatchObject({ code: "paste-write-failed" });
    expect(read).not.toHaveBeenCalled();
    await client.dispose();
  });

  it("keeps the original fifteen-second deadline through slow insertion rather than restarting after read", async () => {
    vi.useFakeTimers();
    const read = deferred<null>(), insertion = deferred<string>();
    const client = new PastePreparationClient();
    const job = client.start({ kind: "provided", read: () => read.promise }, () => insertion.promise, () => {});
    await vi.advanceTimersByTimeAsync(4_000); read.resolve(null);
    await vi.advanceTimersByTimeAsync(PASTE_TOTAL_MS - 4_001);
    expect(job.isCurrent()).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    await expect(job.result).rejects.toMatchObject({ code: "paste-timeout" });
    insertion.resolve("late");
    await vi.advanceTimersByTimeAsync(0);
    await client.dispose();
  });

  it("rejects a ninth request without superseding eight accepted reads and keeps unconfirmed reads within capacity", async () => {
    vi.useFakeTimers();
    const events: PasteEvent[] = [], pending = deferred<null>();
    const client = new PastePreparationClient({ onEvent: event => events.push(event) });
    const jobs = Array.from({ length: 8 }, () => client.start({ kind: "provided", read: () => pending.promise }, () => "", () => {}));
    await vi.advanceTimersByTimeAsync(0);
    const extra = client.start({ kind: "provided", read: async () => null }, () => "", () => {});
    await expect(extra.result).rejects.toMatchObject({ code: "paste-busy" });
    expect(jobs.every(job => job.isCurrent())).toBe(true);
    await vi.advanceTimersByTimeAsync(PASTE_READ_MS);
    await Promise.all(jobs.map(job => expect(job.result).rejects.toMatchObject({ code: "paste-timeout" })));
    const quarantined = client.start({ kind: "provided", read: async () => null }, () => "", () => {});
    await expect(quarantined.result).rejects.toMatchObject({ code: "paste-busy" });
    const disposal = client.dispose();
    await vi.advanceTimersByTimeAsync(PASTE_STOP_MS); await disposal;
    pending.resolve(null); await vi.advanceTimersByTimeAsync(0);
    expect(Math.max(...events.map(event => event.pending))).toBeLessThanOrEqual(8);
    expect(events.at(-1)).toMatchObject({ phase: "cleanup", pending: 0 });
  });
});
