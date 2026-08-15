import {
  CustomEditor,
  FooterComponent,
  getSelectListTheme,
  initTheme,
  rawKeyHint,
  VERSION,
} from "@earendil-works/pi-coding-agent";
import {
  KeybindingsManager,
  Loader,
  Spacer,
  stripTerminalSequences,
  Text,
  TUI_KEYBINDINGS,
  type Component,
  type TUI,
} from "@earendil-works/pi-tui";

export interface StartupCaptureState {
  readonly id: string;
  readonly width: number;
  readonly cwd: string;
  readonly quiet: boolean;
  readonly expanded: boolean;
  readonly lifecycle: "ready" | "busy";
  readonly workingMessage: string | null;
  readonly model: { readonly providerId: string; readonly modelId: string } | null;
  readonly thinkingLevel: "off" | "medium";
  readonly notices: readonly { readonly kind: "info" | "warning" | "error"; readonly message: string }[];
}

export const PINNED_STARTUP_STATES: readonly StartupCaptureState[] = [
  { id: "ready-collapsed-80", width: 80, cwd: "D:/work", quiet: false, expanded: false, lifecycle: "ready", workingMessage: null, model: { providerId: "openai", modelId: "gpt-5" }, thinkingLevel: "medium", notices: [] },
  { id: "busy-expanded-60", width: 60, cwd: "D:/work", quiet: false, expanded: true, lifecycle: "busy", workingMessage: "Working…", model: { providerId: "openai", modelId: "gpt-5" }, thinkingLevel: "medium", notices: [] },
  { id: "quiet-no-model-44", width: 44, cwd: "D:/work", quiet: true, expanded: false, lifecycle: "ready", workingMessage: null, model: null, thinkingLevel: "off", notices: [] },
  { id: "warning-collapsed-72", width: 72, cwd: "D:/work", quiet: false, expanded: false, lifecycle: "ready", workingMessage: null, model: { providerId: "anthropic", modelId: "claude-sonnet" }, thinkingLevel: "off", notices: [{ kind: "warning", message: "Pinned startup warning" }] },
];

export interface StartupCapture {
  readonly id: string;
  readonly width: number;
  readonly rows: readonly string[];
}

/** Independent producer reconstructed directly from pinned upstream composition and public components. */
export function capturePinnedUpstreamStartup(state: StartupCaptureState): StartupCapture {
  initTheme("dark", false);
  const header = state.quiet ? [] : renderHeader(state);
  const status = renderStatus(state);
  const editor = createUpstreamEditor(state.width).render(state.width);
  const footer = createUpstreamFooter(state).render(state.width);
  return { id: state.id, width: state.width, rows: [...header, ...status, ...editor, ...footer].map(normalizeRow) };
}

function renderStatus(state: StartupCaptureState): string[] {
  if (state.lifecycle !== "busy") return [];
  const loader = new Loader(createTui(state.width), value => value, value => value, state.workingMessage ?? "Working...");
  const rows = loader.render(state.width);
  loader.stop();
  return rows;
}

function renderHeader(state: StartupCaptureState): string[] {
  const content = state.expanded ? expandedHeaderText() : compactHeaderText();
  const notices = state.notices.flatMap(notice => ["", ...new Text(noticeText(notice), 1, 0).render(state.width)]);
  return [
    ...new Spacer(1).render(state.width),
    ...new Text(content, 1, 0).render(state.width),
    ...notices,
    ...new Spacer(1).render(state.width),
  ];
}

function createUpstreamEditor(width: number): CustomEditor {
  const keybindings = new KeybindingsManager({
    ...TUI_KEYBINDINGS,
    "app.interrupt": { defaultKeys: "escape" },
    "app.clear": { defaultKeys: "ctrl+c" },
    "app.exit": { defaultKeys: "ctrl+d" },
    "app.thinking.cycle": { defaultKeys: "shift+tab" },
    "app.model.select": { defaultKeys: "ctrl+l" },
    "app.tools.expand": { defaultKeys: "ctrl+o" },
    "app.clipboard.pasteImage": { defaultKeys: process.platform === "win32" ? "alt+v" : "ctrl+v" },
  } as never);
  return new CustomEditor(createTui(width), {
    borderColor: value => value,
    selectList: getSelectListTheme(),
  }, keybindings as never, { paddingX: 0 });
}

