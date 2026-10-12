import { mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DraftCheckpointer } from "../../../src/foundation/resident-tabs/draft-checkpoint.js";
import { ResidentTabFaultInjection } from "../../../src/foundation/resident-tabs/fault-injection.js";
import { classifyMissingSession, PromptJournal } from "../../../src/foundation/resident-tabs/prompt-journal.js";
import { ResidentTabRecovery, readSessionJournal } from "../../../src/foundation/resident-tabs/recovery.js";
import { SettledTurnSynchronizer, synchronizeSessionFile } from "../../../src/foundation/resident-tabs/session-sync.js";

async function root(): Promise<string> { return mkdtemp(join(tmpdir(), "a1-resident-recovery-")); }

function fakeScheduler() {
  const callbacks: (() => void | Promise<void>)[] = [];
  return {
    schedule(callback: () => void | Promise<void>): unknown { callbacks.push(callback); return callback; },
    cancel(timer: unknown): void { const index = callbacks.indexOf(timer as () => void | Promise<void>); if (index >= 0) callbacks.splice(index, 1); },
    async run(): Promise<void> { await callbacks.shift()?.(); },
  };
}

describe("resident prompt journal", () => {
  it("synchronizes records, reconciles settled text, and retires idempotently", async () => {
    const directory = await root();
    const journal = new PromptJournal(join(directory, "journal.jsonl"));
    await journal.initialize();
    const submission = await journal.submit({
      sessionId: "reserved", sessionFile: null, incarnation: 2, fileExisted: false, kind: "prompt", text: "hello",
    });
    expect(await journal.pending()).toHaveLength(1);
    expect(await journal.pending([{ entryId: "entry-1", text: "hello", settled: true }])).toHaveLength(0);
    await journal.retire(submission.id);
    await journal.retire(submission.id);
    const records = (await readFile(journal.path, "utf8")).trim().split("\n").map(line => JSON.parse(line));
    expect(records.filter(record => record.type === "retired")).toHaveLength(1);
    expect(classifyMissingSession(submission, false)).toBe("first-turn");
    expect(classifyMissingSession({ ...submission, fileExisted: true }, false)).toBe("missing-transcript");
    if (process.platform !== "win32") {
      expect((await stat(directory)).mode & 0o777).toBe(0o700);
      expect((await stat(journal.path)).mode & 0o777).toBe(0o600);
    }
  });

  it("preserves unfinished correlated submissions and compacts only retired journals", async () => {
    const directory = await root();
    const journal = new PromptJournal(join(directory, "journal.jsonl"));
    await journal.initialize();
    const submission = await journal.submit({
      sessionId: "session", sessionFile: join(directory, "session.jsonl"), incarnation: 1, fileExisted: true, kind: "steer", text: "continue",
    });
    await journal.correlate(submission.id, "user-7");
    expect(await journal.pending([{ entryId: "user-7", text: "continue", settled: false }])).toEqual([
      { submitted: submission, correlatedEntryId: "user-7" },
    ]);
    expect(await journal.compactIfRetired()).toBe(false);
    await journal.settle(submission.id, "user-7");
    expect(await journal.compactIfRetired()).toBe(true);
    expect(await readFile(journal.path, "utf8")).toBe("");
  });

  it("reconciles a lost correlation by exact text without collapsing duplicate prompts", async () => {
    const directory = await root();
    const session = join(directory, "session.jsonl");
    await writeFile(session, [
      { type: "session", version: 3, id: "s" },
      { type: "message", id: "user-1", parentId: null, message: { role: "user", content: [{ type: "text", text: "repeat" }] } },
      { type: "message", id: "assistant-1", parentId: "user-1", message: { role: "assistant", content: [{ type: "text", text: "done" }] } },
    ].map(value => JSON.stringify(value)).join("\n") + "\n");
    const journal = new PromptJournal(join(directory, "journal.jsonl"));
    await journal.initialize();
    await journal.submit({ sessionId: "s", sessionFile: session, incarnation: 1, fileExisted: true, kind: "prompt", text: "repeat" });
    const second = await journal.submit({ sessionId: "s", sessionFile: session, incarnation: 1, fileExisted: true, kind: "prompt", text: "repeat" });
    expect(await journal.pending(await readSessionJournal(session))).toEqual([{ submitted: second }]);
  });

  it("initialization reconciles settled session ancestry and tolerates a torn final session line", async () => {
    const directory = await root();
    const session = join(directory, "session.jsonl");
    const recovery = new ResidentTabRecovery(directory);
    await recovery.initialize();
    await recovery.admit({ sessionId: "s", sessionFile: session, incarnation: 1, kind: "prompt", text: "hello" });
    await writeFile(session, [
      JSON.stringify({ type: "message", id: "user", parentId: null, message: { role: "user", content: "hello" } }),
      JSON.stringify({ type: "message", id: "assistant", parentId: "user", message: { role: "assistant", content: "done" } }),
      "{torn",
    ].join("\n"));
    const restarted = new ResidentTabRecovery(directory);
    await expect(restarted.initialize(session)).resolves.toEqual({ prompts: [], draft: null });
  });

  it("adopts matching reboot journals once and retires the source", async () => {
    const directory = await root();
    const oldDirectory = join(directory, "old-tab");
    const nextDirectory = join(directory, "new-tab");
    await mkdir(join(directory, "registry-history"), { recursive: true });
    const source = new PromptJournal(join(oldDirectory, "journal.jsonl"));
    await source.initialize();
    const submission = await source.submit({
      sessionId: "reserved-session", sessionFile: null, incarnation: 1,
      fileExisted: false, kind: "prompt", text: "survived logout",
    });
    await writeFile(join(directory, "registry-history", "tabset-boot-1.json"), JSON.stringify({
      tabs: [{ tabId: "old-tab", sessionFile: null }],
    }));
    const recovery = new ResidentTabRecovery(nextDirectory);
    await expect(recovery.initialize(null, "reserved-session")).resolves.toMatchObject({
      prompts: [expect.objectContaining({ id: submission.id, text: "survived logout" })],
    });
    expect((await source.read()).filter(record => record.type === "retired" && record.id === submission.id)).toHaveLength(1);
    const again = new ResidentTabRecovery(nextDirectory);
    await expect(again.initialize(null, "reserved-session")).resolves.toMatchObject({
      prompts: [expect.objectContaining({ id: submission.id })],
    });
    expect((await new PromptJournal(join(nextDirectory, "journal.jsonl")).read())
      .filter(record => record.type === "submitted" && record.id === submission.id)).toHaveLength(1);
  });

  it("bounds append size", async () => {
    const directory = await root();
    const journal = new PromptJournal(join(directory, "journal.jsonl"), { maximumBytes: 120 });
    await journal.initialize();
    await expect(journal.submit({
      sessionId: "s", sessionFile: null, incarnation: 1, fileExisted: false, kind: "prompt", text: "x".repeat(200),
    })).rejects.toThrow(/full/);
  });
});

