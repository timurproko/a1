export const PI_TUI_PACKAGE_VERSION = "0.84.1" as const;

export type PiTuiRuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export interface PiTuiViewport {
  readonly columns: number;
  readonly rows: number;
}

export interface PiTuiComponentPort {
  render(width: number): readonly string[];
  invalidate(): void;
  handleInput?(data: string): void;
  readonly wantsKeyRelease?: boolean;
  setFocused?(focused: boolean): void;
  dispose?(): void;
}

export interface PiTuiTerminalPort {
  start(onInput: (data: string) => void, onResize: () => void): void;
  stop(): void;
  drainInput(maxMs?: number, idleMs?: number): Promise<void>;
  write(data: string): void;
  readonly columns: number;
  readonly rows: number;
  readonly kittyProtocolActive: boolean;
  moveBy(lines: number): void;
  hideCursor(): void;
  showCursor(): void;
  clearLine(): void;
  clearFromCursor(): void;
  clearScreen(): void;
  setTitle(title: string): void;
  setProgress(active: boolean): void;
}

export type PiTuiSizeValue = number | `${number}%`;
export type PiTuiOverlayAnchor =
  | "center"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "top-center"
  | "bottom-center"
  | "left-center"
  | "right-center";

export interface PiTuiOverlayMargin {
  readonly top?: number;
  readonly right?: number;
  readonly bottom?: number;
  readonly left?: number;
}

export interface PiTuiOverlayOptions {
  readonly width?: PiTuiSizeValue;
  readonly minWidth?: number;
  readonly maxHeight?: PiTuiSizeValue;
  readonly anchor?: PiTuiOverlayAnchor;
  readonly offsetX?: number;
  readonly offsetY?: number;
  readonly row?: PiTuiSizeValue;
  readonly col?: PiTuiSizeValue;
  readonly margin?: PiTuiOverlayMargin | number;
  readonly visible?: (columns: number, rows: number) => boolean;
  readonly nonCapturing?: boolean;
}

export interface PiTuiOverlayUnfocusOptions {
  readonly target: PiTuiComponentPort | null;
}

export interface PiTuiOverlayHandle {
  hide(): void;
  setHidden(hidden: boolean): void;
  isHidden(): boolean;
  focus(): void;
  unfocus(options?: PiTuiOverlayUnfocusOptions): void;
  isFocused(): boolean;
}

export interface PiTuiInputListenerResult {
  readonly consume?: boolean;
  readonly data?: string;
}

export type PiTuiInputListener = (data: string) => PiTuiInputListenerResult | undefined;

export interface PiTuiRuntimeAdapterOptions {
  readonly root: PiTuiComponentPort;
  readonly terminal?: PiTuiTerminalPort;
  readonly hardwareCursor?: boolean;
  readonly mouse?: boolean;
  readonly wheelScrollLines?: number;
  readonly openUrl?: (url: string) => void;
  readonly onRightClickPaste?: () => void;
  readonly logDirectory?: string;
}

export interface PiTuiStopOptions {
  readonly preserveScreen?: boolean;
  readonly drainInput?: boolean;
  readonly drainMaxMs?: number;
  readonly drainIdleMs?: number;
}