function createUpstreamFooter(state: StartupCaptureState): FooterComponent {
  const model = state.model === null ? null : {
    provider: state.model.providerId,
    id: state.model.modelId,
    reasoning: state.thinkingLevel !== "off",
  };
  const session = {
    state: { model, thinkingLevel: state.thinkingLevel },
    sessionManager: {
      getEntries: () => [],
      getCwd: () => state.cwd,
      getSessionName: () => undefined,
    },
    getContextUsage: () => null,
    modelRuntime: { isUsingSubscription: () => false },
  };
  const footerData = {
    getGitBranch: () => null,
    getAvailableProviderCount: () => 1,
    getExtensionStatuses: () => new Map<string, string>(),
  };
  return new FooterComponent(session as never, footerData as never);
}

function createTui(width: number): TUI {
  const children: Component[] = [];
  return {
    mode: "fullscreen",
    children,
    terminal: {
      start() {}, stop() {}, async drainInput() {}, write() {}, columns: width, rows: 24,
      kittyProtocolActive: false, moveBy() {}, hideCursor() {}, showCursor() {}, clearLine() {},
      clearFromCursor() {}, clearScreen() {}, setTitle() {}, setProgress() {},
    },
    fullRedraws: 0,
    addChild: component => children.push(component),
    removeChild: component => { const index = children.indexOf(component); if (index >= 0) children.splice(index, 1); },
    clear: () => children.splice(0),
    render: value => children.flatMap(component => component.render(value)),
    invalidate: () => children.forEach(component => component.invalidate()),
    getShowHardwareCursor: () => false, setShowHardwareCursor() {}, getClearOnShrink: () => true,
    setClearOnShrink() {}, setFocus() {}, showOverlay: () => ({ hide() {}, setHidden() {}, isHidden: () => false, focus() {}, unfocus() {}, isFocused: () => false }),
    hideOverlay() {}, hasOverlay: () => false, start() {}, stop() {}, renderNow() {}, requestRender() {},
    addInputListener: () => () => {}, removeInputListener() {}, onTerminalColorSchemeChange: () => () => {},
    setTerminalColorSchemeNotifications() {}, queryTerminalBackgroundColor: async () => undefined,
    queryTerminalColorScheme: async () => undefined,
  };
}

function compactHeaderText(): string {
  return `pi v${VERSION}\n${[
    rawKeyHint("escape", "interrupt"), rawKeyHint("ctrl+c/ctrl+d", "clear/exit"),
    rawKeyHint("/", "commands"), rawKeyHint("!", "bash"), rawKeyHint("ctrl+o", "more"),
  ].join(" · ")}\nPress ctrl+o to show full startup help and loaded resources.\n\nPi can explain its own features and look up its docs. Ask it how to use or extend Pi.`;
}

function expandedHeaderText(): string {
  return `pi v${VERSION}\n${[
    rawKeyHint("escape", "to interrupt"), rawKeyHint("ctrl+c", "to clear"), rawKeyHint("ctrl+c twice", "to exit"),
    rawKeyHint("ctrl+d", "to exit (empty)"), rawKeyHint(process.platform === "win32" ? "" : "ctrl+z", "to suspend"),
    rawKeyHint("ctrl+k", "to delete to end"), rawKeyHint("shift+tab", "to cycle thinking level"),
    rawKeyHint("ctrl+p/shift+ctrl+p", "to cycle models"), rawKeyHint("ctrl+l", "to select model"),
    rawKeyHint("ctrl+o", "to expand tools"), rawKeyHint("ctrl+t", "to expand thinking"),
    rawKeyHint("ctrl+g", "for external editor"), rawKeyHint("/", "for commands"), rawKeyHint("!", "to run bash"),
    rawKeyHint("!!", "to run bash (no context)"), rawKeyHint("alt+enter", "to queue follow-up"),
    rawKeyHint("alt+up", "to edit all queued messages"),
    rawKeyHint(process.platform === "win32" ? "alt+v" : "ctrl+v", "to paste image (with text fallback)"),
    rawKeyHint("drop files", "to attach"),
  ].join("\n")}\n\nPi can explain its own features and look up its docs. Ask it how to use or extend Pi.`;
}

function noticeText(notice: StartupCaptureState["notices"][number]): string {
  if (notice.kind === "info") return notice.message;
  return `${notice.kind === "warning" ? "Warning" : "Error"}: ${notice.message}`;
}

export function normalizeRow(row: string): string {
  return stripTerminalSequences(row).replace("\u001b_pi:c\u0007", "");
}