describe("resident draft checkpoints", () => {
  it("checkpoints during continuous typing and clears degraded state after recovery", async () => {
    const directory = await root();
    const degraded: boolean[] = [];
    const timers = fakeScheduler();
    let fail = true;
    const path = join(directory, "draft.json");
    const checkpoint = new DraftCheckpointer(path, {
      onDegraded: value => degraded.push(value), schedule: timers.schedule, cancel: timers.cancel,
      write: async (target, text) => { if (fail) throw new Error("disk blocked"); await writeFile(target, text, { flag: "wx", mode: 0o600 }); },
    });
    checkpoint.change("a");
    await timers.run();
    expect(checkpoint.degraded).toBe(true);
    fail = false;
    checkpoint.change("ab");
    await timers.run();
    expect(checkpoint.degraded).toBe(false);
    expect((await checkpoint.restore())?.text).toBe("ab");
    expect(degraded).toEqual([true, false]);
    await checkpoint.close();
  });

  it("marks recovery degraded when a checkpoint stays blocked past the dirty bound", async () => {
    const directory = await root();
    let now = 0;
    const callbacks: (() => void | Promise<void>)[] = [];
    let releaseWrite!: () => void;
    const blocked = new Promise<void>(resolve => { releaseWrite = resolve; });
    const checkpoint = new DraftCheckpointer(join(directory, "draft.json"), {
      now: () => now,
      schedule: callback => { callbacks.push(callback); return callback; },
      cancel: timer => { const index = callbacks.indexOf(timer as () => void | Promise<void>); if (index >= 0) callbacks.splice(index, 1); },
      write: async (target, text) => { await blocked; await writeFile(target, text, { flag: "wx", mode: 0o600 }); },
    });
    checkpoint.change("continuous");
    const writing = Promise.resolve(callbacks.shift()?.());
    now = 1_001;
    await callbacks.shift()?.();
    expect(checkpoint.degraded).toBe(true);
    releaseWrite();
    await writing;
    expect(checkpoint.degraded).toBe(false);
    await checkpoint.close();
  });

  it("writes every interval instead of waiting for inactivity", async () => {
    const directory = await root();
    const timers = fakeScheduler();
    let now = 0;
    const checkpoint = new DraftCheckpointer(join(directory, "draft.json"), {
      now: () => now, schedule: timers.schedule, cancel: timers.cancel,
    });
    for (let index = 0; index < 30; index++) {
      checkpoint.change("x".repeat(index + 1));
      now += 100;
      if ((index + 1) % 5 === 0) await timers.run();
    }
    expect((await checkpoint.restore())?.text).toBe("x".repeat(30));
    await checkpoint.close();
  });
});

describe("resident session synchronization", () => {
  it("opens the session write-capable and records settled only after sync", async () => {
    const directory = await root();
    const session = join(directory, "session.jsonl");
    await writeFile(session, "{}\n");
    await synchronizeSessionFile(session);
    const journal = new PromptJournal(join(directory, "journal.jsonl"));
    await journal.initialize();
    const submission = await journal.submit({
      sessionId: "s", sessionFile: session, incarnation: 1, fileExisted: true, kind: "prompt", text: "hello",
    });
    const sync = new SettledTurnSynchronizer(journal);
    await sync.settle(session, submission.id, "entry");
    expect((await journal.read()).at(-1)).toEqual({ type: "settled", id: submission.id, entryId: "entry" });
  });
});

describe("resident tab fault injection", () => {
  it("refuses crash points outside a hermetic process", () => {
    expect(() => new ResidentTabFaultInjection({ A1_TABS_FAULT_CRASH_POINT: "journal-before-append" })).toThrow(/hermetic/);
  });

  it("activates only the named point in a hermetic process", () => {
    const hit: string[] = [];
    const faults = new ResidentTabFaultInjection({ A1_TABS_FAULT_CRASH_POINT: "target", A1_TABS_HERMETIC_TEST: "1" }, point => {
      hit.push(point); throw new Error("crash");
    });
    faults.at("other");
    expect(() => faults.at("target")).toThrow("crash");
    expect(hit).toEqual(["target"]);
  });
});
