/** Durable naming ownership and optimistic guard for one bound session. */
export interface OwnedUiSessionNameState {
  readonly sessionFile: string;
  readonly binding: number;
  readonly name: string | null;
  readonly nameEntryId: string | null;
  readonly source: "auto" | "user" | "unnamed";
  readonly completedContext: string | null;
  /** Null/absent inherits profile policy; an explicit value belongs only to this durable session. */
  readonly autoName?: boolean | null;
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
  /** Manual compare-and-apply through the ordinary name owner; false means the captured state no longer applies. */
  rename?(expected: OwnedUiSessionNameState, name: string): boolean;
  /** Persist an independent policy override; false means this session cannot durably accept it. */
  setAutoName?(expected: OwnedUiSessionNameState, enabled: boolean): boolean;
  /** Synchronous policy notification, including disable/enable before the next UI event drains. */
  onAutoNameChange?(listener: () => void): () => void;
  complete(request: OwnedUiSessionNameCompletion): Promise<string | null>;
  /** Synchronous compare-and-apply, called only inside the caller's repository-context guard. */
  apply(expected: OwnedUiSessionNameState, name: string, context: string): boolean;
}
