import {
  HStack,
  ProcessTerminal,
  ScrollView,
  TuiAltScreen,
  VStack,
  getKeybindings,
  isKeyRelease,
  stripTerminalSequences,
  type Component,
  type Focusable,
  type OverlayHandle,
  type OverlayOptions,
  type TuiAltScreenOptions,
} from "@earendil-works/pi-tui";
import type {
  PiTuiComponentPort,
  PiTuiInputListener,
  PiTuiLayoutNode,
  PiTuiOverlayHandle,
  PiTuiOverlayOptions,
  PiTuiOverlayUnfocusOptions,
  PiTuiRuntimeAdapterOptions,
  PiTuiRuntimeState,
  PiTuiScrollState,
  PiTuiStopOptions,
  PiTuiTerminalPort,
  PiTuiViewport,
} from "./contracts.js";

export type PiTuiRuntimeErrorStage = "construction" | "start" | "input-drain" | "restoration";

export class PiTuiRuntimeError extends Error {
  constructor(readonly stage: PiTuiRuntimeErrorStage, cause: unknown) {
    super(`Pi TUI runtime failed during ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "PiTuiRuntimeError";
  }
}

const OSC52_CLIPBOARD = /\x1b\]52;[^\x07]*\x07/g;
const INVERSE_SPAN = /\x1b\[7m([\s\S]*?)\x1b\[27m/g;
const SGR_MOUSE = /^\x1b\[<(\d+);(\d+);(\d+)([Mm])$/;

class VanillaSelectionTerminal implements PiTuiTerminalPort {
  #selectionPress = false;
  #selectionDragged = false;
  #selectionActive = false;
  #pendingClipboardSequence: string | undefined;

  constructor(private readonly terminal: PiTuiTerminalPort) {}

  get columns(): number { return this.terminal.columns; }
  get rows(): number { return this.terminal.rows; }
  get kittyProtocolActive(): boolean { return this.terminal.kittyProtocolActive; }

  start(onInput: (data: string) => void, onResize: () => void): void {
    this.terminal.start(data => {
      this.#trackSelectionInput(data);
      if (this.#selectionActive && getKeybindings().matches(data, "tui.input.copy")) {
        if (!isKeyRelease(data) && this.#pendingClipboardSequence !== undefined) {
          this.terminal.write(this.#pendingClipboardSequence);
        }
        return;
      }
      onInput(data);
    }, onResize);
  }

  stop(): void {
    this.#selectionPress = false;
    this.#selectionDragged = false;
    this.#selectionActive = false;
    this.#pendingClipboardSequence = undefined;
    this.terminal.stop();
  }

  drainInput(maxMs?: number, idleMs?: number): Promise<void> {
    return this.terminal.drainInput(maxMs, idleMs);
  }

  write(data: string): void {
    const clipboardSequences = data.match(OSC52_CLIPBOARD);
    if (clipboardSequences !== null) {
      this.#pendingClipboardSequence = clipboardSequences.at(-1);
      this.#selectionActive = this.#pendingClipboardSequence !== undefined;
      data = data.replace(OSC52_CLIPBOARD, "");
    }
    if (this.#selectionDragged || this.#selectionActive) {
      data = data.replace(INVERSE_SPAN, (_match, selected: string) =>
        `\x1b[0m\x1b[7m${stripTerminalSequences(selected)}\x1b[27m`);
    }
    if (data.length > 0) this.terminal.write(data);
  }

  moveBy(lines: number): void { this.terminal.moveBy(lines); }
  hideCursor(): void { this.terminal.hideCursor(); }
  showCursor(): void { this.terminal.showCursor(); }
  clearLine(): void { this.terminal.clearLine(); }
  clearFromCursor(): void { this.terminal.clearFromCursor(); }
  clearScreen(): void { this.terminal.clearScreen(); }
  setTitle(title: string): void { this.terminal.setTitle(title); }
  setProgress(active: boolean): void { this.terminal.setProgress(active); }

  #trackSelectionInput(data: string): void {
    const mouse = SGR_MOUSE.exec(data);
    if (mouse === null) return;
    const button = Number.parseInt(mouse[1] ?? "", 10);
    const release = mouse[4] === "m";
    if (!release && (button & 32) === 0 && (button & 3) === 0) {
      this.#selectionPress = true;
      this.#selectionDragged = false;
      this.#selectionActive = false;
      this.#pendingClipboardSequence = undefined;
      return;
    }
    if (!release && this.#selectionPress && (button & 32) !== 0) {
      this.#selectionDragged = true;
      return;
    }
    if (release) this.#selectionPress = false;
  }
}

class VanillaSelectionTuiAltScreen extends TuiAltScreen {
  override flash(message: string, durationMs?: number): void {
    if (message === "Copied!") return;
    super.flash(message, durationMs);
  }
}

class ComponentBridge implements Component, Focusable {
  #focused = false;

  constructor(readonly port: PiTuiComponentPort) {}

  get focused(): boolean {
    return this.#focused;
  }

  set focused(value: boolean) {
    this.#focused = value;
    this.port.setFocused?.(value);
  }

  get wantsKeyRelease(): boolean {
    return this.port.wantsKeyRelease ?? false;
  }

  render(width: number): string[] {
    return [...this.port.render(width)];
  }

  handleInput(data: string): void {
    this.port.handleInput?.(data);
  }

  invalidate(): void {
    this.port.invalidate();
  }
}

class OverlayHandleBridge implements PiTuiOverlayHandle {
  #disposed = false;

  constructor(
    private readonly handle: OverlayHandle,
    private readonly bridgeFor: (component: PiTuiComponentPort | null) => ComponentBridge | null,
    private readonly dispose: () => void,
  ) {}

  hide(): void {
    if (this.#disposed) return;
    this.handle.hide();
    this.#disposed = true;
    this.dispose();
  }

  setHidden(hidden: boolean): void {
    if (!this.#disposed) this.handle.setHidden(hidden);
  }

  isHidden(): boolean {
    return this.#disposed || this.handle.isHidden();
  }

  focus(): void {
    if (!this.#disposed) this.handle.focus();
  }

  unfocus(options?: PiTuiOverlayUnfocusOptions): void {
    if (this.#disposed) return;
    if (options === undefined) {
      this.handle.unfocus();
      return;
    }
    this.handle.unfocus({ target: this.bridgeFor(options.target) });
  }

  isFocused(): boolean {
    return !this.#disposed && this.handle.isFocused();
  }
}

export class PiTuiRuntimeAdapter {
  readonly #terminal: PiTuiTerminalPort;
  readonly #tui: TuiAltScreen;
  readonly #root: PiTuiComponentPort;
  readonly #rootBridge: ComponentBridge;
  readonly #bridges = new WeakMap<PiTuiComponentPort, ComponentBridge>();
  readonly #mountedComponents = new Set<PiTuiComponentPort>();
  readonly #scrollViews = new Map<string, ScrollView>();
  readonly #overlayDisposers = new Set<() => void>();
  #state: PiTuiRuntimeState = "idle";
  #stopPromise: Promise<void> | undefined;
  #rootDisposed = false;

  constructor(options: PiTuiRuntimeAdapterOptions) {
    this.#root = options.root;
    this.#terminal = options.terminal ?? new ProcessTerminal();
    this.#rootBridge = new ComponentBridge(options.root);
    this.#bridges.set(options.root, this.#rootBridge);
    this.#mountedComponents.add(options.root);

    try {
      const tuiOptions: TuiAltScreenOptions = { wheelScrollLines: options.wheelScrollLines ?? 3 };
      if (options.mouse !== undefined) tuiOptions.mouse = options.mouse;
      if (options.openUrl !== undefined) tuiOptions.openUrl = options.openUrl;
      if (options.onRightClickPaste !== undefined) tuiOptions.onRightClickPaste = options.onRightClickPaste;
      this.#tui = new VanillaSelectionTuiAltScreen(
        new VanillaSelectionTerminal(this.#terminal),
        options.hardwareCursor ?? false,
        options.logDirectory,
        tuiOptions,
      );
      if (options.layoutRoot === undefined) {
        this.#tui.addChild(this.#rootBridge);
      } else {
        this.#tui.setLayoutRoot(this.#buildLayout(options.layoutRoot));
      }
    } catch (error) {
      this.#state = "failed";
      throw new PiTuiRuntimeError("construction", error);
    }
  }

  get state(): PiTuiRuntimeState {
    return this.#state;
  }

  get active(): boolean {
    return this.#state === "running";
  }

  get mode(): "fullscreen" {
    return "fullscreen";
  }

  get fullRedraws(): number {
    return this.#tui.fullRedraws;
  }

  viewport(): PiTuiViewport {
    return {
      columns: Math.max(1, this.#terminal.columns),
      rows: Math.max(1, this.#terminal.rows),
    };
  }

  scrollState(id?: string): PiTuiScrollState {
    if (id === undefined) {
      return {
        scrollTop: this.#tui.viewportTop,
        viewportHeight: this.viewport().rows,
        followingEnd: this.#tui.isFollowingOutput,
        scrollbarVisible: false,
      };
    }
    const scrollView = this.#requireScrollView(id);
    return {
      scrollTop: scrollView.scrollTop,
      viewportHeight: scrollView.viewportHeight,
      followingEnd: scrollView.isFollowingEnd,
      scrollbarVisible: scrollView.isScrollbarVisible,
    };
  }

  scrollBy(lines: number, id?: string): void {
    this.#assertRunning("scroll");
    if (id === undefined) this.#tui.scrollBy(lines);
    else {
      this.#requireScrollView(id).scrollBy(lines);
      this.#tui.requestRender();
    }
  }

  scrollToTop(id?: string): void {
    this.#assertRunning("scroll");
    if (id === undefined) this.#tui.scrollToTop();
    else {
      this.#requireScrollView(id).scrollToStart();
      this.#tui.requestRender();
    }
  }

  scrollToBottom(id?: string): void {
    this.#assertRunning("scroll");
    if (id === undefined) this.#tui.scrollToBottom();
    else {
      this.#requireScrollView(id).scrollToEnd();
      this.#tui.requestRender();
    }
  }

  start(): void {
    if (this.#state === "running") return;
    if (this.#state !== "idle") throw new PiTuiRuntimeError("start", new Error(`runtime cannot start from ${this.#state}`));
    try {
      this.#tui.setFocus(this.#rootBridge);
      this.#tui.start();
      this.#state = "running";
    } catch (error) {
      this.#state = "failed";
      this.#restoreAfterFailedStart();
      this.#disposeRoot();
      throw new PiTuiRuntimeError("start", error);
    }
  }

  setFocus(component: PiTuiComponentPort | null): void {
    this.#assertRunning("focus");
    this.#tui.setFocus(this.#bridgeFor(component));
  }

  showOverlay(component: PiTuiComponentPort, options?: PiTuiOverlayOptions): PiTuiOverlayHandle {
    this.#assertRunning("overlay");
    if (this.#bridges.has(component)) throw new TypeError("Pi TUI component is already mounted");
    const bridge = new ComponentBridge(component);
    this.#bridges.set(component, bridge);
    let hidden = false;
    const dispose = () => {
      if (hidden) return;
      hidden = true;
      this.#overlayDisposers.delete(dispose);
      this.#bridges.delete(component);
      component.dispose?.();
    };
    this.#overlayDisposers.add(dispose);
    const handle = this.#tui.showOverlay(bridge, toOverlayOptions(options));
    return new OverlayHandleBridge(handle, target => this.#bridgeFor(target), dispose);
  }

  hasOverlay(): boolean {
    return this.#tui.hasOverlay();
  }

  addInputListener(listener: PiTuiInputListener): () => void {
    this.#assertRunning("input listener");
    return this.#tui.addInputListener(data => listener(data));
  }

  setHardwareCursor(enabled: boolean): void {
    this.#tui.setShowHardwareCursor(enabled);
    if (this.active) this.#tui.requestRender();
  }

  getHardwareCursor(): boolean {
    return this.#tui.getShowHardwareCursor();
  }

  setTitle(title: string): void {
    this.#terminal.setTitle(title);
  }

  invalidate(): void {
    this.#tui.invalidate();
    if (this.active) this.#tui.requestRender();
  }

  requestRender(force = false): void {
    if (this.active) this.#tui.requestRender(force);
  }

  renderNow(force = false): void {
    this.#assertRunning("render");
    this.#tui.renderNow(force);
  }

  stop(options: PiTuiStopOptions = {}): Promise<void> {
    if (this.#stopPromise) return this.#stopPromise;
    if (this.#state === "idle") {
      this.#state = "stopped";
      this.#disposeRoot();
      return Promise.resolve();
    }
    if (this.#state === "stopped") return Promise.resolve();
    this.#stopPromise = this.#stop(options);
    return this.#stopPromise;
  }

  async dispose(options: PiTuiStopOptions = {}): Promise<void> {
    await this.stop(options);
  }

  async #stop(options: PiTuiStopOptions): Promise<void> {
    this.#state = "stopping";
    let failure: PiTuiRuntimeError | undefined;
    if (options.drainInput !== false) {
      try {
        await this.#terminal.drainInput(options.drainMaxMs, options.drainIdleMs);
      } catch (error) {
        failure = new PiTuiRuntimeError("input-drain", error);
      }
    }

    try {
      const stopOptions = options.preserveScreen === undefined ? undefined : { preserveScreen: options.preserveScreen };
      this.#tui.stop(stopOptions);
    } catch (error) {
      failure ??= new PiTuiRuntimeError("restoration", error);
      this.#bestEffortTerminalRestore();
    } finally {
      this.#disposeComponents();
    }

    this.#state = failure === undefined ? "stopped" : "failed";
    if (failure) throw failure;
  }

  #bridgeFor(component: PiTuiComponentPort | null): ComponentBridge | null {
    if (component === null) return null;
    const bridge = this.#bridges.get(component);
    if (!bridge) throw new TypeError("Pi TUI focus target is not mounted");
    return bridge;
  }

  #mount(component: PiTuiComponentPort): ComponentBridge {
    const existing = this.#bridges.get(component);
    if (existing) return existing;
    const bridge = new ComponentBridge(component);
    this.#bridges.set(component, bridge);
    this.#mountedComponents.add(component);
    return bridge;
  }

  #buildLayout(node: PiTuiLayoutNode): Component {
    if (node.type === "component") return this.#mount(node.component);
    if (node.type === "scroll") {
      if (this.#scrollViews.has(node.id)) throw new TypeError(`duplicate Pi TUI scroll layout id: ${node.id}`);
      const options = {
        ...(node.follow === undefined ? {} : { follow: node.follow }),
        ...(node.primary === undefined ? {} : { primary: node.primary }),
        ...(node.overscroll === undefined ? {} : { overscroll: node.overscroll }),
        ...(node.scrollbar === undefined ? {} : { scrollbar: node.scrollbar }),
        ...(node.scrollbarStyle === undefined ? {} : { scrollbarStyle: node.scrollbarStyle }),
        ...(node.scrollbarHideDelayMs === undefined ? {} : { scrollbarHideDelayMs: node.scrollbarHideDelayMs }),
      };
      const scrollView = new ScrollView(this.#buildLayout(node.child), options);
      this.#scrollViews.set(node.id, scrollView);
      return scrollView;
    }
    const children = node.children.map(entry => ({
      component: this.#buildLayout(entry.node),
      ...(entry.basis === undefined ? {} : { basis: entry.basis }),
      ...(entry.grow === undefined ? {} : { grow: entry.grow }),
      ...(entry.shrink === undefined ? {} : { shrink: entry.shrink }),
      ...(entry.minSize === undefined ? {} : { minSize: entry.minSize }),
      ...(entry.maxSize === undefined ? {} : { maxSize: entry.maxSize }),
      ...(entry.visible === undefined ? {} : { visible: (viewport: { width: number; height: number }) => entry.visible?.({ columns: viewport.width, rows: viewport.height }) ?? true }),
    }));
    const options = {
      ...(node.gap === undefined ? {} : { gap: node.gap }),
      ...(node.align === undefined ? {} : { align: node.align }),
    };
    return node.direction === "vertical" ? new VStack(children, options) : new HStack(children, options);
  }

  #requireScrollView(id: string): ScrollView {
    const scrollView = this.#scrollViews.get(id);
    if (!scrollView) throw new TypeError(`unknown Pi TUI scroll layout id: ${id}`);
    return scrollView;
  }

  #assertRunning(operation: string): void {
    if (!this.active) throw new Error(`Pi TUI ${operation} requires a running runtime`);
  }

  #restoreAfterFailedStart(): void {
    try {
      this.#tui.stop();
    } catch {
      this.#bestEffortTerminalRestore();
    }
  }

  #bestEffortTerminalRestore(): void {
    try {
      this.#terminal.showCursor();
    } catch {}
    try {
      this.#terminal.stop();
    } catch {}
  }

  #disposeRoot(): void {
    if (this.#rootDisposed) return;
    this.#rootDisposed = true;
    for (const component of this.#mountedComponents) component.dispose?.();
    this.#mountedComponents.clear();
  }

  #disposeComponents(): void {
    for (const dispose of [...this.#overlayDisposers]) dispose();
    this.#disposeRoot();
  }
}

function toOverlayOptions(options: PiTuiOverlayOptions | undefined): OverlayOptions | undefined {
  if (options === undefined) return undefined;
  const mapped: OverlayOptions = {};
  if (options.width !== undefined) mapped.width = options.width;
  if (options.minWidth !== undefined) mapped.minWidth = options.minWidth;
  if (options.maxHeight !== undefined) mapped.maxHeight = options.maxHeight;
  if (options.anchor !== undefined) mapped.anchor = options.anchor;
  if (options.offsetX !== undefined) mapped.offsetX = options.offsetX;
  if (options.offsetY !== undefined) mapped.offsetY = options.offsetY;
  if (options.row !== undefined) mapped.row = options.row;
  if (options.col !== undefined) mapped.col = options.col;
  if (options.margin !== undefined) mapped.margin = options.margin;
  if (options.visible !== undefined) mapped.visible = options.visible;
  if (options.nonCapturing !== undefined) mapped.nonCapturing = options.nonCapturing;
  return mapped;
}
