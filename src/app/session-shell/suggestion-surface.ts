import type {
  OwnedUiEvent,
  OwnedUiPromptSuggestionIdentity,
  OwnedUiSessionViewModel,
  SuggestionDecision,
} from "../../contracts/owned-ui/index.js";
import type { ContextualPromptSuggestionController, ContextualPromptSuggestionSurface } from "./prompt-suggestion-controller.js";
import type { OwnedUiSessionShellRoot } from "./session-shell-root.js";

type ResponseEvent = Extract<OwnedUiEvent, { readonly type: "assistant-message-completed" | "agent-run-settled" }>;

/** The provider/model key a suggestion identity and the session view are compared by; empty without a model. */
export function suggestionModelKey(view: Pick<OwnedUiSessionViewModel, "activeModel">): string {
  return view.activeModel === null ? "" : `${view.activeModel.providerId}/${view.activeModel.modelId}`;
}

/**
 * Why a completed response cannot seed a suggestion, checked in order; `prepareBlockReason` is asked
 * only when the response itself qualifies.
 */
export function responseSuggestionDecision(event: ResponseEvent, prepareBlockReason: () => SuggestionDecision): SuggestionDecision {
  if (!event.successful) return "failed-response";
  if (event.toolContinuation || event.stopReason === "toolUse") return "tool-continuation";
  if (event.stopReason !== "stop") return "incomplete-response";
  if (event.assistantMessageCount < 2) return "early-conversation";
  return prepareBlockReason();
}

/** Hands one completed or settled response to the controller: skipped without a model, otherwise considered or settled. */
export function routeResponseToSuggestions(
  controller: Pick<ContextualPromptSuggestionController, "skip" | "consider" | "settle"> | null,
  event: ResponseEvent,
  prepareBlockReason: () => SuggestionDecision,
): void {
  const identity = {
    sessionId: event.sessionId,
    sessionGeneration: event.sessionGeneration,
    runSequence: event.runSequence,
    responseSequence: event.responseSequence,
    model: event.model,
  };
  if (event.model === null) {
    controller?.skip(identity, "no-model");
    return;
  }
  const known = { ...identity, model: event.model };
  const decision = responseSuggestionDecision(event, prepareBlockReason);
  if (event.type === "assistant-message-completed") controller?.consider(known, decision);
  else controller?.settle(known, decision);
}

export interface SuggestionPresentationState {
  readonly disposed: boolean;
  readonly view: Pick<OwnedUiSessionViewModel, "sessionId" | "activeModel">;
  readonly sessionGeneration: number;
}

/** Why a prepared suggestion cannot be shown now: a released shell, a different session or model, or the root's own reason. */
export function suggestionPresentationBlockReason(
  identity: OwnedUiPromptSuggestionIdentity,
  state: SuggestionPresentationState,
  rootBlockReason: () => SuggestionDecision,
): SuggestionDecision {
  if (state.disposed) return "disposed";
  if (identity.sessionId !== state.view.sessionId || identity.sessionGeneration !== state.sessionGeneration
    || suggestionModelKey(state.view) !== `${identity.model.providerId}/${identity.model.modelId}`) return "stale-identity";
  return rootBlockReason();
}

/** The controller's view of the shell: ghost text in the root's editor, gated by `blockReason`. */
export function promptSuggestionSurface(
  root: Pick<OwnedUiSessionShellRoot, "canPresentPromptSuggestion" | "setPromptSuggestion">,
  blockReason: (identity: OwnedUiPromptSuggestionIdentity) => SuggestionDecision,
  requestRender: () => void,
): ContextualPromptSuggestionSurface {
  return {
    canPresent: identity => blockReason(identity) === null,
    presentationBlockReason: blockReason,
    present: text => {
      if (!root.canPresentPromptSuggestion()) return false;
      root.setPromptSuggestion(text);
      return true;
    },
    clear: () => root.setPromptSuggestion(null),
    requestRender,
  };
}
