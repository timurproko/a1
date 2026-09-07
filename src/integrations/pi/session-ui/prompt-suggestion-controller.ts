import {
  assertOwnedUiPromptSuggestionResult,
  normalizePromptSuggestionCandidate,
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
}

/** Prefetches one candidate, holds it invisibly, and publishes only after matching settlement. */
export class ContextualPromptSuggestionController {
  #state: OwnedUiPromptSuggestionState = { status: "idle" };
  #epoch = 0;
  #abort: AbortController | null = null;
  #lastConsidered = "";
  #enabled: boolean;
  #disposed = false;
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
    if (!this.#enabled || this.#disposed || !eligible) return;
    const epoch = this.#epoch;
    const abort = new AbortController();
    this.#abort = abort;
    this.#state = { status: "generating", identity, settled: false };
    const timeout = setTimeout(() => {
      abort.abort();
      if (this.#epoch === epoch && this.#state.status === "generating") {
        this.#abort = null;
        this.#state = { status: "idle" };
      }
    }, this.#timeoutMs);
    timeout.unref?.();
    void this.options.generator.generate({ identity, signal: abort.signal })
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
    if (this.#state.status === "generating") {
      this.#state = { ...this.#state, settled: true };
      return;
    }
    if (this.#state.status === "prepared") this.#show(identity, this.#state.text);
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
    this.#abort = null;
    this.#state = { status: "idle" };
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
    this.#abort = null;
    if (this.#state.settled) this.#show(identity, text);
    else this.#state = { status: "prepared", identity, text };
  }

  #show(identity: OwnedUiPromptSuggestionIdentity, text: string): void {
    if (!this.options.surface.canPresent(identity) || !this.options.surface.present(text)) {
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
