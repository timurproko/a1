export const PROMPT_HISTORY_EDITOR_REPLACEMENT = Object.freeze({
  id: "persistent-prompt-history",
  kind: "replacement",
  slot: "editor",
  replaces: Object.freeze(["current-session-history-source", "adjacent-duplicate-policy", "recall-caret-placement", "history-border"]),
} as const);

export type PromptHistoryKind = "prompt" | "steer" | "follow-up" | "bash" | "slash";

export interface PromptHistorySubmission {
  readonly id: string;
  readonly text: string;
  readonly timestamp: number;
  readonly kind: PromptHistoryKind;
  readonly cwd?: string;
  readonly sessionId?: string;
}

export interface PromptHistorySnapshot {
  readonly revision: number;
  readonly limit: number;
  readonly entries: readonly { readonly text: string; readonly submissionId: string }[];
}

export type PromptHistoryFailure = "unavailable" | "busy" | "capacity" | "oversized" | "schema" | "corrupt" | "shutdown";
export type PromptHistoryResult = "committed" | "skipped";

export interface PromptHistoryPort {
  start(): void;
  record(submission: PromptHistorySubmission): Promise<PromptHistoryResult>;
  refresh(): void;
  onSnapshot(listener: (snapshot: PromptHistorySnapshot) => void): () => void;
  onFailure(listener: (code: PromptHistoryFailure) => void): () => void;
  close(): Promise<void>;
}

export const PROMPT_HISTORY_MAX_ENTRY_BYTES = 1024 * 1024;
export const PROMPT_HISTORY_MAX_TEXT_BYTES = 8 * 1024 * 1024;
export const PROMPT_HISTORY_MAX_PENDING = 32;

export function assertPromptHistorySubmission(value: unknown): asserts value is PromptHistorySubmission {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new TypeError("Invalid history submission");
  const item = value as Record<string, unknown>;
  const allowed = new Set(["id", "text", "timestamp", "kind", "cwd", "sessionId"]);
  if (Object.keys(item).some(key => !allowed.has(key))
    || typeof item.id !== "string" || !/^[a-zA-Z0-9-]{1,128}$/.test(item.id)
    || typeof item.text !== "string" || !item.text.trim() || item.text !== item.text.trim()
    || typeof item.timestamp !== "number" || !Number.isSafeInteger(item.timestamp) || item.timestamp < 0
    || typeof item.kind !== "string" || !["prompt", "steer", "follow-up", "bash", "slash"].includes(item.kind)
    || item.cwd !== undefined && typeof item.cwd !== "string"
    || item.sessionId !== undefined && typeof item.sessionId !== "string") throw new TypeError("Invalid history submission");
}
