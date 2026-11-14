import { afterEach, describe, expect, it, vi } from "vitest";
import { createResponseCopyExecutor } from "../../../src/app/session-shell/response-copy-transport.js";
import { responseCopyDestination } from "../../../src/app/session-shell/response-copy-policy.js";
import { MAX_COPY_BYTES, MAX_COPY_CONTROL_BYTES } from "../../../src/app/session-shell/response-copy-protocol.js";
import type { SelectionCopySnapshot } from "../../../src/ui/components/selection-copy.js";

function source(text = "hello 界 e\u0301 👩‍💻"): SelectionCopySnapshot {
  return { selection: { start: { line: 0, column: 0 }, end: { line: 0, column: Number.MAX_SAFE_INTEGER } },
    revision: 1, rows: [{ text }], sourceUnits: text.length };
}

/** Real isolated preparation, but a fake terminal: these tests never write the system clipboard. */
describe("response-copy transport isolation", () => {
  afterEach(() => vi.unstubAllEnvs());

  it.each([
    {}, { HC_TERMINAL_ID: "", TERM_PROGRAM: "" }, { TERM_PROGRAM: "ghostty" },
    { HC_TERMINAL_ID: "", TERM_PROGRAM: "ghostty" },
  ])("preserves local destination for %j", env => {
    expect(responseCopyDestination(env)).toBe("native");
  });

  it.each([
    { HC_TERMINAL_ID: "terminal-id" },
    { HC_TERMINAL_ID: "terminal-id", TERM_PROGRAM: "herdr" },
    { HC_TERMINAL_ID: "terminal-id", TERM_PROGRAM: "ghostty" },
    { HC_TERMINAL_ID: "terminal-id", TERM_PROGRAM: "" },
    { TERM_PROGRAM: "herdr" }, { HC_TERMINAL_ID: "", TERM_PROGRAM: "herdr" },
    { SSH_TTY: "tty" }, { SSH_CONNECTION: "remote" }, { SSH_CLIENT: "client" },
    { TMUX: "mux" }, { STY: "screen" }, { WSL_DISTRO_NAME: "distro" },
  ])("routes terminal-owned destination for %j", env => {
    expect(responseCopyDestination(env)).toBe("terminal");
  });

  it.each([
    { identity: "terminal-id", program: "ghostty", text: "How" },
    { identity: "terminal-id", program: undefined, text: "hello 界 e\u0301 👩‍💻" },
    { identity: undefined, program: "herdr", text: "program-only" },
  ])("submits Herdr copy once even when native delivery would succeed ($program)", async ({ identity, program, text }) => {
    for (const name of ["SSH_CONNECTION", "SSH_CLIENT", "SSH_TTY", "TMUX", "STY", "WSL_DISTRO_NAME"]) vi.stubEnv(name, "");
    vi.stubEnv("HC_TERMINAL_ID", identity);
    vi.stubEnv("TERM_PROGRAM", program);
    const submit = vi.fn(async () => {}), platformWriteText = vi.fn(async () => true);
    const transports: string[] = [];
    const execute = createResponseCopyExecutor({ terminal: { submit }, platformWriteText,
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) });
    const job = execute(source(text), (_phase, _bytes, transport) => transports.push(transport));
    try {
      await expect(job.result).resolves.toEqual({ outcome: "submitted-unverified" });
      await job.stopped;
      expect(submit).toHaveBeenCalledExactlyOnceWith(`\u001b]52;c;${Buffer.from(text).toString("base64")}\u0007`, expect.any(AbortSignal));
      expect(platformWriteText).not.toHaveBeenCalled();
      expect(transports).toEqual(["terminal", "terminal", "terminal"]);
    } finally { job.cancel(); execute.dispose(); }
  }, 10_000);

  it.each(["missing", "denied", "size"])("does not substitute host clipboard for a %s Herdr terminal route", async fault => {
    vi.stubEnv("HC_TERMINAL_ID", "terminal-id");
    const submit = vi.fn(async () => { if (fault === "denied") throw new Error("terminal unavailable"); });
    const platformWriteText = vi.fn(async () => true);
    const execute = createResponseCopyExecutor({ platformWriteText,
      ...(fault === "missing" ? {} : { terminal: { submit, maxBytes: fault === "size" ? 8 : MAX_COPY_CONTROL_BYTES } }),
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) });
    const job = execute(source("How"), () => {});
    try {
      await expect(job.result).resolves.toEqual({ outcome: "failed", failure: fault === "missing" ? "unsafe" : fault === "size" ? "size" : "transport" });
      await job.stopped;
      expect(platformWriteText).not.toHaveBeenCalled();
      expect(submit).toHaveBeenCalledTimes(fault === "denied" ? 1 : 0);
    } finally { job.cancel(); execute.dispose(); }
  }, 10_000);

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

  it("takes the warm spare for a copy, replenishes it afterwards, and stops it on dispose", async () => {
    const writeText = vi.fn(async () => {});
    const execute = createResponseCopyExecutor({ writeText });
    expect(execute.warmed).toBe(false);
    execute.warm();
    expect(execute.warmed).toBe(true);
    await new Promise(resolve => setTimeout(resolve, 1_500));
    const started = performance.now();
    const job = execute({ ...source("spare copy"), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    expect(performance.now() - started).toBeLessThan(500);
    expect(writeText).toHaveBeenCalledWith("spare copy", expect.any(AbortSignal));
    await vi.waitFor(() => expect(execute.warmed).toBe(true));
    execute.dispose();
    expect(execute.warmed).toBe(false);
  }, 15_000);

  it("preserves literal prompt whitespace and controls through isolated preparation without duplicate terminal delivery", async () => {
    const text = "  exact\t é 👩‍💻\n\u001b[31m literal control  \n";
    const writeText = vi.fn(async () => {}), submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ writeText, terminal: { submit } })({ ...source(text), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    expect(writeText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
    expect(submit).not.toHaveBeenCalled();
  });

  it("delivers an empty normalized frame payload through injected and terminal routes", async () => {
    const writeText = vi.fn(async () => {});
    const prepared = createResponseCopyExecutor({ writeText })({ ...source(""), literal: true }, () => {});
    await expect(prepared.result).resolves.toEqual({ outcome: "delivered" });
    expect(writeText).toHaveBeenCalledWith("", expect.any(AbortSignal));

    const submit = vi.fn(async () => {});
    const terminal = createResponseCopyExecutor({ destination: "terminal", terminal: { submit } })(
      { ...source(""), literal: true }, () => {});
    await expect(terminal.result).resolves.toEqual({ outcome: "submitted-unverified" });
    expect(submit).toHaveBeenCalledWith("\u001b]52;c;\u0007", expect.any(AbortSignal));
  });

  it("backpressures prepared literal fragments and preserves surrogate pairs at IPC boundaries", async () => {
    const text = "x".repeat(16_383) + "👩‍💻" + "界".repeat(30_000);
    const writeText = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ writeText })({ ...source(text), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    expect(writeText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
  });

  it("reaps a helper that lingers after a complete prepared result and still delivers the exact text", async () => {
    const text = "prepared before the helper lingered";
    const writeText = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ writeText, helper: new URL("./response-copy-lingering-helper.mjs", import.meta.url) })(
      { ...source(text), literal: true }, () => {});
    await expect(job.result).resolves.toEqual({ outcome: "delivered" });
    await job.stopped;
    expect(writeText).toHaveBeenCalledOnce();
    expect(writeText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
  }, 10_000);

  it("discards a lingering helper's prepared text when the owner cancels before delivery", async () => {
    const writeText = vi.fn(async () => {});
    let extracted!: () => void;
    const ready = new Promise<void>(resolve => { extracted = resolve; });
    const job = createResponseCopyExecutor({ writeText, helper: new URL("./response-copy-lingering-helper.mjs", import.meta.url) })(
      { ...source("prepared then canceled"), literal: true }, phase => { if (phase === "extracted") extracted(); });
    await ready;
    await new Promise(resolve => setTimeout(resolve, 50));
    job.cancel();
    await expect(job.result).resolves.toEqual({ outcome: "canceled" });
    await job.stopped;
    expect(writeText).not.toHaveBeenCalled();
  }, 10_000);

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

  it.each(["ordinary native text", "transient", "x".repeat(MAX_COPY_BYTES)])("uses isolated native retry without emitting terminal controls (case %#)", async text => {
    const submit = vi.fn(async () => {});
    const job = createResponseCopyExecutor({ destination: "native", terminal: { submit },
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) })(source(text), () => {});
    await expect(job.result).resolves.toMatchObject({ outcome: "delivered" });
    expect(submit).not.toHaveBeenCalled();
  }, 15_000);

  it.each([
    { text: "denied", helper: "response-copy-native-fixture.mjs" },
    { text: "platform fallback", helper: "response-copy-platform-fixture.mjs" },
  ])("uses a cancelable platform writer after the native route stops ($text)", async ({ text, helper }) => {
    const submit = vi.fn(async () => {}), platformWriteText = vi.fn(async () => true);
    const transports: string[] = [];
    const job = createResponseCopyExecutor({ destination: "native", terminal: { submit }, platformWriteText,
      helper: new URL(`./${helper}`, import.meta.url) })(source(text), (_phase, _bytes, transport) => transports.push(transport));
    await expect(job.result).resolves.toMatchObject({ outcome: "delivered" });
    expect(platformWriteText).toHaveBeenCalledWith(text, expect.any(AbortSignal));
    expect(transports).toContain("platform");
    expect(submit).not.toHaveBeenCalled();
  }, 15_000);

  it("cancels an in-flight platform writer before any terminal fallback", async () => {
    const submit = vi.fn(async () => {});
    let admitted!: () => void;
    const started = new Promise<void>(resolve => { admitted = resolve; });
    const platformWriteText = vi.fn(async (_text: string, signal: AbortSignal) => {
      admitted();
      return new Promise<boolean>(resolve => signal.addEventListener("abort", () => resolve(false), { once: true }));
    });
    const job = createResponseCopyExecutor({ destination: "native", terminal: { submit }, platformWriteText,
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) })(source("denied"), () => {});
    await started;
    job.cancel();
    await expect(job.result).resolves.toEqual({ outcome: "canceled" });
    await job.stopped;
    expect(submit).not.toHaveBeenCalled();
  }, 15_000);

  it("uses the certified terminal route only after local writers stop", async () => {
    const submit = vi.fn(async () => {}), platformWriteText = vi.fn(async () => false);
    const job = createResponseCopyExecutor({ destination: "native", terminal: { submit }, platformWriteText,
      helper: new URL("./response-copy-native-fixture.mjs", import.meta.url) })(source("platform-denied"), () => {});
    await expect(job.result).resolves.toMatchObject({ outcome: "submitted-unverified" });
    expect(platformWriteText).toHaveBeenCalledOnce();
    expect(submit).toHaveBeenCalledOnce();
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
