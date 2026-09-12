export interface CommandOutcomeCase {
  readonly id: string;
  readonly command: string;
  readonly condition: string;
  readonly argument?: string;
  readonly selection?: string;
  readonly input?: string;
  readonly inputs?: readonly string[];
  readonly prefixStatus?: string;
}

const cases = (command: string, conditions: readonly string[], argument?: string): CommandOutcomeCase[] => conditions.map(condition => ({
  id: `${command}/${condition}`, command, condition, ...(argument === undefined ? {} : { argument }),
}));

export const COMMAND_OUTCOME_CASES: readonly CommandOutcomeCase[] = [
  ...cases("share", ["missing", "unauthenticated", "permission", "auth-stderr", "export-failure", "gist-failure", "gist-empty-failure", "gist-signal", "gist-spawn-failure", "gist-non-error", "malformed", "malformed-stderr", "cancelled", "success"]),
  ...cases("copy", ["empty", "success", "failure", "non-error"]),
  ...cases("login", ["success", "failure", "non-error", "cancelled", "sync-failure", "unknown-model", "no-models", "default-unavailable", "selection-failure", "refresh-failure", "refresh-error", "refresh-aborted"]).map(entry => ({ ...entry, selection: "oauth:openai" })),
  ...cases("login", ["success", "failure", "cancelled", "sync-failure"]).map(entry => ({ ...entry, id: `login/api-key-${entry.condition}`, selection: "api_key:openai" })),
  { id: "login/no-default-provider", command: "login", condition: "no-default-provider", selection: "oauth:fixture-provider" },
  { id: "login/ambient", command: "login", condition: "ambient", argument: "openai" },
  { id: "login/ambient-close", command: "login", condition: "ambient", argument: "openai", input: "\u001b" },
  { id: "login/provider-search", command: "login", condition: "success", argument: "unknown-provider" },
  { id: "login/no-providers", command: "login", condition: "empty", argument: "unknown-provider" },
  { id: "login/provider-methods", command: "login", condition: "success", argument: "OpenAI Codex" },
  { id: "login/method-selector", command: "login", condition: "success" },
  { id: "login/account-empty", command: "login", condition: "empty", inputs: ["\r"] },
  { id: "login/api-key-empty", command: "login", condition: "empty", inputs: ["\u001b[B", "\r"] },
  ...cases("logout", ["empty", "read-failure"]),
  ...cases("logout", ["success", "api-key", "failure", "non-error", "sync-failure"]).map(entry => ({ ...entry, input: "\r" })),
  ...cases("logout", ["cancelled"]).map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("fork", ["empty"]),
  ...cases("fork", ["success", "failure", "non-error", "extension-cancelled"]).map(entry => ({ ...entry, input: "\r" })),
  ...cases("fork", ["cancelled"]).map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("tree", ["empty"]),
  ...cases("tree", ["success", "failure", "non-error", "cancelled", "aborted"], "entry-0").map(entry => ({ ...entry, input: "\r" })),
  ...cases("tree", ["copy-success", "copy-failure", "copy-empty"], "entry-0").map(entry => ({ ...entry, input: "\u0018" })),
  ...cases("tree", ["already"], "entry-1").map(entry => ({ ...entry, input: "\r" })),
  ...cases("tree", ["selector-cancelled"], "entry-0").map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("settings", ["open"]),
  ...cases("settings", ["cancelled"]).map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("scoped-models", ["open", "refresh-failure", "refresh-error", "refresh-timeout"]),
  ...cases("scoped-models", ["persist"]).map(entry => ({ ...entry, input: "\u0013" })),
  ...cases("scoped-models", ["cancelled"]).map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("trust", ["open"]),
  ...cases("trust", ["success"]).map(entry => ({ ...entry, input: "\r" })),
  ...cases("trust", ["cancelled"]).map(entry => ({ ...entry, input: "\u001b" })),
  ...cases("reload", ["success", "failure", "non-error", "streaming", "compacting", "model-config-error"]).map(entry => ({ ...entry, prefixStatus: "Earlier command report" })),
  ...cases("hotkeys", ["success", "extensions", "custom-bindings", "disk-change", "reload-bindings"]),
  ...cases("arminsayshi", ["success"]),
  ...cases("dementedelves", ["success"]),
  ...cases("quit", ["success"]),
  ...cases("debug", ["success"]),
  ...cases("changelog", ["success"]),
  ...cases("export", ["success", "failure", "non-error"]),
  ...cases("export", ["jsonl"], "synthetic.jsonl"),
  ...cases("import", ["usage"]),
  ...cases("import", ["success", "declined", "cancelled", "failure", "non-error", "missing-cwd-success", "missing-cwd-declined", "missing-cwd-cancelled"], "synthetic.jsonl"),
  ...cases("new", ["success", "cancelled", "failure", "non-error"]),
  ...cases("resume", ["success", "cancelled", "failure", "non-error", "missing-cwd-success", "missing-cwd-declined", "missing-cwd-cancelled"], "synthetic.jsonl"),
  ...cases("clone", ["empty", "success", "cancelled", "failure", "non-error"]),
  ...cases("compact", ["success", "failure"]),
  ...cases("name", ["empty", "current"]),
  ...cases("name", ["success", "normalized"], "a long synthetic session name with 日本語 and enough words to wrap on narrow terminals"),
  ...cases("session", ["success"]),
  ...cases("model", ["success", "selection-failure"], "openai/gpt-5.5"),
  ...cases("model", ["open", "no-models"]),
  ...cases("model", ["refresh-success", "refresh-failure", "refresh-error", "refresh-timeout", "scoped"], "openai/gpt-6"),
];
