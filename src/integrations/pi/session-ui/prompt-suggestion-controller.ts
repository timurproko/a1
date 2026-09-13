import {
  assertOwnedUiPromptSuggestionResult,
  normalizePromptSuggestionCandidate,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiPromptSuggestionState,
  type SuggestionDecision,
  type SuggestionDecisionReason,
  type SuggestionDiagnosticEvent,
  type SuggestionDiagnosticObserver,
  type SuggestionDiagnosticRecord,
} from "../../../contracts/owned-ui/index.js";

export interface ContextualPromptSuggestionSurface {
  canPresent(identity: OwnedUiPromptSuggestionIdentity): boolean;
  presentationBlockReason?(identity: OwnedUiPromptSuggestionIdentity): SuggestionDecision;
  present(text: string): boolean;
  clear(): void;
  requestRender(): void;
}

export interface ContextualPromptSuggestionControllerOptions {
  readonly generator: OwnedUiPromptSuggestionGeneratorPort;
  readonly surface: ContextualPromptSuggestionSurface;
  readonly enabled: boolean;
  readonly timeoutMs?: number;
  readonly diagnostics?: SuggestionDiagnosticObserver;
  readonly now?: () => number;
}

type DecisionIdentity = Omit<OwnedUiPromptSuggestionIdentity, "model"> & { readonly model: OwnedUiPromptSuggestionIdentity["model"] | null };
interface RequestLifetime {
  readonly identity: OwnedUiPromptSuggestionIdentity;
  readonly metadata: SuggestionDiagnosticRecord;
  readonly abort: AbortController;
  readonly startedAt: number;
  terminal: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

/** Prefetches one inert candidate; owns retirement even when a provider ignores abort. */
export class ContextualPromptSuggestionController {
  #state: OwnedUiPromptSuggestionState = { status: "idle" };
  #request: RequestLifetime | null = null;
  #lastConsidered = "";
  #enabled: boolean;
  #disposed = false;
  #sessionKey = "";
  #sessionSequence = 0;
  #requestSequence = 0;
  readonly #timeoutMs: number;
  readonly #now: () => number;

  constructor(readonly options: ContextualPromptSuggestionControllerOptions) {
    this.#enabled = options.enabled;
    this.#timeoutMs = options.timeoutMs ?? 15_000;
    this.#now = options.now ?? Date.now;
  }

