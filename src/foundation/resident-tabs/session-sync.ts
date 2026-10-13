import { open } from "node:fs/promises";
import type { PromptJournal } from "./prompt-journal.js";
import { ResidentTabFaultInjection } from "./fault-injection.js";

export async function synchronizeSessionFile(path: string, faults = new ResidentTabFaultInjection()): Promise<void> {
  const handle = await open(path, "r+");
  try {
    faults.at("session-before-sync");
    await handle.sync();
    faults.at("session-after-sync");
  } finally { await handle.close(); }
}

/** Serializes settled-turn sync and journal ordering off the input path. */
export class SettledTurnSynchronizer {
  readonly #journal: PromptJournal;
  readonly #faults: ResidentTabFaultInjection;
  #queue: Promise<void> = Promise.resolve();

  constructor(journal: PromptJournal, faults = new ResidentTabFaultInjection()) {
    this.#journal = journal;
    this.#faults = faults;
  }

  settle(sessionFile: string, submissionId: string, entryId: string): Promise<void> {
    return this.settleMany(sessionFile, [{ id: submissionId, entryId }]);
  }

  settleMany(sessionFile: string, entries: readonly { readonly id: string; readonly entryId: string }[]): Promise<void> {
    const operation = this.#queue.then(async () => {
      await synchronizeSessionFile(sessionFile, this.#faults);
      this.#faults.at("journal-after-settle-sync");
      for (const entry of entries) await this.#journal.settle(entry.id, entry.entryId);
    });
    this.#queue = operation.catch(() => undefined);
    return operation;
  }

  flush(): Promise<void> { return this.#queue; }
}
