import { vi } from "vitest";
import type { PromptHistoryPort, PromptHistorySnapshot, PromptHistorySubmission } from "../../../../src/contracts/owned-ui/index.js";

export function memoryHistory() {
  const listeners = new Set<(snapshot: PromptHistorySnapshot) => void>();
  let revision = 0;
  const submitted: PromptHistorySubmission[] = [];
  const store: PromptHistoryPort = {
    start: vi.fn(), close: vi.fn(async () => {}), refresh: vi.fn(),
    record: vi.fn(async (submission: PromptHistorySubmission) => { submitted.push(submission); return "committed" as const; }),
    onFailure: () => () => {},
    onSnapshot: listener => { listeners.add(listener); return () => listeners.delete(listener); },
  };
  return { store, submitted, emit(texts: readonly string[]) {
    const snapshot = { revision: ++revision, limit: 100, entries: texts.map(text => ({ text, submissionId: `saved-${text}` })) };
    for (const listener of listeners) listener(snapshot);
  } };
}
