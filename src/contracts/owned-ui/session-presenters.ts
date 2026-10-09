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

/** The shell's side of a presenter: where the selector is shown and how its choices reach the session. */
export interface OwnedUiDialogHost {
  /** True once the shell is disposed; a presenter that awaited stops before showing anything. */
  readonly disposed: boolean;
  setInputSurface(surface: OwnedUiInputSurface | null): void;
  requestRender(): void;
  viewport(): { readonly columns: number; readonly rows: number };
  appendWorkflowStatus(text: string): void;
  appendWorkflowResult(result: OwnedUiWorkflowResult): void;
  runWorkflow(request: OwnedUiWorkflowRequest): Promise<OwnedUiCommandResult>;
  /** Present only where the shell holds frames while an optional selector module loads. */
  beginPresentationHold?(): () => void;
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
