import { fork, type ChildProcess } from "node:child_process";
import { once } from "node:events";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { startPasteExecutor } from "../../../src/app/session-shell/paste-executor.js";
import { screenshotPng } from "../../fixtures/image-sources.js";

// Rationale: observe real child lifetimes and IPC routing without accessing the system clipboard.
vi.mock("node:child_process", async importOriginal => {
  const actual = await importOriginal<typeof import("node:child_process")>();
  return { ...actual, fork: vi.fn(actual.fork) };
});
afterEach(() => vi.clearAllMocks());
const copyFixture = new URL("./response-copy-native-fixture.mjs", import.meta.url);
const pasteFixture = new URL("./paste-native-fixture.mjs", import.meta.url);
function snapshot(text: string) {
  return { literal: true, revision: 0, sourceUnits: text.length, rows: [{ text }],
    selection: { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } } };
}
function children(): ChildProcess[] { return vi.mocked(fork).mock.results.map(result => result.value as ChildProcess); }
// Concurrency: a helper's IPC channel closes asynchronously after "exit" (observed on Linux), so the
// released state is awaited, never sampled; the test deadline still bounds a channel that never closes.
async function assertExited(child: ChildProcess): Promise<void> {
  expect(child.exitCode !== null || child.signalCode !== null).toBe(true);
  if (child.connected) await once(child, "disconnect");
  expect(child.connected).toBe(false);
}
async function assertAllExited(): Promise<void> { for (const child of children()) await assertExited(child); }

describe("real clipboard executor lifecycle", () => {
  it("releases every helper over repeated independent copy/paste cycles without inherited terminal handles", async () => {
    const execute = createResponseCopyExecutor({ destination: "native", helper: copyFixture });
    for (let cycle = 0; cycle < 12; cycle++) {
      const copy = execute(snapshot(`generated cycle ${cycle}`), () => {});
      try { await expect(copy.result).resolves.toEqual({ outcome: "delivered" }); await copy.stopped; }
      finally { copy.cancel(); await copy.stopped; }
      const paste = startPasteExecutor(undefined, new AbortController().signal, () => {}, pasteFixture);
      try {
        await expect(paste.result).resolves.toEqual({ kind: "text", text: "external clipboard text" });
        await paste.stopped;
      } finally { paste.cancel(); await paste.stopped; }
      expect(children()).toHaveLength((cycle + 1) * 2);
      await assertAllExited();
    }
    for (const args of vi.mocked(fork).mock.calls) {
      expect(args[1]).toEqual([]);
      expect(args[2]).toMatchObject({ windowsHide: true, stdio: ["ignore", "ignore", "ignore", "ipc"] });
    }
  }, 30_000);

  it("rejects excess live executors, fences canceled startup, and recovers all capacity", async () => {
    const blocked = new URL("./response-copy-stalled-helper.mjs", import.meta.url);
    const jobs = Array.from({ length: 8 }, () => startPasteExecutor(undefined, new AbortController().signal, () => {}, blocked));
    let extra: ReturnType<typeof startPasteExecutor> | undefined;
    try {
      extra = startPasteExecutor(undefined, new AbortController().signal, () => {}, pasteFixture);
      await expect(extra.result).rejects.toMatchObject({ code: "paste-busy" });
      expect(children()).toHaveLength(8);
    } finally {
      jobs.forEach(job => job.cancel()); extra?.cancel();
      await Promise.all([...jobs.map(job => job.stopped), extra?.stopped]);
    }
    await assertAllExited();
    const recovered = Array.from({ length: 8 }, () => startPasteExecutor(undefined, new AbortController().signal, () => {}, pasteFixture));
    try {
      await Promise.all(recovered.map(async job => { await expect(job.result).resolves.toMatchObject({ kind: "text" }); await job.stopped; }));
    } finally { recovered.forEach(job => job.cancel()); await Promise.all(recovered.map(job => job.stopped)); }
    expect(children()).toHaveLength(16);
    await assertAllExited();
  }, 20_000);

  it("releases all admission capacity after an acquisition assertion fails before child exit", async ({ signal }) => {
    const failed = startPasteExecutor(undefined, signal, () => {}, new URL("./paste-rejected-held-fixture.mjs", import.meta.url));
    let assertion: unknown;
    try { await expect(failed.result).resolves.toMatchObject({ kind: "text" }); }
    catch (error) { assertion = error; }
    finally { failed.cancel(); await failed.stopped; }
    const blocked = new URL("./response-copy-stalled-helper.mjs", import.meta.url);
    const admitted = Array.from({ length: 8 }, () => startPasteExecutor(undefined, signal, () => {}, blocked));
    let ninth: ReturnType<typeof startPasteExecutor> | undefined;
    try {
      expect(assertion).toMatchObject({ message: expect.stringContaining("promise rejected") });
      expect(children()).toHaveLength(9);
      ninth = startPasteExecutor(undefined, signal, () => {}, blocked);
      await expect(ninth.result).rejects.toMatchObject({ code: "paste-busy" });
    } finally {
      failed.cancel(); admitted.forEach(job => job.cancel()); ninth?.cancel();
      await Promise.all([failed.stopped, ...admitted.map(job => job.stopped), ninth?.stopped]);
    }
    await assertAllExited();
  }, 10_000);

  it("does not start conversion when acquisition observation cancels the request", async () => {
    const controller = new AbortController();
    const job = startPasteExecutor({ kind: "image", data: screenshotPng(32, 32).toString("base64"), mimeType: "image/png" }, controller.signal,
      phase => { if (phase === "acquired-image") controller.abort(); });
    const child = children()[0]!;
    const send = vi.spyOn(child, "send");
    try {
      await expect(job.result).rejects.toMatchObject({ code: "image-canceled" });
      await job.stopped;
      expect(send.mock.calls.some(args => (args[0] as { kind?: string }).kind === "convert")).toBe(false);
      await assertExited(child);
    } finally { job.cancel(); await job.stopped; }
  }, 10_000);

  it("serializes conversion across eight live image helpers and releases every process", async () => {
    let active = 0, peak = 0, conversions = 0;
    const actualFork = await vi.importActual<typeof import("node:child_process")>("node:child_process");
    vi.mocked(fork).mockImplementation((...args: Parameters<typeof fork>) => {
      const child = actualFork.fork(...args);
      let converting = false;
      child.once("exit", () => { if (converting) active--; });
      const send = child.send.bind(child);
      vi.spyOn(child, "send").mockImplementation((...messages: Parameters<typeof child.send>) => {
        if ((messages[0] as { kind?: string }).kind === "convert") {
          converting = true; conversions++; active++; peak = Math.max(peak, active);
        }
        return send(...messages);
      });
      return child;
    });
    const content = { kind: "image" as const, data: screenshotPng(32, 32).toString("base64"), mimeType: "image/png" };
    const jobs = Array.from({ length: 8 }, () => startPasteExecutor(content, new AbortController().signal));
    try {
      await Promise.all(jobs.map(async job => { await expect(job.result).resolves.toMatchObject({ kind: "image", width: 32, height: 32 }); await job.stopped; }));
      expect(conversions).toBe(8); expect(peak).toBe(1); expect(active).toBe(0);
      await assertAllExited();
    } finally { jobs.forEach(job => job.cancel()); await Promise.all(jobs.map(job => job.stopped)); vi.mocked(fork).mockImplementation(actualFork.fork); }
  }, 30_000);
});
