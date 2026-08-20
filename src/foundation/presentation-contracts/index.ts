export type PresentationRuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export interface PresentationComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  setFocused?(focused: boolean): void;
  dispose?(): void;
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
  write(data: string): void;
  setTitle(title: string): void;
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
  requiredFunctions(terminal, ["start", "stop", "write", "setTitle", "showCursor", "hideCursor"], "presentation terminal");
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
