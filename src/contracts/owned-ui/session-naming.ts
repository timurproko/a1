/** Durable naming ownership and optimistic guard for one bound session. */
export interface OwnedUiSessionNameState {
  readonly sessionFile: string;
  readonly binding: number;
  readonly name: string | null;
  readonly nameEntryId: string | null;
  readonly source: "auto" | "user" | "unnamed";
  readonly completedContext: string | null;
}

/** An isolated naming completion: never a conversation turn or a tool-using request. */
export interface OwnedUiSessionNameCompletion {
  readonly prompt: string;
  readonly maxTokens: number;
  readonly signal: AbortSignal;
}

/** Engine operations; repository coordination and product policy belong to the caller. */
export interface OwnedUiSessionNamingPort {
  state(): OwnedUiSessionNameState | null;
  complete(request: OwnedUiSessionNameCompletion): Promise<string | null>;
  /** Synchronous compare-and-apply, called only inside the caller's repository-context guard. */
  apply(expected: OwnedUiSessionNameState, name: string, context: string): boolean;
}
