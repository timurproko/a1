import { describe, expect, it, vi } from "vitest";
import { createResponseCopyExecutor, hasAsyncClipboardOutput, responseCopyDestination } from "../../../../src/integrations/pi/session-ui/response-copy-transport.js";
import { MAX_COPY_BYTES, MAX_COPY_CONTROL_BYTES } from "../../../../src/integrations/pi/session-ui/response-copy-protocol.js";
import type { SelectionCopySnapshot } from "../../../../src/ui/components/selection-copy.js";

function source(text = "hello 界 e\u0301 👩‍💻"): SelectionCopySnapshot {
  return { selection: { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } },
    revision: 1, rows: [{ text }], sourceUnits: text.length };
}

/** Real isolated preparation, but a fake terminal: these tests never write the system clipboard. */
describe("response-copy transport isolation", () => {
  it.each([{}, { SSH_TTY: "tty" }, { SSH_CONNECTION: "remote" }, { TMUX: "mux" }, { STY: "screen" }, { WSL_DISTRO_NAME: "distro" }])("routes destination for %j", env => {
    expect(responseCopyDestination(env)).toBe(Object.keys(env).length ? "terminal" : "native");
  });

  it("rejects inherently synchronous terminal output", () => {
    expect(hasAsyncClipboardOutput("linux", { isTTY: true } as NodeJS.WriteStream)).toBe(false);
    expect(hasAsyncClipboardOutput("win32", { isTTY: false } as NodeJS.WriteStream)).toBe(false);
    expect(hasAsyncClipboardOutput("win32", { isTTY: true } as NodeJS.WriteStream)).toBe(true);
  });

  it("prepares exact Unicode in a cold child while parent timers progress", async () => {
    const writes: string[] = [], phases: string[] = [];
    const execute = createResponseCopyExecutor({ destination: "terminal", terminal: { submit: async control => { writes.push(control); } } });
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 1);
    const job = execute(source(), phase => phases.push(phase));
    try {
      await expect(job.result).resolves.toEqual({ outcome: "submitted-unverified" });
      await job.stopped;
      expect(ticks).toBeGreaterThan(0);
      expect(writes).toHaveLength(1);
      expect(Buffer.from(writes[0]!.slice(7, -1), "base64").toString()).toBe(source().rows[0]!.text);
      expect(phases).toEqual(["extracted", "encoded", "submitting"]);
    } finally { clearInterval(timer); job.cancel(); }
  }, 10_000);

  it("preserves literal prompt whitespace and controls through isolated preparation without duplicate terminal delivery", async () => {
    const text = "  exact\t é 👩‍💻\n\u001b[31m literal control  \n";
    const writeText = vi.fn(async () => {}), submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ writeText, terminal: { submit } })({ ...source(text), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    expect(writeText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
    expect(submit).not.toHaveBeenCalled();
  });

  it("backpressures prepared literal fragments and preserves surrogate pairs at IPC boundaries", async () => {
    const text = "x".repeat(16_383) + "👩‍💻" + "界".repeat(30_000);
    const writeText = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ writeText })({ ...source(text), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    expect(writeText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
  });

  it("retains the side-effect fence of a non-settling injected writer after cancellation", async () => {
    let release!: () => void, submitted!: () => void;
    const ready = new Promise<void>(resolve => { submitted = resolve; });
    const write = new Promise<void>(resolve => { release = resolve; });
    const job = createResponseCopyExecutor({ writeText: async () => { submitted(); await write; } })(source(), () => {});
    await ready;
    job.cancel();
    let stopped = false;
    void job.stopped.then(() => { stopped = true; });
    await new Promise(resolve => setImmediate(resolve));
    expect(stopped).toBe(false);
    release();
    await job.stopped;
  });

  it.each([MAX_COPY_CONTROL_BYTES, 64])("enforces complete encoded-control limit %i without copying a prefix", async limit => {
    const submit = vi.fn(async () => {});
    const execute = createResponseCopyExecutor({ destination: "terminal", terminal: { submit, maxBytes: limit } });
    const bytes = 3 * Math.floor((limit - 8) / 4);
    const fits = execute(source("x".repeat(bytes)), () => {});
    await expect(fits.result).resolves.toMatchObject({ outcome: "submitted-unverified" });
    expect(submit.mock.calls).toHaveLength(1);
    const oversized = execute(source("x".repeat(bytes + 1)), () => {});
    await expect(oversized.result).resolves.toMatchObject({ outcome: "failed", failure: "size" });
    expect(submit.mock.calls).toHaveLength(1);
  }, 10_000);

  it("rejects above 16 MiB after isolated preparation without blocking parent progress", async () => {
    const submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ destination: "terminal", terminal: { submit } })(source("x".repeat(MAX_COPY_BYTES + 1)), () => {});
    let ticks = 0;
    const timer = setInterval(() => { ticks++; }, 1);
    try {
      await expect(job.result).resolves.toMatchObject({ outcome: "failed", failure: "size" });
      expect(submit).not.toHaveBeenCalled();
      expect(ticks).toBeGreaterThan(10);
    } finally { clearInterval(timer); job.cancel(); }
  }, 15_000);

  it.each(["ordinary native text", "denied", "x".repeat(MAX_COPY_BYTES)])("uses isolated native delivery without emitting terminal controls (case %#)", async text => {
    const submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ destination: "native", terminal: { submit },
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) })(source(text), () => {});
    await expect(job.result).resolves.toMatchObject(text === "denied" ? { outcome: "failed", failure: "denied" } : { outcome: "delivered" });
    expect(submit).not.toHaveBeenCalled();
  }, 15_000);

  it("kills a genuinely blocked executor and fences exit before completing cancellation", async () => {
    const submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ destination: "terminal", terminal: { submit },
      helper: new URL("./response-copy-stalled-helper.mjs", import.meta.url) })(source(), () => {});
    await new Promise(resolve => setTimeout(resolve, 150));
    job.cancel();
    await expect(job.result).resolves.toMatchObject({ outcome: "canceled" });
    await job.stopped;
    expect(submit).not.toHaveBeenCalled();
  }, 10_000);

  it("falls back only after known unavailability and exited native helper", async () => {
    const submit = vi.fn(async () => {});
    const execute = createResponseCopyExecutor({ destination: "native", terminal: { submit },
      helper: new URL("./response-copy-fault-helper.mjs", import.meta.url) });
    await expect(execute(source("abc"), () => {}).result).resolves.toMatchObject({ outcome: "submitted-unverified" });
    expect(submit).toHaveBeenCalledOnce();
  });

  it.each([1, 2])("does not falsely report success after helper fault %i", async column => {
    const submit = vi.fn(async () => {});
    const input = source();
    const job = createResponseCopyExecutor({ destination: "terminal", terminal: { submit },
      helper: new URL("./response-copy-fault-helper.mjs", import.meta.url) })({ ...input,
        selection: { ...input.selection, start: { line: 0, column } } }, () => {});
    await expect(job.result).resolves.toMatchObject({ outcome: "failed" });
    expect(submit).not.toHaveBeenCalled();
  });

  it("does not block on a missing helper and does not silently choose a wrong destination", async () => {
    const missing = createResponseCopyExecutor({ destination: "native", helper: new URL("./missing-helper.mjs", import.meta.url) })(source(), () => {});
    await expect(missing.result).resolves.toMatchObject({ outcome: "failed" });
    await expect(createResponseCopyExecutor({ destination: "terminal" })(source(), () => {}).result)
      .resolves.toMatchObject({ outcome: "failed", failure: "unsafe" });
  });

  it("keeps delayed terminal submission separate from clipboard verification", async () => {
    let submitted!: () => void;
    const ready = new Promise<void>(resolve => { submitted = resolve; });
    let release!: () => void;
    const pending = new Promise<void>(resolve => { release = resolve; });
    const job = createResponseCopyExecutor({ destination: "terminal", terminal: { submit: async () => { submitted(); await pending; } } })(source(), () => {});
    await ready;
    let done = false;
    void job.stopped.then(() => { done = true; });
    await new Promise(resolve => setImmediate(resolve));
    expect(done).toBe(false);
    release();
    await expect(job.result).resolves.toMatchObject({ outcome: "submitted-unverified" });
  });
});
