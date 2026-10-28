import { caretCell } from "../../ui/components/line-input.js";
import { PromptInput } from "../../ui/components/prompt-input.js";
import { backgroundSgrSpan, hyperlinkSgrSpan } from "../../ui/components/spans.js";
import { faint, stripAnsi } from "../../ui/components/text.js";
import { paintTextSelection } from "../../ui/components/text-selection.js";
import { createPiShellEditor } from "../../integrations/pi/components/shell-editor-autocomplete.js";
import { piTheme } from "../../integrations/pi/components/upstream/theme/theme.js";
import {
  piShellTruncateToWidth,
  piShellVisibleWidth,
  type PiShellEditorOptions,
  type PiShellEditorPort,
} from "../../integrations/pi/components/shell-shared-facade.js";
import { EditorHyperlinkBudget } from "./editor-hyperlink-budget.js";
import { canPreparePasteInline } from "./paste-text-preparation.js";
import type { PasteEvent, PasteSource } from "./paste-protocol.js";
import type { PromptChipStore } from "./prompt-chips.js";

/** The shell callbacks the editor is wired to; the editor receives the whole object as its own options. */
export type ShellEditorHandlers = Omit<PiShellEditorOptions, "onChange" | "onToolsExpand" | "keybindingProfile"> & {
  readonly requestRender: (force?: boolean) => void;
  readonly onEditorChange?: (text: string) => void;
  readonly captureClipboardPaste?: () => PasteSource;
  readonly pasteDiagnostics?: (event: PasteEvent) => void;
};

export interface ShellEditorPorts {
  readonly handlers: ShellEditorHandlers;
  readonly customViewport: boolean;
  readonly cwd: string;
  readonly agentDir?: string;
  readonly promptChips: PromptChipStore;
  /** True while a pointer drag selects editor text, which paints links as plain underlines. */
  readonly editorPointerSelecting: () => boolean;
  /** The next payload-free paste diagnostic id, shared with the viewport's own paste diagnostics. */
  readonly nextPasteDiagnosticRequest: () => number;
  readonly toggleToolsExpanded: () => void;
}

/**
 * Builds the session's prompt editor: chip-aware paste, selection, and hyperlink decoration over
 * the Pi editor, plus bare A1's prompt presentation and terminal paste diagnostics.
 */
export function createShellEditor(ports: ShellEditorPorts): PiShellEditorPort {
  const { handlers, customViewport, promptChips } = ports;
  let terminalPasteDiagnosticRequest: number | undefined;
  const editor: PiShellEditorPort = createPiShellEditor({
    ...handlers,
    keybindingProfile: customViewport ? "a1" : "pi",
    ...(handlers.keybindings === undefined ? {} : { keybindings: handlers.keybindings }),
    paintEditorSelection: (line, from, to, atomic) => atomic
      ? backgroundSgrSpan(line, from, to, "\u001b[7m", "\u001b[27m", piShellVisibleWidth)
      : paintTextSelection(line, from, to, piShellVisibleWidth, true),
    transformPastedContent: content => {
      try {
        return promptChips.transformPastedContent(content, editor.getText());
      } catch (error) {
        handlers.onPasteRejected?.(error);
        return "";
      }
    },
    ...(customViewport ? {
      beginClipboardPaste: () => promptChips.beginPaste(
        editor.getText(),
        handlers.captureClipboardPaste?.() ?? { kind: "provided", read: signal => handlers.readClipboardContent?.(signal) ?? Promise.resolve(null) },
        error => handlers.onPasteRejected?.(error),
        () => handlers.requestRender(),
      ),
      onPasteInput: (bytes, phase) => {
        try {
          if (phase === "framing") terminalPasteDiagnosticRequest = ports.nextPasteDiagnosticRequest();
          const request = terminalPasteDiagnosticRequest ?? ports.nextPasteDiagnosticRequest();
          handlers.pasteDiagnostics?.({ request, phase, bytes, atMs: performance.now(), pending: 0, transport: "terminal",
            ...(phase === "settled" ? { outcome: "ready" as const } : {}) });
          if (phase === "settled") terminalPasteDiagnosticRequest = undefined;
        } catch { /* Invariant: payload-free diagnostics cannot interfere with the input path. */ }
      },
      deferTextPaste: text => !canPreparePasteInline(text),
      beginTextPaste: text => promptChips.beginPaste(
        editor.getText(), { kind: "text", text }, error => handlers.onPasteRejected?.(error),
      ),
    } satisfies Partial<PiShellEditorOptions> : {}),
    editorAtomicRanges: line => promptChips.atomicRanges(line),
    editorHiddenRanges: line => promptChips.hiddenRanges(line),
    decorateEditorRow: editorRowDecorator(promptChips, ports.editorPointerSelecting),

    expandCopiedEditorText: text => promptChips.expandCopiedText(text),
    cwd: ports.cwd,
    ...(ports.agentDir === undefined ? {} : { agentDir: ports.agentDir }),
    onToolsExpand: () => ports.toggleToolsExpanded(),
    ...(customViewport ? {
      promptPresentation: {
        input: new PromptInput({ fg: (token, text) => piTheme().fg(token, text) }, {
          measure: piShellVisibleWidth,
          truncate: piShellTruncateToWidth,
        }),
        styleSuggestion: faint,
        styleSuggestionCaret: caretCell,
      },
    } : {}),
    onChange: text => {
      handlers.onEditorChange?.(text);
      // Concurrency: Pi clears before onSubmit; capture waiting references before pruning removed chips.
      queueMicrotask(() => promptChips.reconcileDraft(editor.getText()));
    },
    ...(handlers.onPromptSuggestionAccepted === undefined ? {} : { onPromptSuggestionAccepted: handlers.onPromptSuggestionAccepted }),
  });
  return editor;
}

