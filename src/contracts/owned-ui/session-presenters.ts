/**
 * Presenters for the selectors and transcript renderers whose inputs are engine objects. The shell opens them
 * through this port and never holds those objects; the Pi session presenters owner implements it.
 */
import type { OwnedUiCommandResult, OwnedUiWorkflowRequest, OwnedUiWorkflowResult } from "./session-workflows.js";

/** A component that replaces the prompt editor while a selector is open. */
export interface OwnedUiInputSurface {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

/**
 * The terminal as one session presenter sees it. A render request from a presenter that is not the host's
 * active presenter paints nothing; the presenter keeps its state current and paints once it is attached.
 */
export interface OwnedUiPresenterHost {
  requestRender(force?: boolean): void;
  viewport(): { readonly columns: number; readonly rows: number };
  /** Present only where the shell holds frames while an optional selector module loads. */
  beginPresentationHold?(): () => void;
}

/** One engine session's presentation: its transcript, editor, controllers, and dialogs, and nothing terminal-wide. */
export interface OwnedUiSessionPresenter {
  render(width: number): readonly string[];
  handleInput(data: string): void;
  invalidate(): void;
  setFocused(focused: boolean): void;
  start(): void;
  waitUntilStopped(): Promise<void>;
  dispose(): Promise<void>;
}

/** Owns the process terminal and shows exactly one active presenter. */
export interface OwnedUiTerminalHost<Presenter extends OwnedUiSessionPresenter = OwnedUiSessionPresenter> {
  /** Makes the presenter active; its first frame is a full paint. */
  attach(presenter: Presenter): void;
  active(): Presenter | null;
  /** No-op unless `from` is the active presenter. */
  requestRender(from: Presenter, force?: boolean): void;
  start(): void;
  /** Ends the terminal: every presenter is released, the quit presentation plays, and the terminal is restored. */
  dispose(): Promise<void>;
}

/** The shell's side of a presenter: where the selector is shown and how its choices reach the session. */
export interface OwnedUiDialogHost extends OwnedUiPresenterHost {
  /** True once the shell is disposed; a presenter that awaited stops before showing anything. */
  readonly disposed: boolean;
  setInputSurface(surface: OwnedUiInputSurface | null): void;
  appendWorkflowStatus(text: string): void;
  appendWorkflowResult(result: OwnedUiWorkflowResult): void;
  runWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiCommandResult>;
  /** Present only where the surface can change TUI mode; false means overlays block the switch. */
  switchTuiMode?(mode: "regular" | "fullscreen"): boolean;
}

/** One extension shortcut row in the hotkeys document. */
export interface OwnedUiShortcutDescription {
  readonly key: string;
  readonly description: string;
}

/**
 * Extension renderer lookups for transcript components. Renderers are opaque objects that only the component
 * adapter inspects and validates; the shell passes this port through without reading them.
 */
export interface OwnedUiTranscriptRendererPort {
  getMessageRenderer(customType: string): object | undefined;
  getToolRenderers(toolName: string): object | undefined;
  getShortcuts(bindings: Readonly<Record<string, string | readonly string[] | undefined>>): readonly OwnedUiShortcutDescription[];
}

export interface OwnedUiSessionPresenters {
  transcriptRenderers(): OwnedUiTranscriptRendererPort;
  openModelSelector(host: OwnedUiDialogHost, initialSearchInput?: string): void;
  openSessionSelector(host: OwnedUiDialogHost, onExit: () => void): Promise<void>;
  /** `navigate` completes a selection that leaves the current leaf, including any summary prompt. */
  openTreeSelector(
    host: OwnedUiDialogHost,
    navigate: (entryId: string, skipSummaryPrompt: boolean) => void,
    initialSelectedId?: string,
  ): Promise<void>;
  openSettingsSelector(host: OwnedUiDialogHost): void;
  openModelsDialog(host: OwnedUiDialogHost, initialQuery?: string): void;
  openScopedModelsSelector(host: OwnedUiDialogHost): void;
}
