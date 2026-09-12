import { vi } from "vitest";
import type { PromptHistoryFailure, PromptHistoryPort, PromptHistorySnapshot, PromptHistorySubmission } from "../../../../src/contracts/owned-ui/index.js";

export function memoryHistory() {
  const listeners = new Set<(snapshot: PromptHistorySnapshot) => void>();
  const failures = new Set<(code: PromptHistoryFailure) => void>();
  let revision = 0;
  const submitted: PromptHistorySubmission[] = [];
  const store: PromptHistoryPort = {
    start: vi.fn(), close: vi.fn(async () => {}), refresh: vi.fn(),
    record: vi.fn(async (submission: PromptHistorySubmission) => { submitted.push(submission); return "committed" as const; }),
    onFailure: listener => { failures.add(listener); return () => failures.delete(listener); },
    onSnapshot: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { store, submitted, fail(code: PromptHistoryFailure) { for (const listener of failures) listener(code); }, emit(texts: readonly string[]) {
    const snapshot = { revision: ++revision, limit: 100, entries: texts.map(text => ({ text, submissionId: `saved-${text}` })) };
    for (const listener of listeners) listener(snapshot);
  } };
}
