import type { OwnedUiSessionViewModel, OwnedUiTranscriptBlock } from "../../../src/contracts/owned-ui/index.js";
import { applyPiTheme, createPiShellDialog, createPiShellSelector } from "../../../src/integrations/pi/components/index.js";
import { OwnedUiSessionShellRoot } from "../../../src/integrations/pi/session-ui/index.js";

export const STATIC_PARITY_COVERAGE = [
  "transcript",
  "streaming",
  "tools",
  "editor",
  "queued-input",
  "dialogs",
  "selectors",
  "status",
  "errors",
  "resize",
] as const;

export interface StaticParityCase {
  readonly id: string;
  readonly width: number;
  readonly coverage: readonly string[];
  readonly rows: readonly string[];
}

export function buildStaticParityCases(): readonly StaticParityCase[] {
  applyPiTheme("dark", false, "truecolor");
  const view = staticView();
  const root = new OwnedUiSessionShellRoot(view, "D:/work", {
    getColumns: () => 72,
    getRows: () => 30,
    requestRender() {},
    onSubmit() {},
    onInterrupt() {},
    onExit() {},
    onModelSelect() {},
    onThinkingCycle() {},
  });
  root.editor.setText("Queued-aware editor text");

  const dialog = createPiShellDialog({
    id: "confirm",
    title: "Confirm action",
    kind: "confirmation",
    payload: { options: [{ id: "yes", label: "Yes" }, { id: "no", label: "No" }] },
  });
  const selector = createPiShellSelector({
    title: "Select model",
    options: [
      { id: "openai/gpt-5", label: "GPT-5", description: "openai/gpt-5" },
      { id: "anthropic/claude", label: "Claude", description: "anthropic/claude" },
    ],
  });

  const cases = [
    parityCase("shell-72", 72, ["transcript", "streaming", "tools", "editor", "queued-input", "status", "errors"], root.render(72)),
    parityCase("shell-resize-44", 44, ["resize", "transcript", "streaming", "tools", "editor", "queued-input", "status", "errors"], root.render(44)),
    parityCase("dialog-52", 52, ["dialogs"], dialog.render(52)),
    parityCase("selector-48", 48, ["selectors"], selector.render(48)),
  ];
  root.dispose();
  return cases;
}

function parityCase(id: string, width: number, coverage: readonly string[], rows: readonly string[]): StaticParityCase {
  return { id, width, coverage, rows: rows.map(normalizeParityRow) };
}

export function normalizeParityRow(row: string): string {
  return row
    .replace(/\u001b\][\s\S]*?(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "")
    .replace("\u001b_pi:c\u0007", "")
    .replace(/(?:~\/\S*\/)?D:\/work/g, "D:/work");
}

function staticView(): OwnedUiSessionViewModel {
  const transcript: readonly OwnedUiTranscriptBlock[] = [
    block("user", "Inspect parity"),
    block("assistant", "Final assistant response"),
    { ...block("assistant", "Streaming assistant response"), id: "assistant-live", status: "live" },
    block("thinking", "Evaluate fixture coverage"),
    block("tool-call", "", {
      toolCallId: "tool-1",
      toolName: "read",
      arguments: { json: { path: "README.md" } },
    }),
    block("tool-result", "Read complete", {
      toolCallId: "tool-1",
      toolName: "read",
      arguments: { json: { path: "README.md" } },
      isError: false,
    }),
    block("retry", "Retrying request"),
    block("compaction", "Compacted conversation summary", { tokensBefore: 2048 }),
    block("error", "Synthetic parity error"),
    block("system", "System notice"),
  ];
  return {
    contractVersion: 1,
    sessionId: "parity-session",
    revision: 10,
    lifecycle: "busy",
    transcript,
    editor: {
      text: "Queued-aware editor text",
      queuedSubmissions: ["First queued prompt", "Second queued prompt"],
      selection: null,
      cursorOffset: 24,
      historyRevision: 1,
      submitEnabled: true,
    },
    status: { title: "Pi", workingMessage: "Working", diagnostics: [], badges: ["busy"] },
    terminal: { columns: 72, rows: 30, focusedRegion: "editor", hardwareCursor: false },
    activeModel: { providerId: "openai", modelId: "gpt-5", displayName: "GPT-5" },
    thinkingLevel: "medium",
    activeCommandIds: ["prompt-1"],
    dialog: null,
    overlay: null,
    customizations: [],
    diagnostics: [{ sequence: 1, code: "fixture", severity: "warning", message: "Parity diagnostic", recoverable: true }],
  };
}

function block(kind: OwnedUiTranscriptBlock["kind"], text: string, payload: unknown = {}): OwnedUiTranscriptBlock {
  return {
    id: `${kind}-fixture`,
    kind,
    status: "finalized",
    revision: 1,
    title: kind.startsWith("tool") ? "read" : null,
    text,
    payload,
  };
}
