import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { DraftCheckpointer } from "../../../src/foundation/resident-tabs/draft-checkpoint.js";
import { ResidentTabFaultInjection, residentTabFaultEnvironment } from "../../../src/foundation/resident-tabs/fault-injection.js";
import { PromptJournal } from "../../../src/foundation/resident-tabs/prompt-journal.js";
import { SettledTurnSynchronizer, synchronizeSessionFile } from "../../../src/foundation/resident-tabs/session-sync.js";

const roots: string[] = [];
afterEach(async () => Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))));

class Crashed extends Error {}

/** Stops the operation exactly at `point`, leaving the files as a killed process would. */
function crashingAt(point: string): ResidentTabFaultInjection {
  return new ResidentTabFaultInjection(residentTabFaultEnvironment(point), crashed => { throw new Crashed(crashed); });
}

async function directory(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "a1-crash-points-"));
  roots.push(root);
  return root;
}

const JOURNAL_POINTS = [
  "journal-before-append",
  "journal-after-append",
  "journal-after-sync",
  "journal-before-correlation",
  "journal-after-correlation",
  "journal-before-settled-record",
  "journal-after-settled-record",
  "journal-during-retirement",
  "journal-during-compaction",
  "journal-after-settle-sync",
  "session-before-sync",
  "session-after-sync",
] as const;

/** Submit, correlate, settle through the session sync, retire, and compact one prompt. */
async function lifecycle(journal: PromptJournal, sessionFile: string, faults: ResidentTabFaultInjection): Promise<{ submitted: boolean; settled: boolean }> {
  let submitted = false;
  let settled = false;
  try {
    const record = await journal.submit({ sessionId: "session-1", sessionFile, incarnation: 1, fileExisted: true, kind: "prompt", text: "durable prompt" });
    submitted = true;
    await journal.correlate(record.id, "entry-1");
    await new SettledTurnSynchronizer(journal, faults).settle(sessionFile, record.id, "entry-1");
    settled = true;
    await journal.pending([{ entryId: "entry-1", text: "durable prompt", settled: true }]);
    await journal.compactIfRetired();
  } catch (error) {
    if (!(error instanceof Crashed)) throw error;
  }
  return { submitted, settled };
}

describe("resident tab crash points recover", () => {
  it.each(JOURNAL_POINTS)("after a crash at %s the journal reads cleanly and loses no admitted prompt", async point => {
    const root = await directory();
    const path = join(root, "tab", "prompt-journal.jsonl");
    const sessionFile = join(root, "session.jsonl");
    await writeFile(sessionFile, "{}\n");
    const faults = crashingAt(point);
    const journal = new PromptJournal(path, { faults });
    await journal.initialize();
    const progress = await lifecycle(journal, sessionFile, faults);

    const recovered = new PromptJournal(path);
    await recovered.initialize();
    const records = await recovered.read();
    const pending = await recovered.pending([]);
    const offered = pending.some(entry => entry.submitted.text === "durable prompt");
    const closed = records.some(record => record.type === "settled" || record.type === "retired");
    const admitted = records.some(record => record.type === "submitted");
    if (progress.submitted) {
      // Invariant: an admitted prompt is never lost: it is offered again or recorded as settled.
      expect(offered || closed).toBe(true);
    }
    // Invariant: a settled prompt is never offered again.
    expect(offered && closed).toBe(false);
    if (point === "journal-before-append") expect(admitted).toBe(false);
  });

  it.each(["draft-during-temp-write", "draft-before-rename", "draft-after-rename"] as const)(
    "after a crash at %s the draft restores the previous or the new checkpoint, never a torn one",
    async point => {
      const root = await directory();
      const path = join(root, "draft.json");
      const before = new DraftCheckpointer(path);
      before.change("first draft");
      await before.close();
      const crashing = new DraftCheckpointer(path, { faults: crashingAt(point) });
      crashing.change("second draft");
      await crashing.flush().catch(error => { if (!(error instanceof Crashed)) throw error; });
      const restored = await new DraftCheckpointer(path).restore();
      expect(["first draft", "second draft"]).toContain(restored?.text);
      if (point === "draft-after-rename") expect(restored?.text).toBe("second draft");
      else expect(restored?.text).toBe("first draft");
    },
  );

  it("synchronizes a session file at both named points without corrupting it", async () => {
    const root = await directory();
    const sessionFile = join(root, "session.jsonl");
    await writeFile(sessionFile, "{\"entry\":1}\n");
    for (const point of ["session-before-sync", "session-after-sync"]) {
      await expect(synchronizeSessionFile(sessionFile, crashingAt(point))).rejects.toBeInstanceOf(Crashed);
      await expect(synchronizeSessionFile(sessionFile)).resolves.toBeUndefined();
    }
  });
});
