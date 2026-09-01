import type { PresentationComponentPort } from "../../../contracts/presentation/index.js";

export type PiTuiRuntimeState = "idle" | "running" | "stopping" | "stopped" | "failed";

export interface PiTuiViewport {
  readonly columns: number;
  readonly rows: number;
}

export interface PiTuiScrollState {
  readonly scrollTop: number;
  readonly viewportHeight: number;
  readonly followingEnd: boolean;
  readonly scrollbarVisible: boolean;
}

export interface PiTuiComponentPort extends PresentationComponentPort {
  readonly wantsKeyRelease?: boolean;
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
/** Runs at the terminal bridge before Pi TUI receives physical input. */
export type PiTuiPreInputListener = PiTuiInputListener;

export interface PiTuiLayoutEntry {
  readonly node: PiTuiLayoutNode;
  readonly basis?: number | "auto";
  readonly grow?: number;
  readonly shrink?: number;
  readonly minSize?: number;
  readonly maxSize?: number;
  readonly visible?: (viewport: PiTuiViewport) => boolean;
}

export type PiTuiLayoutNode =
  | { readonly type: "component"; readonly component: PiTuiComponentPort }
  | {
    readonly type: "stack";
    readonly direction: "vertical" | "horizontal";
    readonly children: readonly PiTuiLayoutEntry[];
    readonly gap?: number;
    readonly align?: "stretch" | "start" | "center" | "end";
  }
  | {
    readonly type: "scroll";
    readonly id: string;
    readonly child: PiTuiLayoutNode;
    readonly follow?: "none" | "end";
    readonly primary?: boolean;
    readonly overscroll?: "chain" | "contain";
    readonly scrollbar?: "hidden" | "auto" | "always";
    readonly scrollbarStyle?: (text: string) => string;
    readonly scrollbarHideDelayMs?: number;
  };

export interface PiTuiRuntimeAdapterOptions {
  readonly root: PiTuiComponentPort;
  readonly mode?: "regular" | "fullscreen";
  readonly layoutRoot?: PiTuiLayoutNode;
  readonly terminal?: PiTuiTerminalPort;
  /** A1-owned public-boundary decorator; comparison paths omit it. */
  readonly decorateTerminal?: (terminal: PiTuiTerminalPort) => PiTuiTerminalPort;
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
