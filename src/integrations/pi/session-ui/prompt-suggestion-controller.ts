import {
  assertOwnedUiPromptSuggestionResult,
  normalizePromptSuggestionCandidate,
  observePromptSuggestion,
  type OwnedUiPromptSuggestionObserver,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionIdentity,
  type OwnedUiPromptSuggestionResult,
  type OwnedUiPromptSuggestionState,
} from "../../../contracts/owned-ui/index.js";

export interface ContextualPromptSuggestionSurface {
  canPresent(identity: OwnedUiPromptSuggestionIdentity): boolean;
  present(text: string): boolean;
  clear(): void;
  requestRender(): void;
}

export interface ContextualPromptSuggestionControllerOptions {
  readonly generator: OwnedUiPromptSuggestionGeneratorPort;
  readonly surface: ContextualPromptSuggestionSurface;
  readonly enabled: boolean;
  readonly timeoutMs?: number;
  readonly observe?: OwnedUiPromptSuggestionObserver;
}

/** Prefetches one candidate, holds it invisibly, and publishes only after matching settlement. */
export class ContextualPromptSuggestionController {
  #state: OwnedUiPromptSuggestionState = { status: "idle" };
  #epoch = 0;
  #abort: AbortController | null = null;
  #lastConsidered = "";
  #enabled: boolean;
  #disposed = false;
  #settledAt: number | null = null;
  #completedAt: number | null = null;
  readonly #timeoutMs: number;

  constructor(readonly options: ContextualPromptSuggestionControllerOptions) {
    this.#enabled = options.enabled;
    this.#timeoutMs = options.timeoutMs ?? 15_000;
  }

  get state(): OwnedUiPromptSuggestionState { return this.#state; }

  setEnabled(enabled: boolean): void {
    if (this.#enabled === enabled) return;
    this.#enabled = enabled;
    this.invalidate();
  }

  consider(identity: OwnedUiPromptSuggestionIdentity, eligible: boolean): void {
    const key = identityKey(identity);
    if (key === this.#lastConsidered) return;
    this.#lastConsidered = key;
    this.invalidate();
    if (!this.#enabled || this.#disposed || !eligible) {
      this.options.generator.release?.(identity);
      return;
    }
    const epoch = this.#epoch;
    const abort = new AbortController();
    this.#abort = abort;
    this.#state = { status: "generating", identity, settled: false };
    const timeout = setTimeout(() => {
      abort.abort();
      if (this.#epoch === epoch && this.#state.status === "generating") {
        this.invalidate();
      }
    }, this.#timeoutMs);
    timeout.unref?.();
    void this.options.generator.generate({ identity, signal: abort.signal, ...(this.options.observe ? { observe: this.options.observe } : {}) })
      .then(result => this.#receive(epoch, identity, result))
      .catch(() => this.#fail(epoch))
      .finally(() => {
        clearTimeout(timeout);
        if (this.#epoch === epoch) this.#abort = null;
      });
  }

  settle(identity: OwnedUiPromptSuggestionIdentity): void {
    if (this.#disposed || !this.#enabled || this.#state.status === "idle") return;
    if (!samePromptSuggestionIdentity(this.#state.identity, identity)) {
      this.invalidate();
      return;
    }
    this.#settledAt = performance.now();
    this.#observeAvailability(identity);
    if (this.#state.status === "generating") {
      this.#state = { ...this.#state, settled: true };
      return;
    }
    if (this.#state.status === "prepared") this.#show(identity, this.#state.text);
  }

  /** Recheck external configuration on ordinary shell events, without a polling timer. */
  refresh(): void {
    if (this.#state.status !== "idle" && this.options.generator.isCurrent?.(this.#state.identity) === false) this.invalidate();
  }

  accept(): void {
    this.#invalidate(false);
  }

  invalidate(): void {
    this.#invalidate(true);
  }

  dispose(): void {
    this.#disposed = true;
    this.invalidate();
  }

  #invalidate(clearSurface: boolean): void {
    const hadVisibleSuggestion = this.#state.status === "available";
    this.#epoch += 1;
    if (this.#state.status !== "idle") this.options.generator.release?.(this.#state.identity);
    this.#settledAt = null;
    this.#completedAt = null;
    this.#abort?.abort();
    this.#abort = null;
    this.#state = { status: "idle" };
    if (clearSurface && hadVisibleSuggestion) {
      this.options.surface.clear();
      this.options.surface.requestRender();
    }
  }

  #fail(epoch: number): void {
    if (this.#epoch !== epoch) return;
    this.invalidate();
  }

  #receive(epoch: number, identity: OwnedUiPromptSuggestionIdentity, result: OwnedUiPromptSuggestionResult): void {
    assertOwnedUiPromptSuggestionResult(result);
    if (this.#disposed || !this.#enabled || this.#epoch !== epoch || this.#state.status !== "generating") return;
    if (!samePromptSuggestionIdentity(identity, result.identity)) {
      this.invalidate();
      return;
    }
    const text = normalizePromptSuggestionCandidate(result.text);
    if (text === null) {
      this.#fail(epoch);
      return;
    }
    this.#completedAt = performance.now();
    this.#observeAvailability(identity);
    this.#abort = null;
    if (this.#state.settled) this.#show(identity, text);
    else this.#state = { status: "prepared", identity, text };
  }

  #observeAvailability(identity: OwnedUiPromptSuggestionIdentity): void {
    if (this.#settledAt === null || this.#completedAt === null) return;
    observePromptSuggestion(this.options.observe, { phase: "availability", sequence: identity.responseSequence,
      resultRelativeToSettlementMs: this.#completedAt - this.#settledAt });
  }

  #show(identity: OwnedUiPromptSuggestionIdentity, text: string): void {
    if (this.options.generator.isCurrent?.(identity) === false || !this.options.surface.canPresent(identity) || !this.options.surface.present(text)) {
      this.invalidate();
      return;
    }
    this.#state = { status: "available", identity, text };
    this.options.surface.requestRender();
  }
}

export function samePromptSuggestionIdentity(
  left: OwnedUiPromptSuggestionIdentity,
  right: OwnedUiPromptSuggestionIdentity,
): boolean {
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
