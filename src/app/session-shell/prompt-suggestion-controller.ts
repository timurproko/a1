import {
  assertOwnedUiPromptSuggestionResult,
  normalizePromptSuggestionCandidate,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiPromptSuggestionState,
  type SuggestionAttemptTrigger,
  type SuggestionDecision,
  type SuggestionDecisionReason,
  type SuggestionDiagnosticEvent,
  type SuggestionDiagnosticObserver,
  type SuggestionDiagnosticRecord,
} from "../../contracts/owned-ui/index.js";

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
interface SuggestionLifecycle {
  readonly identity: OwnedUiPromptSuggestionIdentity;
  settled: boolean;
  attempts: number;
  retryPending: boolean;
  presentationDeferred: boolean;
}
interface RequestLifetime {
  readonly identity: OwnedUiPromptSuggestionIdentity;
  readonly metadata: SuggestionDiagnosticRecord;
  readonly abort: AbortController;
  readonly startedAt: number;
  terminal: boolean;
  timer?: ReturnType<typeof setTimeout>;
}

const TRANSIENT_PRESENTATION_REASONS = new Set<SuggestionDecisionReason>([
  "not-ready", "not-focused", "autocomplete", "prompt-mode",
]);
const RETRYABLE_OUTCOMES = new Set<SuggestionDiagnosticEvent>([
  "empty", "rejected", "provider-failure", "unavailable", "timeout",
]);

/** Prefetches one inert candidate and owns one bounded settlement/retry recovery lifecycle. */
export class ContextualPromptSuggestionController {
  #state: OwnedUiPromptSuggestionState = { status: "idle" };
  #lifecycle: SuggestionLifecycle | null = null;
  #request: RequestLifetime | null = null;
  #lastConsidered = "";
  #retiredIdentity = "";
  #enabled: boolean;
  #disposed = false;
  #sessionKey = "";
  #sessionSequence = 0;
  #requestSequence = 0;
  readonly #timeoutMs: number;
  readonly #now: () => number;

  readonly options: ContextualPromptSuggestionControllerOptions;
  constructor(options: ContextualPromptSuggestionControllerOptions) {
    this.options = options;
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
    this.#lastConsidered = decisionIdentityKey(identity);
    this.#emit(this.#metadata(identity), "skipped", reason);
  }