  get state(): OwnedUiPromptSuggestionState { return this.#state; }

  setEnabled(enabled: boolean): void {
    if (this.#enabled === enabled) return;
    this.#enabled = enabled;
    this.invalidate();
  }

  skip(identity: DecisionIdentity, reason: SuggestionDecisionReason): void {
    this.invalidate();
    this.#emit(this.#metadata(identity), "skipped", reason);
  }

  consider(identity: OwnedUiPromptSuggestionIdentity, decision: boolean | SuggestionDecision): void {
    const key = identityKey(identity);
    if (key === this.#lastConsidered) return;
    this.#lastConsidered = key;
    this.invalidate();
    const reason = this.#disposed ? "disposed" : !this.#enabled ? "disabled"
      : decision === false ? "ineligible" : decision === true ? null : decision;
    if (reason !== null) {
      this.#emit(this.#metadata(identity), "skipped", reason);
      return;
    }
    let reasoning: SuggestionDiagnosticRecord["reasoning"] = "unavailable";
    try { reasoning = this.options.generator.suggestionReasoningPolicy?.() ?? "unavailable"; } catch { /* Security: isolate diagnostic metadata failure. */ }
    const request: RequestLifetime = {
      identity,
      metadata: { ...this.#metadata(identity), request: ++this.#requestSequence, reasoning },
      abort: new AbortController(), startedAt: this.#now(), terminal: false,
    };
    this.#request = request;
    this.#state = { status: "generating", identity, settled: false };
    this.#emit(request.metadata, "started");
    request.timer = setTimeout(() => {
      if (this.#request !== request || this.#state.status !== "generating") return;
      this.#finish(request, "timeout");
      this.#state = { status: "idle" };
      this.#request = null;
      request.abort.abort();
    }, this.#timeoutMs);
    request.timer.unref?.();
    try {
      void this.options.generator.generate({ identity, signal: request.abort.signal })
        .then(result => this.#receive(request, result), () => this.#failed(request))
        .finally(() => clearTimeout(request.timer));
    } catch {
      this.#failed(request);
    }
  }

  settle(identity: OwnedUiPromptSuggestionIdentity): void {
    if (this.#disposed || !this.#enabled || this.#state.status === "idle") return;
    if (!samePromptSuggestionIdentity(this.#state.identity, identity)) {
      if (this.#request) this.#finish(this.#request, "stale-result", "stale-identity");
      this.invalidate();
      return;
    }
    if (this.#state.status === "generating") this.#state = { ...this.#state, settled: true };
    else if (this.#state.status === "prepared" && this.#request) this.#show(this.#request, this.#state.text);
  }

  accept(): void { this.#invalidate(false); }
  invalidate(): void { this.#invalidate(true); }

  dispose(): void {
    this.#disposed = true;
    this.invalidate();
    this.#lastConsidered = "";
    this.#sessionKey = "";
  }

  #invalidate(clearSurface: boolean): void {
    const hadVisibleSuggestion = this.#state.status === "available";
    const request = this.#request;
    if (request) this.#finish(request, "cancelled");
    this.#request = null;
    this.#state = { status: "idle" };
    request?.abort.abort();
    if (clearSurface && hadVisibleSuggestion) {
      this.options.surface.clear();
      this.options.surface.requestRender();
    }
  }

  #failed(request: RequestLifetime): void {
    if (this.#request !== request || request.terminal) {
      this.#late(request);
      return;
    }
    this.#finish(request, "provider-failure");
    this.#request = null;
    this.#state = { status: "idle" };
  }

  #receive(request: RequestLifetime, result: OwnedUiPromptSuggestionResult): void {
    if (this.#disposed || this.#request !== request || request.terminal || this.#state.status !== "generating") {
      this.#late(request);
      return;
    }
    try { assertOwnedUiPromptSuggestionResult(result); } catch {
      this.#finish(request, "rejected");
      this.invalidate();
      return;
    }
    if (!samePromptSuggestionIdentity(request.identity, result.identity)) {
      this.#finish(request, "stale-result", "stale-identity");
      this.invalidate();
      return;
    }
    if (result.outcome !== "candidate") {
      this.#finish(request, result.outcome);
      this.invalidate();
      return;
    }
    const text = normalizePromptSuggestionCandidate(result.text);
    if (text === null) {
      this.#finish(request, "rejected");
      this.invalidate();
      return;
    }
    clearTimeout(request.timer);
    if (this.#state.settled) this.#show(request, text);
    else this.#state = { status: "prepared", identity: request.identity, text };
  }

  #show(request: RequestLifetime, text: string): void {
    const reason = this.options.surface.presentationBlockReason?.(request.identity)
      ?? (this.options.surface.canPresent(request.identity) ? null : "presentation-unavailable");
    if (reason !== null || !this.options.surface.present(text)) {
      this.#finish(request, "presentation-blocked", reason ?? "presentation-unavailable");
      this.invalidate();
      return;
    }
    this.#state = { status: "available", identity: request.identity, text };
    this.#finish(request, "displayed");
    this.options.surface.requestRender();
  }

  #finish(request: RequestLifetime, event: SuggestionDiagnosticEvent, reason?: SuggestionDecisionReason): void {
    if (request.terminal) return;
    // Concurrency: retire before notifying observers or aborting; neither may rewrite the winner.
    request.terminal = true;
    clearTimeout(request.timer);
    this.#emit({ ...request.metadata, elapsedMs: Math.max(0, this.#now() - request.startedAt) }, event, reason);
  }

  #late(request: RequestLifetime): void {
    if (!this.#disposed) this.#emit({ ...request.metadata, elapsedMs: Math.max(0, this.#now() - request.startedAt) }, "late-result-discarded");
  }

  #metadata(identity: DecisionIdentity): SuggestionDiagnosticRecord {
    const key = `${identity.sessionId}\0${identity.sessionGeneration}`;
    if (this.#sessionKey !== key) { this.#sessionKey = key; this.#sessionSequence++; }
    return {
      event: "skipped", session: this.#sessionSequence, run: identity.runSequence, response: identity.responseSequence,
      request: 0, provider: identity.model?.providerId ?? "", model: identity.model?.modelId ?? "",
      reasoning: "unavailable", elapsedMs: 0,
    };
  }

  #emit(metadata: SuggestionDiagnosticRecord, event: SuggestionDiagnosticEvent, reason?: SuggestionDecisionReason): void {
    try { this.options.diagnostics?.record({ ...metadata, event, ...(reason === undefined ? {} : { reason }) }); } catch { /* Security: diagnostics never own input or lifecycle. */ }
  }
}

export function samePromptSuggestionIdentity(left: OwnedUiPromptSuggestionIdentity, right: OwnedUiPromptSuggestionIdentity): boolean {
  return left.sessionId === right.sessionId
    && left.sessionGeneration === right.sessionGeneration
    && left.runSequence === right.runSequence
    && left.responseSequence === right.responseSequence
    && left.model.providerId === right.model.providerId
    && left.model.modelId === right.model.modelId;
}

function identityKey(identity: OwnedUiPromptSuggestionIdentity): string {
  return `${identity.sessionId}\0${identity.sessionGeneration}\0${identity.runSequence}\0${identity.responseSequence}\0${identity.model.providerId}\0${identity.model.modelId}`;
}
