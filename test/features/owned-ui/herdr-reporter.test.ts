import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, rm, mkdir, readFile, writeFile, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HERDR_IDENTITY_LABELS as LABELS, reserveHerdrBinding } from "../../../src/features/owned-ui/herdr-binding.js";
import { createHerdrReporter } from "../../../src/features/owned-ui/herdr-reporter.js";
import type { HerdrCommandPort } from "../../../src/features/owned-ui/herdr-command.js";
const fixtureSessionId = randomUUID();
let directory = "";
const reporters: Array<ReturnType<typeof createHerdrReporter>> = [];
afterEach(async () => { for (const reporter of reporters.splice(0)) await reporter.dispose(); if (directory) await rm(directory, { recursive: true, force: true }); });
async function fixture() {
  directory = await mkdtemp(join(tmpdir(), "herdr-reporter-"));
  let labels: Record<string, string> = { [`custom.${LABELS.runtime}`]: "legacy", unrelated: "keep" };
  const calls: readonly string[][] = [];
  const command: HerdrCommandPort = vi.fn(async (args: readonly string[]) => {
    (calls as string[][]).push([...args]);
    if (args[0] === "label") for (const item of args.slice(2).filter(item => item !== "--json")) {
      const index = item.indexOf("="), key = item.slice(0, index), value = item.slice(index + 1);
      if (value) labels[key] = value; else delete labels[key];
    }
    return { ok: true, settled: true, stdout: JSON.stringify({ address: "t5z", labels }) };
  });
  return { command, calls, labels: () => labels, setLabels: (next: Record<string, string>) => { labels = next; },
    reserve: async (runtime = randomUUID()) => (await reserveHerdrBinding(runtime, { HC_TERMINAL_ID: "t5z" }, directory))!,
  };
}
function own(options: Parameters<typeof createHerdrReporter>[0]) { const reporter = createHerdrReporter(options); reporters.push(reporter); return reporter; }
const tick = async () => { for (let i = 0; i < 10; i++) await new Promise(done => setTimeout(done, 5)); };
describe("endpoint-ready fenced Core reporting", () => {
  it("publishes complete identity, refreshes every 30 seconds, updates replacements, and cleans only native owned keys", async () => {
    const f = await fixture(), reservation = await f.reserve();
    let identity: { sessionId: string; binding: number } | undefined;
    let heartbeat: () => void = () => {}, time = 1000;
    const cancelled = vi.fn();
    const reporter = own({ reservation, identity: () => identity, command: f.command, now: () => time, schedule(callback, milliseconds) { expect(milliseconds).toBe(30_000); heartbeat = callback; return cancelled; } });
    await tick(); expect(f.calls).toHaveLength(0); // Invariant: no reporting before endpoint readiness.
    identity = { sessionId: randomUUID(), binding: 1 }; reporter.request();
    await vi.waitFor(() => expect(f.labels()[LABELS.session]).toBe(identity!.sessionId));
    expect(f.labels()[LABELS.runtime]).toBe(reservation.runtimeId); expect(f.labels()[LABELS.at]).toBe("1000");
    await tick(); time = 31_000; heartbeat();
    await vi.waitFor(() => expect(f.labels()[LABELS.at]).toBe("31000"));
    identity = { sessionId: randomUUID(), binding: 2 }; time = 32_000; reporter.request(); reporter.request();
    await vi.waitFor(() => expect(f.labels()[LABELS.session]).toBe(identity!.sessionId));
    await reporter.dispose(); heartbeat(); reporter.request();
    expect(cancelled).toHaveBeenCalledOnce();
    expect(f.labels()).toEqual({ [`custom.${LABELS.runtime}`]: "legacy", unrelated: "keep" });
    expect(f.calls.filter(args => args[0] === "label").every(args => args.length === 6)).toBe(true);
  });
  it("fences a delayed older start, all older callbacks, and stale reclaim after successor exit", async () => {
    const f = await fixture(), old = await f.reserve(), newer = await f.reserve();
    const next = own({ reservation: newer, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await vi.waitFor(() => expect(f.labels()[LABELS.runtime]).toBe(newer.runtimeId)); await tick();
    const before = JSON.stringify(f.labels());
    const stale = own({ reservation: old, identity: () => ({ sessionId: fixtureSessionId, binding: 99 }), command: f.command, schedule: () => () => {} });
    stale.request(); await tick(); await stale.dispose();
    expect(JSON.stringify(f.labels())).toBe(before);
    await next.dispose(); stale.request(); await tick();
    expect(f.labels()).toEqual({ [`custom.${LABELS.runtime}`]: "legacy", unrelated: "keep" });
  });
  it.each([{}, { [LABELS.runtime]: "foreign" }, { [LABELS.session]: randomUUID() }])("fails closed for foreign/partial native ownership %j", async labels => {
    const f = await fixture(), reservation = await f.reserve();
    f.setLabels({ [LABELS.runtime]: randomUUID(), [LABELS.session]: randomUUID(), [LABELS.at]: "1", ...labels });
    const before = JSON.stringify(f.labels());
    const reporter = own({ reservation, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await tick(); await reporter.dispose(); expect(JSON.stringify(f.labels())).toBe(before);
  });
  it("stops publication when shutdown interrupts an in-flight read", async () => {
    const f = await fixture(), reservation = await f.reserve();
    let finish!: () => void;
    const gate = new Promise<void>(done => { finish = done; });
    const command: HerdrCommandPort = vi.fn(async args => { await gate; return await f.command(args); });
    const reporter = own({ reservation, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command, schedule: () => () => {} });
    await vi.waitFor(() => expect(command).toHaveBeenCalledOnce());
    const stopped = reporter.dispose(); finish(); await stopped;
    expect(f.calls.some(args => args[0] === "label")).toBe(false);
  });
  it("retains pending intent but never writes through an unsettled subprocess fence", async () => {
    const f = await fixture(), reservation = await f.reserve();
    own({ reservation, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: async () => ({ ok: false, settled: false, stdout: "" }), schedule: () => () => {} });
    await tick();
    const successor = await f.reserve();
    expect(successor).toBeDefined();
    const before = JSON.stringify(f.labels());
    const command = vi.fn(f.command);
    const next = own({ reservation: successor, identity: () => ({ sessionId: randomUUID(), binding: 1 }), command, schedule: () => () => {} });
    await tick(); next.request(); await tick(); await next.dispose();
    expect(command).not.toHaveBeenCalled();
    expect(JSON.stringify(f.labels())).toBe(before);
    expect((await readdir(directory)).some(name => name.endsWith(".lock"))).toBe(true);
  });
  it("promotes the newest ready successor after a bounded predecessor write settles", async () => {
    const f = await fixture(), old = await f.reserve();
    const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
    const delayed: HerdrCommandPort = async args => {
      if (args[0] === "label") { entered.resolve(); await release.promise; }
      return f.command(args);
    };
    const prior = own({ reservation: old, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: delayed, schedule: () => () => {} });
    await entered.promise;
    const middle = await f.reserve(), newest = await f.reserve();
    let heartbeat = () => {};
    const middleCommand = vi.fn(f.command);
    const superseded = own({ reservation: middle, identity: () => ({ sessionId: randomUUID(), binding: 1 }), command: middleCommand, schedule: () => () => {} });
    const nextId = randomUUID();
    const next = own({ reservation: newest, identity: () => ({ sessionId: nextId, binding: 1 }), command: f.command,
      schedule(callback, ms) { expect(ms).toBe(30_000); heartbeat = callback; return () => {}; } });
    await tick(); expect(f.labels()[LABELS.runtime]).toBeUndefined();
    release.resolve(); await tick();
    expect(f.labels()[LABELS.runtime]).toBe(old.runtimeId);
    heartbeat();
    await vi.waitFor(() => expect(f.labels()).toMatchObject({ [LABELS.runtime]: newest.runtimeId, [LABELS.session]: nextId }));
    await prior.dispose(); superseded.request(); await tick();
    expect(middleCommand).not.toHaveBeenCalled();
    expect(f.labels()[LABELS.runtime]).toBe(newest.runtimeId);
    await next.dispose(); superseded.request(); await tick();
    expect(f.labels()[LABELS.runtime]).toBeUndefined();
  });

  it("revokes an old read before its write when a successor records intent", async () => {
    const f = await fixture(), old = await f.reserve();
    const entered = Promise.withResolvers<void>(), release = Promise.withResolvers<void>();
    const prior = own({ reservation: old, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: async args => {
      if (args[0] === "get") { entered.resolve(); await release.promise; }
      return f.command(args);
    }, schedule: () => () => {} });
    await entered.promise;
    const newer = await f.reserve();
    release.resolve(); await tick();
    expect(f.calls.some(args => args[0] === "label")).toBe(false);
    await prior.dispose();
    const next = own({ reservation: newer, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await vi.waitFor(() => expect(f.labels()[LABELS.runtime]).toBe(newer.runtimeId));
    await next.dispose();
  });

  it("does not promote or clear predecessor labels when pending startup is disposed", async () => {
    const f = await fixture(), old = await f.reserve();
    own({ reservation: old, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await vi.waitFor(() => expect(f.labels()[LABELS.runtime]).toBe(old.runtimeId)); await tick();
    const next = await f.reserve(), before = JSON.stringify(f.labels());
    const stopped = own({ reservation: next, identity: () => undefined, command: f.command, schedule: () => () => {} });
    await stopped.dispose();
    expect(JSON.stringify(f.labels())).toBe(before);
  });

  it("retains legacy publication lineage and refuses a later legacy reservation", async () => {
    const f = await fixture(), ticket = await f.reserve();
    // Protocol fixture: the previous implementation reserves only under the shared I/O guard.
    const legacyReserve = async () => {
      await mkdir(`${ticket.file}.lock`);
      try {
        const previous = JSON.parse(await readFile(ticket.file, "utf8").catch(() => "null"));
        const reservation = { terminalId: ticket.terminalId, file: ticket.file, runtimeId: randomUUID(), generation: (previous?.generation ?? 0) + 1 };
        await writeFile(ticket.file, JSON.stringify({ version: 1, runtimeId: reservation.runtimeId, generation: reservation.generation, ...(previous?.published ? { published: previous.published } : {}) }));
        return reservation;
      } finally { await rmdir(`${ticket.file}.lock`); }
    };
    const legacy = await legacyReserve();
    const prior = own({ reservation: legacy, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await vi.waitFor(() => expect(f.labels()[LABELS.runtime]).toBe(legacy.runtimeId)); await tick();
    // This ticket predates the committed legacy owner and must not take it over.
    const staleCommand = vi.fn(f.command);
    const stale = own({ reservation: ticket, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: staleCommand, schedule: () => () => {} });
    await tick(); expect(staleCommand).not.toHaveBeenCalled();
    const next = await f.reserve();
    const current = own({ reservation: next, identity: () => ({ sessionId: fixtureSessionId, binding: 1 }), command: f.command, schedule: () => () => {} });
    await vi.waitFor(() => expect(f.labels()[LABELS.runtime]).toBe(next.runtimeId));
    await prior.dispose(); stale.request(); await tick();
    expect(f.labels()[LABELS.runtime]).toBe(next.runtimeId);
    await current.dispose();
  });

  it.each(["unavailable", "malformed", "wrong-address", "invalid-session"])("contains %s without rapid retries or label writes", async mode => {
    const f = await fixture(), reservation = await f.reserve();
    const command: HerdrCommandPort = vi.fn(async () => ({ ok: mode !== "unavailable", settled: true, stdout: mode === "malformed" ? "not JSON" : JSON.stringify({ address: "different-terminal", labels: {} }) }));
    const reporter = own({ reservation, identity: () => ({ sessionId: mode === "invalid-session" ? "prefix" : fixtureSessionId, binding: 1 }), command, schedule: () => () => {} });
    await tick(); await reporter.dispose();
    expect(command).toHaveBeenCalledTimes(mode === "invalid-session" ? 0 : 1);
    expect(f.calls).toHaveLength(0);
  });
  it("rejects invalid contexts and identities without creating state", async () => {
    await fixture();
    for (const terminal of [undefined, "review", "pc2/t5z", "t5z;echo", "t5z\0"]) {
      expect(await reserveHerdrBinding(randomUUID(), terminal === undefined ? {} : { HC_TERMINAL_ID: terminal }, directory)).toBeUndefined();
    }
    expect(await reserveHerdrBinding("prefix", { HC_TERMINAL_ID: "t5z" }, directory)).toBeUndefined();
    expect(await readdir(directory)).toEqual([]);
  });
});
