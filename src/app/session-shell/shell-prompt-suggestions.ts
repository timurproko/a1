import type { OwnedUiEvent, OwnedUiSessionViewModel, SuggestionDecision } from "../../contracts/owned-ui/index.js";
import { ContextualPromptSuggestionController, type ContextualPromptSuggestionSurface } from "./prompt-suggestion-controller.js";
import type { SessionConcern } from "./session-concern.js";
import type { OwnedUiShellSuggestionOptions } from "./session-shell-root.js";
import { routeResponseToSuggestions, suggestionModelKey } from "./suggestion-surface.js";

type ResponseEvent = Extract<OwnedUiEvent, { readonly type: "assistant-message-completed" | "agent-run-settled" }>;

/**
 * One shell's contextual prompt suggestions: the controller, its live enablement, and the model key that
 * invalidates a pending suggestion. Without suggestion options every call is a no-op.
 */
export class ShellPromptSuggestions implements SessionConcern {
  readonly #controller: ContextualPromptSuggestionController | null;
  readonly #unsubscribe: () => void;
  #modelKey: string;

  constructor(options: OwnedUiShellSuggestionOptions | undefined, surface: ContextualPromptSuggestionSurface, view: OwnedUiSessionViewModel) {
    this.#modelKey = suggestionModelKey(view);
    this.#controller = options === undefined ? null : new ContextualPromptSuggestionController({
      generator: options.generator,
      enabled: options.enabled(),
      ...(options.diagnostics === undefined ? {} : { diagnostics: options.diagnostics }),
      surface,
    });
    try {
      this.#unsubscribe = options === undefined ? () => {} : options.onChange(enabled => this.#controller?.setEnabled(enabled));
    } catch (error) {
      this.#controller?.dispose();
      throw error;
    }
  }

  invalidate(): void { this.#controller?.invalidate(); }
  abortPending(): void { this.#controller?.abortPending(); }
  accept(): void { this.#controller?.accept(); }
  restoreAvailable(): void { this.#controller?.restoreAvailable(); }

  /** Hands a completed or settled response to the controller. */
  route(event: ResponseEvent, prepareBlockReason: () => SuggestionDecision): void {
    routeResponseToSuggestions(this.#controller, event, prepareBlockReason);
  }

  /** Invalidates a pending suggestion when the session was replaced or the active model changed. */
  noteView(view: OwnedUiSessionViewModel, sessionReplaced: boolean): void {
    const key = suggestionModelKey(view);
    if (!sessionReplaced && key === this.#modelKey) return;
    this.#controller?.invalidate();
    this.#modelKey = key;
  }

  onSessionReplaced(): void { this.invalidate(); }

  dispose(): void {
    this.#controller?.dispose();
    this.#unsubscribe();
  }
}
