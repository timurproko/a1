import type { OwnedUiCommandResult, OwnedUiWorkflowRequest } from "../../contracts/owned-ui/index.js";

/** The owned selectors a workflow can open in place of asking the engine to choose. */
export interface WorkflowSelectors {
  showScopedModelsSelector(): void;
  showModelsDialog(initialQuery?: string): void;
  showModelSelector(initialSearchInput?: string): void;
  showForkSelector(): void;
  showThinkingSelector(): Promise<void>;
  showTrustSelector(): void;
  showSettingsSelector(): void;
  showSessionSelector(): Promise<void>;
  showLoginAuthTypeSelector(): void;
  showLoginMethodSelector(providerReference: string): void;
  showLogoutSelector(): Promise<void>;
  showTreeSelector(): Promise<void>;
}

interface SelectorRoute {
  readonly command: OwnedUiWorkflowRequest["command"];
  /** Whether this request still needs the user's choice; a selection, confirmation, or argument skips the selector. */
  readonly pending: (request: OwnedUiWorkflowRequest) => boolean;
  readonly open: (selectors: WorkflowSelectors, request: OwnedUiWorkflowRequest) => void | Promise<void>;
}

const unchosen = (request: OwnedUiWorkflowRequest) => request.selection === undefined && request.confirmed === undefined;
const unchosenBare = (request: OwnedUiWorkflowRequest) => unchosen(request) && request.argument.trim().length === 0;

// Invariant: the routes are checked in this order, matching the order the workflows were introduced.
const SELECTOR_ROUTES: readonly SelectorRoute[] = [
  { command: "scoped-models", pending: unchosen, open: selectors => selectors.showScopedModelsSelector() },
  { command: "models", pending: request => request.selection === undefined, open: (selectors, request) => selectors.showModelsDialog(request.argument.trim() || undefined) },
  { command: "model", pending: unchosenBare, open: selectors => selectors.showModelSelector() },
  { command: "fork", pending: unchosen, open: selectors => selectors.showForkSelector() },
  { command: "thinking", pending: request => request.selection === undefined && request.argument.trim().length === 0, open: selectors => selectors.showThinkingSelector() },
  { command: "trust", pending: unchosen, open: selectors => selectors.showTrustSelector() },
  { command: "settings", pending: unchosen, open: selectors => selectors.showSettingsSelector() },
  { command: "resume", pending: unchosenBare, open: selectors => selectors.showSessionSelector() },
  {
    command: "login",
    pending: unchosen,
    open: (selectors, request) => request.argument.trim().length === 0
      ? selectors.showLoginAuthTypeSelector()
      : selectors.showLoginMethodSelector(request.argument),
  },
  { command: "logout", pending: unchosen, open: selectors => selectors.showLogoutSelector() },
  { command: "tree", pending: unchosenBare, open: selectors => selectors.showTreeSelector() },
];

/**
 * Opens the owned selector a workflow request asks for when the user has not chosen yet. Returns
 * the command result when a selector handled the request, settling once an asynchronous selector
 * has opened, or undefined when the request goes to the engine. The decision itself is synchronous,
 * so a request that goes to the engine reaches it in the same turn.
 */
export function openWorkflowSelector(
  request: OwnedUiWorkflowRequest,
  selectors: WorkflowSelectors,
  options: { readonly residentTab: boolean },
): OwnedUiCommandResult | Promise<OwnedUiCommandResult> | undefined {
  const route = SELECTOR_ROUTES.find(candidate => candidate.command === request.command && candidate.pending(request));
  if (route === undefined) return undefined;
  if (route.command === "settings" && options.residentTab) {
    return { outcome: "rejected", diagnostic: "Settings is available from the global Settings tab." };
  }
  const completed: OwnedUiCommandResult = { outcome: "completed", diagnostic: null };
  const opened = route.open(selectors, request);
  return opened instanceof Promise ? opened.then(() => completed) : completed;
}