/**
 * Dims unsent chips and turns the draft's URLs into terminal hyperlinks, each target once per
 * decoration pass; while a pointer drag selects, links paint as plain underlines instead.
 */
function editorRowDecorator(
  promptChips: PromptChipStore,
  editorPointerSelecting: () => boolean,
): (row: string, width: number, rowIndex: number) => string {
  const editorHyperlinks = new EditorHyperlinkBudget();
  return (row, width, rowIndex) => {
    if (rowIndex === 0) editorHyperlinks.reset();
    const plain = stripAnsi(row);
    const dimmed = promptChips.unsentRanges(plain).reduce((result, range) => backgroundSgrSpan(
      result,
      piShellVisibleWidth(plain.slice(0, range.start)),
      piShellVisibleWidth(plain.slice(0, range.end)),
      "\u001b[2m",
      "\u001b[22m",
      piShellVisibleWidth,
    ), row);
    const ranges = promptChips.hyperlinkRanges(plain);
    if (ranges.length === 0 || !editorHyperlinks.takeCleanup()) return dimmed;
    const linkResetAndTail = `\u001b]8;;\u001b\\\u001b[24m${" ".repeat(Math.max(0, width - piShellVisibleWidth(dimmed)))}`;
    // Platform: VS15 is zero-column and default-ignorable. It breaks Windows Terminal's
    // plain-text URL detector only in the held-button paint; semantic text stays exact.
    const selecting = editorPointerSelecting();
    const paintRow = selecting
      ? dimmed.replaceAll("https://", "https:︎//").replaceAll("http://", "http:︎//")
      : dimmed;
    const decorated = selecting
      ? ranges.reduce((result, range) => backgroundSgrSpan(
          result,
          piShellVisibleWidth(plain.slice(0, range.start)),
          piShellVisibleWidth(plain.slice(0, range.end)),
          "\u001b[4:4m",
          "\u001b[24m",
          piShellVisibleWidth,
        ), paintRow)
      : ranges.filter(range => editorHyperlinks.take(range.target)).reduce((result, range) => hyperlinkSgrSpan(
          result,
          piShellVisibleWidth(plain.slice(0, range.start)),
          piShellVisibleWidth(plain.slice(0, range.end)),
          range.target,
          piShellVisibleWidth,
        ), dimmed);
    // Platform: Windows Terminal can retain stale native dotted-link cells when a mutable
    // prompt replaces a longer URL. Explicit non-link spaces overwrite that tail.
    return `${decorated}${linkResetAndTail}`;
  };
}
