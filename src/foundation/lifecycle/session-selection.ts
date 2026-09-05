/** Invocation-scoped selection; never inferred from a parent's active-session environment. */
export interface SessionSelection {
  readonly target: string;
  readonly sessionDir?: string;
}

/** Shared public/internal grammar, deliberately not arbitrary Pi argument passthrough. */
export function parseSessionSelection(arguments_: readonly string[]): SessionSelection | undefined {
  if (arguments_.length === 0) return undefined;
  let target: string | undefined;
  let sessionDir: string | undefined;
  for (let index = 0; index < arguments_.length; index += 2) {
    const option = arguments_[index];
    if (option !== "--session" && option !== "--session-dir") throw new Error("expected --session <path|id> with optional --session-dir <dir>");
    const value = arguments_[index + 1];
    if (value === undefined || value.startsWith("-") || !validValue(value)) throw new Error(`${option} requires a nonempty value`);
    if (option === "--session") {
      if (target !== undefined) throw new Error("--session may occur only once");
      target = value;
    } else {
      if (sessionDir !== undefined) throw new Error("--session-dir may occur only once");
      sessionDir = value;
    }
  }
  if (target === undefined) throw new Error("--session-dir requires --session <path|id>");
  return Object.freeze({ target, ...(sessionDir === undefined ? {} : { sessionDir }) });
}

/** Encode only validated values into separate argv entries; no shell quoting or evaluation. */
export function sessionSelectionArguments(selection?: SessionSelection): string[] {
  if (selection === undefined) return [];
  const args = [...(selection.sessionDir === undefined ? [] : ["--session-dir", selection.sessionDir]), "--session", selection.target];
  parseSessionSelection(args);
  return args;
}

function validValue(value: string): boolean {
  return value.trim().length > 0 && value.length <= 32_768 && !/[\u0000\r\n]/.test(value);
}
