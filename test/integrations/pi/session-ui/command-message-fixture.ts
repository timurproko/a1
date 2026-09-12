import type { OwnedUiSessionViewModel } from "../../../../src/contracts/owned-ui/index.js";

export interface CommandMessageStep {
  readonly kind: "status" | "error" | "warning" | "new" | "name" | "debug" | "content" | "surface";
  readonly text: string;
  readonly normalizedName?: string;
}

export interface CommandMessageCase {
  readonly id: string;
  readonly steps: readonly CommandMessageStep[];
}

const long = "A long command result with Unicode 日本語 👩‍💻 and enough words to wrap across narrow terminal rows.";
export const COMMAND_MESSAGE_CASES: readonly CommandMessageCase[] = [
  { id: "status", steps: [{ kind: "status", text: long }] },
  { id: "error", steps: [{ kind: "error", text: `${long}\n  second line with preserved indentation` }] },
  { id: "warning", steps: [{ kind: "warning", text: `${long}\nsecond warning line` }] },
  { id: "new", steps: [{ kind: "new", text: "" }] },
  { id: "name", steps: [{ kind: "name", text: long }] },
  { id: "name-normalized", steps: [{ kind: "name", text: "original name", normalizedName: long }] },
  { id: "name-empty", steps: [{ kind: "name", text: "" }] },
  { id: "name-current", steps: [{ kind: "name", text: "retained name" }, { kind: "name", text: "" }] },
  { id: "debug", steps: [{ kind: "debug", text: "" }] },
  { id: "share-multiline", steps: [{ kind: "status", text: "Share URL: https://pi.dev/session/#synthetic-fixture\nGist: https://gist.github.com/fixture/synthetic-fixture" }] },
  { id: "consecutive-status", steps: [{ kind: "status", text: "old status" }, { kind: "status", text: long }] },
  { id: "intervening-error", steps: [{ kind: "status", text: "first status" }, { kind: "error", text: long }, { kind: "status", text: "latest status" }] },
  { id: "intervening-warning", steps: [{ kind: "status", text: "first status" }, { kind: "warning", text: long }, { kind: "status", text: "latest status" }] },
  { id: "intervening-content", steps: [{ kind: "status", text: "first status" }, { kind: "content", text: "persistent message" }, { kind: "status", text: "latest status" }] },
  { id: "modal-restoration", steps: [{ kind: "error", text: long }, { kind: "surface", text: "open" }, { kind: "surface", text: "close" }, { kind: "status", text: "after modal" }] },
];

export function commandMessageView(): OwnedUiSessionViewModel {
  return {
    contractVersion: 1, sessionId: "command-message-fixture", revision: 1, lifecycle: "ready", transcript: [],
    editor: { text: "", queuedSubmissions: [], selection: null, cursorOffset: 0, historyRevision: 0, submitEnabled: true },
    status: { title: "Pi", workingMessage: null, diagnostics: [], badges: [] },
    terminal: { columns: 80, rows: 24, focusedRegion: "editor", hardwareCursor: false },
    activeModel: null, thinkingLevel: "off", activeCommandIds: [], dialog: null, overlay: null, customizations: [], diagnostics: [],
  };
}