  consider(identity: OwnedUiPromptSuggestionIdentity, decision: boolean | SuggestionDecision): void {
    const key = identityKey(identity);
    if (key === this.#lastConsidered) return;
    this.#lastConsidered = key;
    this.#reset(true, true);
    const reason = this.#decisionReason(decision);
    if (reason !== null) {
      this.#emit(this.#metadata(identity), "skipped", reason);
      return;
    }
    this.#retiredIdentity = "";
    this.#lifecycle = { identity, settled: false, attempts: 0, retryPending: false, presentationDeferred: false };
    this.#startAttempt("prefetch");
  }

  /** Settles an existing prefetch or starts the first request when that eligible prefetch was missed. */
  settle(identity: OwnedUiPromptSuggestionIdentity, decision: boolean | SuggestionDecision = null): void {
    if (this.#disposed || !this.#enabled || identityKey(identity) === this.#retiredIdentity) return;
    const reason = this.#decisionReason(decision);
    const lifecycle = this.#lifecycle;
    if (lifecycle !== null && !samePromptSuggestionIdentity(lifecycle.identity, identity)) {
      if (this.#request) this.#finish(this.#request, "stale-result", "stale-identity");
      this.#reset(true, true);
    }
    if (reason !== null) {
      if (this.#lifecycle !== null) this.#reset(true, true);
      else this.#emit(this.#metadata(identity), "skipped", reason);
      return;
    }
    if (this.#lifecycle === null) {
      this.#retiredIdentity = "";
      this.#lifecycle = { identity, settled: true, attempts: 0, retryPending: false, presentationDeferred: false };
      this.#startAttempt("settlement");
      return;
    }
    this.#lifecycle.settled = true;
    if (this.#lifecycle.retryPending) {
      this.#startAttempt("retry");
      return;
    }
    if (this.#state.status === "generating") this.#state = { ...this.#state, settled: true };
    else if (this.#state.status === "prepared" && this.#request) this.#show(this.#request, this.#state.text);
  }

  accept(): void { this.#reset(false, true); }
  invalidate(): void { this.#reset(true, true); }

  /** Retires generating or scheduled recovery; a prepared or available suggestion survives a draft edit. */
  abortPending(): void {
    if (this.#state.status !== "generating" && !(this.#state.status === "idle" && this.#lifecycle?.retryPending)) return;
    this.#reset(false, true);
  }

  /** Reasserts retained ghost text or retries a deferred presentation when the editor is eligible. */
  restoreAvailable(): void {
    if (this.#disposed || !this.#enabled) return;
    if (this.#state.status === "prepared" && this.#lifecycle?.settled && this.#request) {
      this.#show(this.#request, this.#state.text);
      return;
    }
    if (this.#state.status !== "available") return;
    const reason = this.options.surface.presentationBlockReason?.(this.#state.identity)
      ?? (this.options.surface.canPresent(this.#state.identity) ? null : "presentation-unavailable");
    if (reason !== null || !this.options.surface.present(this.#state.text)) return;
    this.options.surface.requestRender();
  }

  dispose(): void {
    this.#disposed = true;
    this.invalidate();
    this.#lastConsidered = "";
    this.#retiredIdentity = "";
    this.#sessionKey = "";
  }

  #decisionReason(decision: boolean | SuggestionDecision): SuggestionDecision {
    return this.#disposed ? "disposed" : !this.#enabled ? "disabled"
      : decision === false ? "ineligible" : decision === true ? null : decision;
  }

  #startAttempt(trigger: SuggestionAttemptTrigger): void {
    const lifecycle = this.#lifecycle;
    if (lifecycle === null || this.#request !== null || lifecycle.attempts >= 2) return;
    lifecycle.retryPending = false;
    lifecycle.presentationDeferred = false;
    const attempt = ++lifecycle.attempts;
    let reasoning: SuggestionDiagnosticRecord["reasoning"] = "unavailable";
    try { reasoning = this.options.generator.suggestionReasoningPolicy?.() ?? "unavailable"; } catch { /* Security: isolate diagnostic metadata failure. */ }
    const request: RequestLifetime = {
      identity: lifecycle.identity,
      metadata: { ...this.#metadata(lifecycle.identity), request: ++this.#requestSequence, reasoning, attempt, trigger },
      abort: new AbortController(), startedAt: this.#now(), terminal: false,
    };
    this.#request = request;
    this.#state = { status: "generating", identity: lifecycle.identity, settled: lifecycle.settled };
    this.#emit(request.metadata, "started");
    request.timer = setTimeout(() => {
      if (this.#request !== request || this.#state.status !== "generating") return;
      this.#finish(request, "timeout");
      this.#request = null;
      this.#state = { status: "idle" };
      request.abort.abort();
      this.#completeNoCandidate(request, "timeout");
    }, this.#timeoutMs);
    request.timer.unref?.();
    try {
      void this.options.generator.generate({ identity: lifecycle.identity, signal: request.abort.signal })
        .then(result => this.#receive(request, result), () => this.#failed(request))
        .finally(() => clearTimeout(request.timer));
    } catch {
      this.#failed(request);
    }
  }

  #reset(clearSurface: boolean, retire: boolean): void {
    const hadVisibleSuggestion = this.#state.status === "available";
    const identity = this.#lifecycle?.identity ?? (this.#state.status === "idle" ? null : this.#state.identity);
    const request = this.#request;
    if (request) this.#finish(request, "cancelled");
    this.#request = null;
    this.#lifecycle = null;
    this.#state = { status: "idle" };
    request?.abort.abort();
    if (retire && identity !== null) this.#retiredIdentity = identityKey(identity);
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
    this.#completeNoCandidate(request, "provider-failure");
  }

  #receive(request: RequestLifetime, result: OwnedUiPromptSuggestionResult): void {
    if (this.#disposed || this.#request !== request || request.terminal || this.#state.status !== "generating") {
      this.#late(request);
      return;
    }
    try { assertOwnedUiPromptSuggestionResult(result); } catch {
      this.#finish(request, "rejected");
      this.#request = null;
      this.#state = { status: "idle" };
      this.#completeNoCandidate(request, "rejected");
      return;
    }
    if (!samePromptSuggestionIdentity(request.identity, result.identity)) {
      this.#finish(request, "stale-result", "stale-identity");
      this.#reset(true, true);
      return;
    }
    if (result.outcome !== "candidate") {
      this.#finish(request, result.outcome);
      this.#request = null;
      this.#state = { status: "idle" };
      if (RETRYABLE_OUTCOMES.has(result.outcome)) this.#completeNoCandidate(request, result.outcome);
      else {
        this.#retiredIdentity = identityKey(request.identity);
        this.#lifecycle = null;
      }
      return;
    }
    const text = normalizePromptSuggestionCandidate(result.text);
    if (text === null) {
      this.#finish(request, "rejected");
      this.#request = null;
      this.#state = { status: "idle" };
      this.#completeNoCandidate(request, "rejected");
      return;
    }
    clearTimeout(request.timer);
    if (this.#lifecycle?.settled) this.#show(request, text);
    else this.#state = { status: "prepared", identity: request.identity, text };
  }

  #completeNoCandidate(request: RequestLifetime, outcome: SuggestionDiagnosticEvent): void {
    const lifecycle = this.#lifecycle;
    if (lifecycle === null || !samePromptSuggestionIdentity(lifecycle.identity, request.identity)) return;
    if (lifecycle.attempts >= 2 || !RETRYABLE_OUTCOMES.has(outcome)) {
      this.#emit({ ...request.metadata, elapsedMs: Math.max(0, this.#now() - request.startedAt) }, "retry-exhausted");
      this.#retiredIdentity = identityKey(request.identity);
      this.#lifecycle = null;
      return;
    }
    lifecycle.retryPending = true;
    if (lifecycle.settled) this.#startAttempt("retry");
  }

  #show(request: RequestLifetime, text: string): void {
    const reason = this.options.surface.presentationBlockReason?.(request.identity)
      ?? (this.options.surface.canPresent(request.identity) ? null : "presentation-unavailable");
    if (reason !== null && TRANSIENT_PRESENTATION_REASONS.has(reason)) {
      this.#state = { status: "prepared", identity: request.identity, text };
      if (this.#lifecycle !== null && !this.#lifecycle.presentationDeferred) {
        this.#lifecycle.presentationDeferred = true;
        this.#emit({ ...request.metadata, elapsedMs: Math.max(0, this.#now() - request.startedAt) }, "presentation-deferred", reason);
      }
      return;
    }
    if (reason !== null || !this.options.surface.present(text)) {
      this.#finish(request, "presentation-blocked", reason ?? "presentation-unavailable");
      this.#reset(true, true);
      return;
    }
    this.#state = { status: "available", identity: request.identity, text };
    this.#finish(request, "displayed");
    if (this.#lifecycle !== null) this.#lifecycle.presentationDeferred = false;
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

function decisionIdentityKey(identity: DecisionIdentity): string {
  return identity.model === null
    ? `${identity.sessionId}\0${identity.sessionGeneration}\0${identity.runSequence}\0${identity.responseSequence}\0\0`
    : identityKey(identity as OwnedUiPromptSuggestionIdentity);
}
