export type PresentationRuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export interface SemanticShortcutHint {
  readonly key?: string;
  readonly action: string;
  readonly actionFirst?: boolean;
}

export interface ShortcutHintRoles {
  key(label: string): string;
  action(name: string): string;
}

const SHORTCUT_KEY_NAMES: Readonly<Record<string, string>> = Object.freeze({
  alt: "Alt", backspace: "Backspace", cmd: "Cmd", ctrl: "Ctrl", delete: "Delete", down: "Down", end: "End",
  enter: "Enter", esc: "Esc", escape: "Escape", home: "Home", insert: "Insert", left: "Left", meta: "Meta",
  option: "Option", pagedown: "PageDown", pageup: "PageUp", pgdn: "PgDn", pgup: "PgUp", return: "Return",
  right: "Right", shift: "Shift", space: "Space", tab: "Tab", up: "Up",
});

/** Applies the common display casing to each named key and letter in a shortcut label. */
export function displayShortcutKeyLabel(label: string): string {
  if (label === "/") return label;
  return label.split("/").map(chord => chord.split("+").map(part => {
    const named = SHORTCUT_KEY_NAMES[part.toLowerCase()];
    if (named !== undefined) return named;
    return /^\p{L}$/u.test(part) ? part.toUpperCase() : part;
  }).join("+")).join("/");
}

/** Renders the canonical semantic shortcut row independently of either presentation framework. */
export function renderSemanticShortcutHints(
  entries: readonly SemanticShortcutHint[],
  roles: ShortcutHintRoles,
  indent = 0,
): string {
  const rendered = entries.flatMap(entry => {
    if (entry.key === "" || (entry.key !== undefined && entry.key.trim().length === 0)) return [];
    if (entry.key === undefined) return entry.action.length === 0 ? [] : [roles.action(entry.action)];
    const key = roles.key(displayShortcutKeyLabel(entry.key));
    const action = roles.action(entry.action);
    return [entry.actionFirst ? `${action} ${key}` : `${key} ${action}`];
  });
  return `${" ".repeat(Math.max(0, indent))}${rendered.join("  ")}`;
}

export interface PresentationComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

/** A painted input surface in terminal coordinates (one-based, inclusive bounds). */
export interface PresentationPointerSurface {
  readonly component: PresentationComponentPort;
  readonly columnStart: number;
  readonly columnEnd: number;
  readonly rowStart: number;
  readonly rowEnd: number;
}

export interface PresentationEditorPort extends PresentationComponentPort {
  getText(): string;
  setText(text: string): void;
  submit(): Promise<void> | void;
}

export interface PresentationSelectorItem { readonly id: string; readonly label: string; readonly detail?: string }
export interface PresentationSelectorPort extends PresentationComponentPort {
  setItems(items: readonly PresentationSelectorItem[]): void;
  readonly selectedId: string | null;
}

export interface PresentationDialogPort extends PresentationComponentPort {
  readonly dialogId: string;
  close(outcome: "accepted" | "cancelled"): void;
}

export interface PresentationExtensionUiPort {
  mount(slot: PresentationContributionSlot, component: PresentationComponentPort): () => void;
}

export type PresentationContributionSlot = "transcript" | "tool" | "editor" | "status" | "dialog" | "overlay";
export type PresentationFocusTarget = "transcript" | "editor" | "dialog" | "overlay" | "status";

export interface PresentationFocusPort {
  readonly focused: PresentationFocusTarget;
  focus(target: PresentationFocusTarget): void;
}

export interface PresentationTerminalPort {
  readonly columns: number;
  readonly rows: number;
  readonly enhancedKeyboard: boolean;
  start(onInput: (data: string) => void, onResize: () => void): void;
  stop(): void;
  drainInput(maxMs?: number, idleMs?: number): Promise<void>;
  write(data: string): void;
  moveBy(lines: number): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
  setTitle(title: string): void;
  setProgress(active: boolean): void;
  showCursor(): void;
  hideCursor(): void;
}

export type PresentationLayoutNode =
  | { readonly type: "component"; readonly component: PresentationComponentPort }
  | { readonly type: "stack"; readonly direction: "vertical" | "horizontal"; readonly children: readonly PresentationLayoutNode[]; readonly gap?: number }
  | { readonly type: "scroll"; readonly id: string; readonly child: PresentationLayoutNode; readonly follow: "none" | "end" };

export interface PresentationOverlayOptions {
  readonly anchor: "center" | "top" | "bottom";
  readonly width?: number | `${number}%`;
  readonly modal: boolean;
}

export interface PresentationOverlayHandle {
  readonly visible: boolean;
  hide(): void;
  show(): void;
  focus(): void;
  dispose(): void;
}

export interface OwnedUiApplicationPort {
  readonly disposed: boolean;
  start(): void;
  flush(): Promise<void>;
  waitUntilStopped(): Promise<void>;
  dispose(): Promise<void>;
}

export interface PresentationRuntimePort {
  readonly state: PresentationRuntimeState;
  readonly terminal: PresentationTerminalPort;
  start(): void;
  render(force?: boolean): void;
  showOverlay(component: PresentationComponentPort, options: PresentationOverlayOptions): PresentationOverlayHandle;
  stop(): Promise<void>;
}

export function assertPresentationComponent(component: PresentationComponentPort): void {
  requiredFunctions(component, ["render", "invalidate"], "presentation component");
  const lines = component.render(80);
  if (!Array.isArray(lines) || lines.some(line => typeof line !== "string" || line.includes("\n") || line.includes("\r"))) {
    throw new TypeError("presentation component render must return newline-free string rows");
  }
}

export function assertPresentationRuntime(runtime: PresentationRuntimePort): void {
  requiredFunctions(runtime, ["start", "render", "showOverlay", "stop"], "presentation runtime");
  if (!new Set(["idle", "running", "stopping", "stopped", "failed"]).has(runtime.state)) throw new TypeError("presentation runtime state is invalid");
  const terminal = runtime.terminal;
  requiredFunctions(terminal, ["start", "stop", "drainInput", "write", "moveBy", "clearLine", "clearFromCursor", "clearScreen", "setTitle", "setProgress", "showCursor", "hideCursor"], "presentation terminal");
  if (!Number.isSafeInteger(terminal.columns) || terminal.columns < 1 || !Number.isSafeInteger(terminal.rows) || terminal.rows < 1) throw new TypeError("presentation terminal geometry is invalid");
}

export async function probePresentationLifecycle(runtime: PresentationRuntimePort): Promise<void> {
  assertPresentationRuntime(runtime);
  if (runtime.state !== "idle") throw new TypeError("presentation runtime must begin idle");
  runtime.start();
  if ((runtime.state as PresentationRuntimeState) !== "running") throw new TypeError("presentation runtime did not enter running state");
  runtime.render(true);
  await runtime.stop();
  if ((runtime.state as PresentationRuntimeState) !== "stopped") throw new TypeError("presentation runtime did not enter stopped state");
  await runtime.stop();
  if ((runtime.state as PresentationRuntimeState) !== "stopped") throw new TypeError("presentation runtime stop is not idempotent");
}

function requiredFunctions(value: object | undefined, names: readonly string[], label: string): void {
  if (!value) throw new TypeError(`${label} is required`);
  for (const name of names) if (typeof (value as Record<string, unknown>)[name] !== "function") throw new TypeError(`${label} requires ${name}`);
}
