import {
  HStack,
  ProcessTerminal,
  ScrollView,
  TuiAltScreen,
  TuiMainScreen,
  VStack,
  type Component,
  type Focusable,
  type OverlayHandle,
  type OverlayOptions,
  type TUI,
  type TuiAltScreenOptions,
  visibleWidth,
  wrapTextWithAnsi,
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
    return this.port.render(width).flatMap(line =>
      visibleWidth(line) > width ? wrapTextWithAnsi(line, width) : [line]);
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
  #tui: TUI;
  readonly #root: PiTuiComponentPort;
  readonly #layoutRoot: PiTuiLayoutNode | undefined;
  readonly #tuiOptions: TuiAltScreenOptions;
  readonly #logDirectory: string | undefined;
  readonly #rootBridge: ComponentBridge;
  readonly #bridges = new WeakMap<PiTuiComponentPort, ComponentBridge>();
  readonly #mountedComponents = new Set<PiTuiComponentPort>();
  readonly #scrollViews = new Map<string, ScrollView>();
  readonly #overlayDisposers = new Set<() => void>();
  readonly #inputListeners = new Map<PiTuiInputListener, () => void>();
  #state: PiTuiRuntimeState = "idle";
  #stopPromise: Promise<void> | undefined;
  #rootDisposed = false;

  constructor(options: PiTuiRuntimeAdapterOptions) {
    this.#root = options.root;
    this.#terminal = options.terminal ?? new ProcessTerminal();
    this.#layoutRoot = options.layoutRoot;
    this.#logDirectory = options.logDirectory;
    this.#rootBridge = new ComponentBridge(options.root);
    this.#bridges.set(options.root, this.#rootBridge);
    this.#mountedComponents.add(options.root);

    try {
      const tuiOptions: TuiAltScreenOptions = {};
      if (options.wheelScrollLines !== undefined) tuiOptions.wheelScrollLines = options.wheelScrollLines;
      if (options.mouse !== undefined) tuiOptions.mouse = options.mouse;
      if (options.openUrl !== undefined) tuiOptions.openUrl = options.openUrl;
      if (options.onRightClickPaste !== undefined) tuiOptions.onRightClickPaste = options.onRightClickPaste;
      this.#tuiOptions = tuiOptions;
      this.#tui = this.#createTui(options.mode ?? "regular", options.hardwareCursor ?? false);
      this.#mountTui(this.#tui);
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

  get mode(): "regular" | "fullscreen" {
    return this.#tui.mode;
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
      if (!(this.#tui instanceof TuiAltScreen)) {
        throw new Error("Pi TUI application scrolling is available only in fullscreen mode");
      }
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
    if (id === undefined) this.#requireFullscreen().scrollBy(lines);
    else {
      this.#requireScrollView(id).scrollBy(lines);
      this.#tui.requestRender();
    }
  }

  scrollToTop(id?: string): void {
    this.#assertRunning("scroll");
    if (id === undefined) this.#requireFullscreen().scrollToTop();
    else {
      this.#requireScrollView(id).scrollToStart();
      this.#tui.requestRender();
    }
  }

  scrollToBottom(id?: string): void {
    this.#assertRunning("scroll");
    if (id === undefined) this.#requireFullscreen().scrollToBottom();
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
    if (this.#inputListeners.has(listener)) throw new TypeError("Pi TUI input listener is already registered");
    this.#inputListeners.set(listener, this.#tui.addInputListener(data => listener(data)));
    return () => {
      this.#inputListeners.get(listener)?.();
      this.#inputListeners.delete(listener);
    };
  }

  switchMode(mode: "regular" | "fullscreen"): boolean {
    this.#assertRunning("mode switch");
    if (mode === this.#tui.mode) return true;
    if (this.#tui.hasOverlay()) return false;
    const previous = this.#tui;
    const hardwareCursor = previous.getShowHardwareCursor();
    const clearOnShrink = previous.getClearOnShrink();
    try {
      for (const remove of this.#inputListeners.values()) remove();
      previous.stop({ preserveScreen: true });
      previous.setFocus(null);
      previous.clear();
      if (previous instanceof TuiAltScreen) previous.setLayoutRoot(undefined);
      this.#scrollViews.clear();
      const next = this.#createTui(mode, hardwareCursor);
      next.setClearOnShrink(clearOnShrink);
      this.#mountTui(next);
      this.#tui = next;
      for (const listener of this.#inputListeners.keys()) {
        this.#inputListeners.set(listener, next.addInputListener(data => listener(data)));
      }
      next.setFocus(this.#rootBridge);
      next.start();
      return true;
    } catch (error) {
      this.#state = "failed";
      this.#bestEffortTerminalRestore();
      throw new PiTuiRuntimeError("construction", error);
    }
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

  #createTui(mode: "regular" | "fullscreen", hardwareCursor: boolean): TUI {
    return mode === "fullscreen"
      ? new TuiAltScreen(this.#terminal, hardwareCursor, this.#logDirectory, this.#tuiOptions)
      : new TuiMainScreen(this.#terminal, hardwareCursor, this.#logDirectory);
  }

  #mountTui(tui: TUI): void {
    tui.addChild(this.#rootBridge);
    if (tui instanceof TuiAltScreen && this.#layoutRoot !== undefined) {
      tui.setLayoutRoot(this.#buildLayout(this.#layoutRoot));
    }
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

  #requireFullscreen(): TuiAltScreen {
    if (!(this.#tui instanceof TuiAltScreen)) {
      throw new Error("Pi TUI application scrolling is available only in fullscreen mode");
    }
    return this.#tui;
  }

  #requireScrollView(id: string): ScrollView {
    this.#requireFullscreen();
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
    for (const remove of this.#inputListeners.values()) remove();
    this.#inputListeners.clear();
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
