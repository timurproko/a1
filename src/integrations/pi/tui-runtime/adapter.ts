import {
  HStack,
  ProcessTerminal,
  ScrollView,
  TuiAltScreen,
  TuiMainScreen,
  VStack,
  decodeKittyPrintable,
  isKeyRelease,
  parseKey,
  type Component,
  type Focusable,
  type OverlayHandle,
  type OverlayOptions,
  type ProgramStatus,
  type TUI,
  type TuiAltScreenOptions,
  type WheelScrollLines,
  visibleWidth,
} from "@earendil-works/pi-tui";
import { MouseReportInput, stripSgrMouseReports } from "./mouse-report-input.js";
import { GeometryObservedAltScreen, OverlayGeometryTracker } from "./overlay-geometry.js";
import { boundedCleanup, EMERGENCY_TERMINAL_RESET } from "../../../foundation/terminal-cleanup/terminal-reset.js";
import {
  InputPresentationCoordinator,
} from "./input-presentation-coordinator.js";
import type {
  TerminalComponentPort,
  TerminalInputListener,
  TerminalLayoutNode,
  TerminalOverlayHandle,
  TerminalOverlayOptions,
  TerminalOverlayUnfocusOptions,
  TerminalPreInputListener,
  TerminalRuntimeOptions,
  TerminalRuntimeState,
  TerminalStopOptions,
  TerminalPort,
  TerminalViewport,
} from "../../../contracts/presentation/index.js";


// Protocol: the legacy bytes owned screens and their key tables compare against.
const LEGACY_KEY_BYTES: Readonly<Record<string, string>> = {
  escape: "\u001b", up: "\u001b[A", down: "\u001b[B", right: "\u001b[C", left: "\u001b[D",
  "shift+up": "\u001b[1;2A", "shift+down": "\u001b[1;2B", pageUp: "\u001b[5~", pageDown: "\u001b[6~",
  "ctrl+shift+up": "\u001b[1;6A", "ctrl+shift+down": "\u001b[1;6B",
  home: "\u001b[H", end: "\u001b[F", "ctrl+home": "\u001b[1;5H", "ctrl+end": "\u001b[1;5F",
  enter: "\r", tab: "\t", "shift+tab": "\u001b[Z", backspace: "\u007f", delete: "\u001b[3~",
  space: " ", "ctrl+c": "\u0003", "ctrl+z": "\u001a",
};

/**
 * Re-encodes one key report decoded by pi-tui in the legacy form, so a kitty-keyboard terminal
 * and a legacy terminal produce the same owned-screen action. Releases decode
 * to nothing; mouse reports, paste, and unknown sequences pass through unchanged.
 */
export function legacyKeyInput(data: string): string {
  if (data.length <= 1 || !data.startsWith("\u001b")) return data;
  const key = parseKey(data);
  if (key === undefined) return data;
  if (isKeyRelease(data)) return "";
  const legacy = LEGACY_KEY_BYTES[key];
  if (legacy !== undefined) return legacy;
  const printable = decodeKittyPrintable(data);
  return printable !== undefined && printable >= " " && printable !== "\u007f" ? printable : data;
}

export type PiTuiRuntimeErrorStage = "construction" | "start" | "input-drain" | "restoration";

/** Identifies the Pi TUI lifecycle stage that failed while preserving the original cause. */
export class PiTuiRuntimeError extends Error {
  readonly stage: PiTuiRuntimeErrorStage;
  constructor(stage: PiTuiRuntimeErrorStage, cause: unknown) {
    super(`Pi TUI runtime failed during ${stage}: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.stage = stage;
    this.name = "PiTuiRuntimeError";
  }
}

class ComponentBridge implements Component, Focusable {
  #focused = false;

  readonly port: TerminalComponentPort;
  readonly traceComposition: ((phase: "composition-start" | "composition-end") => void) | undefined;
  constructor(
    port: TerminalComponentPort,
    traceComposition?: (phase: "composition-start" | "composition-end") => void,
  ) { this.port = port; this.traceComposition = traceComposition; }

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
    this.traceComposition?.("composition-start");
    try {
      const lines = [...this.port.render(width)];
      // Protocol: Kitty APC carries pixels, not columns. Still validate every ordinary cell
      // around the payload instead of exempting the entire image-bearing row from width checks.
      const overflow = lines.findIndex(line => visibleWidth(line.replace(/\u001b_G[^\u001b]*\u001b\\/g, "")) > width);
      if (overflow >= 0) {
        throw new RangeError(`Pi TUI component row ${overflow} exceeds available width ${width}`);
      }
      return lines;
    } finally {
      this.traceComposition?.("composition-end");
    }
  }

  handleInput(data: string): void {
    this.port.handleInput?.(data);
  }

  invalidate(): void {
    this.port.invalidate();
  }
}

class OverlayHandleBridge implements TerminalOverlayHandle {
  #disposed = false;

  private readonly handle: OverlayHandle;
  private readonly bridgeFor: (component: TerminalComponentPort | null) => ComponentBridge | null;
  private readonly dispose: () => void;
  constructor(
    handle: OverlayHandle,
    bridgeFor: (component: TerminalComponentPort | null) => ComponentBridge | null,
    dispose: () => void,
  ) { this.handle = handle; this.bridgeFor = bridgeFor; this.dispose = dispose; }

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

  getBounds(): TerminalOverlayHandle["getBounds"] extends () => infer R ? R : never {
    return this.#disposed ? undefined : this.handle.getBounds();
  }

  focus(): void {
    if (!this.#disposed) this.handle.focus();
  }

  unfocus(options?: TerminalOverlayUnfocusOptions): void {
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

/** Bridges neutral presentation ports to one Pi TUI instance and owns terminal restoration on stop. */
export class PiTuiRuntimeAdapter {
  readonly #terminal: TerminalPort;
  readonly #tuiTerminal: PiTuiTerminal;
  #tui: TUI;
  readonly #layoutRoot: TerminalLayoutNode | undefined;
  readonly #tuiOptions: TuiAltScreenOptions;
  readonly #logDirectory: string | undefined;
  readonly #rootBridge: ComponentBridge;
  readonly #bridges = new WeakMap<TerminalComponentPort, ComponentBridge>();
  readonly #mountedComponents = new Set<TerminalComponentPort>();
  readonly #scrollIds = new Set<string>();
  readonly #overlayGeometry: OverlayGeometryTracker | undefined;
  readonly #overlayDisposers = new Set<() => void>();
  readonly #overlayInputCoordination = new Map<ComponentBridge, "owned" | "opaque">();
  readonly #inputListeners = new Map<TerminalInputListener, () => void>();
  readonly #preInputListeners = new Set<TerminalPreInputListener>();
  readonly #consumeUnhandledMouse: boolean;
  readonly #inputCoordinator: InputPresentationCoordinator | undefined;
  #inputSink: ((data: string) => void) | undefined;
  #state: TerminalRuntimeState = "idle";
  #stopPromise: Promise<void> | undefined;
  #rootDisposed = false;
  #terminalProgress = false;
  #presentationFrozen = false;
  readonly #presentationHolds = new Set<symbol>();

  constructor(options: TerminalRuntimeOptions) {
    this.#overlayGeometry = options.onOverlayGeometry === undefined ? undefined : new OverlayGeometryTracker(options.onOverlayGeometry, options.paintModalBackdrop);
    this.#terminal = options.terminal ?? new ProcessTerminal();
    this.#consumeUnhandledMouse = options.consumeUnhandledMouse ?? false;
    const diagnostics = options.inputDiagnostics;
    const diagnosticNow = diagnostics?.now ?? (() => performance.now());
    const tracePhase = diagnostics === undefined ? undefined : runtimePhaseTracer(diagnostics, diagnosticNow, () => this.#inputCoordinator);
    // Invariant: the pinned renderer's frames pass through this gate, while writeControl and
    // the stop sequence reach the terminal directly. Freezing drops frames without touching
    // the renderer, so a scheduled repaint cannot land on top of the quit outro.
    const gatedTerminal = frozenGateTerminal(this.#terminal, () => this.#presentationFrozen || this.#presentationHolds.size > 0);
    const tracedTerminal = tracePhase === undefined ? gatedTerminal : diagnosticTerminal(gatedTerminal, tracePhase);
    const decoratedTerminal = options.decorateTerminal?.(tracedTerminal) ?? tracedTerminal;
    const coordination = options.inputCoordination ?? (options.inputDiagnostics === undefined
      ? undefined
      : { classify: () => "barrier" as const });
    this.#inputCoordinator = coordination === undefined
      ? undefined
      : new InputPresentationCoordinator({
          classify: data => coordination.classify(data, this.#focusedOverlayInputCoordination()),
          deliver: data => {
            const routed = this.#routePreInput(data);
            if (routed.length > 0) this.#inputSink?.(routed);
          },
          ...(coordination.onReceipt === undefined ? {} : { onReceipt: coordination.onReceipt }),
          ...(coordination.scheduler === undefined ? {} : { scheduler: coordination.scheduler }),
          now: diagnosticNow,
          ...(diagnostics === undefined ? {} : { onTrace: event => diagnostics.onEvent(event) }),
        });
    this.#tuiTerminal = this.#inputCoordinator === undefined
      ? preInputTerminal(decoratedTerminal, data => this.#routePreInput(data), this.#overlayGeometry !== undefined)
      : coordinatedInputTerminal(
          decoratedTerminal,
          this.#inputCoordinator,
          sink => { this.#inputSink = sink; },
          this.#overlayGeometry !== undefined,
        );
    // Invariant: Pi TUI's exit-time restore reaches the undecorated terminal directly. Decorators only shape
    // presentation, and the frozen gate must not swallow the last-resort mode reset when the process exits.
    const exitTerminal = this.#terminal;
    this.#tuiTerminal.restoreOnExit = (before, after) => exitTerminal.restoreOnExit?.(before, after);
    this.#layoutRoot = options.layoutRoot;
    this.#logDirectory = options.logDirectory;
    this.#rootBridge = new ComponentBridge(options.root, tracePhase);
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

  get state(): TerminalRuntimeState {
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

  viewport(): TerminalViewport {
    return {
      columns: Math.max(1, this.#terminal.columns),
      rows: Math.max(1, this.#terminal.rows),
    };
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

  showOverlay(component: TerminalComponentPort, options?: TerminalOverlayOptions): TerminalOverlayHandle {
    this.#assertRunning("overlay");
    if (this.#bridges.has(component)) throw new TypeError("Pi TUI component is already mounted");
    const bridge = new ComponentBridge(component);
    this.#bridges.set(component, bridge);
    this.#overlayGeometry?.ports.set(bridge, component);
    if (options?.modal) this.#overlayGeometry?.modals.add(component);
    let hidden = false;
    const dispose = () => {
      if (hidden) return;
      hidden = true;
      this.#overlayDisposers.delete(dispose);
      this.#overlayInputCoordination.delete(bridge);
      this.#bridges.delete(component);
      component.dispose?.();
    };
    this.#overlayDisposers.add(dispose);
    this.#overlayInputCoordination.set(bridge, options?.inputCoordination ?? "opaque");
    const handle = this.#tui.showOverlay(bridge, toOverlayOptions(options));
    return new OverlayHandleBridge(handle, target => this.#bridgeFor(target), dispose);
  }

  hasOverlay(): boolean {
    return this.#tui.hasOverlay();
  }

  /** Keyboard capture is independent of a passive overlay's visible pointer region. */
  hasFocusedOverlay(): boolean {
    return this.#tui instanceof GeometryObservedAltScreen ? this.#tui.overlayFocused : this.#focusedOverlayInputCoordination() !== undefined;
  }

  /**
   * Writes a terminal control sequence. Used to enable and disable mouse
   * reporting while an A1-owned application is presented and to paint the quit
   * outro while presentation is frozen, and for nothing else: the transparent
   * and pinned paths never call it.
   */
  writeControl(data: string): void {
    this.#assertRunning("control sequence");
    this.#terminal.write(data);
  }

  /**
   * Drops every pinned frame write until the runtime stops. The quit outro owns
   * the alternate screen between the last presented frame and the leave; the
   * renderer keeps scheduling but nothing it paints reaches the terminal.
   */
  freezePresentation(): void {
    this.#assertRunning("presentation freeze");
    this.#presentationFrozen = true;
  }

  /**
   * Keeps asynchronous replacement-surface construction atomic at the terminal. Renderers may
   * compose while held, but their writes are dropped until the final forced repaint on release.
   */
  beginPresentationHold(): () => void {
    this.#assertRunning("presentation hold");
    const token = Symbol("presentation-hold");
    this.#presentationHolds.add(token);
    return () => {
      if (!this.#presentationHolds.delete(token) || this.#presentationHolds.size > 0) return;
      if (this.active && !this.#presentationFrozen) this.#tui.requestRender(true);
    };
  }

  get presentationHeld(): boolean {
    return this.#presentationHolds.size > 0;
  }

  addPreInputListener(listener: TerminalPreInputListener): () => void {
    if (this.#preInputListeners.has(listener)) throw new TypeError("Pi TUI pre-input listener is already registered");
    this.#preInputListeners.add(listener);
    return () => this.#preInputListeners.delete(listener);
  }

  addInputListener(listener: TerminalInputListener): () => void {
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
      this.#scrollIds.clear();
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

  setClearOnShrink(enabled: boolean): void {
    this.#tui.setClearOnShrink(enabled);
  }

  setWheelScrollLines(lines: WheelScrollLines): void {
    this.#tuiOptions.wheelScrollLines = lines;
    if (this.#tui instanceof TuiAltScreen) this.#tui.setWheelScrollLines(lines);
  }

  setTerminalProgress(active: boolean): void {
    if (this.#terminalProgress === active) return;
    this.#terminal.setProgress(active);
    this.#terminalProgress = active;
  }

  setProgramStatus(status: ProgramStatus): void {
    this.#terminal.setProgramStatus?.(status);
  }

  setTitle(title: string): void {
    this.#terminal.setTitle(title);
  }

  writeAfterStop(text: string): void {
    if (this.#state !== "stopped") throw new Error("terminal output requires a stopped Pi TUI runtime");
    this.#terminal.write(text);
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

  stop(options: TerminalStopOptions = {}): Promise<void> {
    if (this.#stopPromise) return this.#stopPromise;
    if (this.#state === "idle") {
      this.#state = "stopped";
      this.#presentationHolds.clear();
      this.#clearTerminalProgress();
      this.#preInputListeners.clear();
      this.#disposeRoot();
      return Promise.resolve();
    }
    if (this.#state === "stopped") return Promise.resolve();
    this.#stopPromise = this.#stop(options);
    return this.#stopPromise;
  }

  async dispose(options: TerminalStopOptions = {}): Promise<void> {
    await this.stop(options);
  }

  async #stop(options: TerminalStopOptions): Promise<void> {
    this.#state = "stopping";
    let failure: PiTuiRuntimeError | undefined;
    try { this.#inputCoordinator?.dispose(false); }
    catch (error) { failure = new PiTuiRuntimeError("restoration", error); }
    if (options.drainInput !== false) {
      try {
        await boundedCleanup(() => this.#terminal.drainInput(options.drainMaxMs, options.drainIdleMs));
      } catch (error) {
        failure = new PiTuiRuntimeError("input-drain", error);
      }
    }

    try {
      const stopOptions = options.preserveScreen === undefined ? undefined : { preserveScreen: options.preserveScreen };
      // Invariant: the gate opens only for the synchronous stop sequence, so no render
      // scheduled during the outro can slip in before the alternate screen is left.
      this.#presentationFrozen = false;
      this.#presentationHolds.clear();
      this.#tui.stop(stopOptions);
    } catch (error) {
      failure ??= new PiTuiRuntimeError("restoration", error);
      this.#bestEffortTerminalRestore();
    } finally {
      this.#clearTerminalProgress();
      this.#disposeComponents();
    }

    this.#state = failure === undefined ? "stopped" : "failed";
    if (failure) throw failure;
  }

  #createTui(mode: "regular" | "fullscreen", hardwareCursor: boolean): TUI {
    if (mode !== "fullscreen") return new TuiMainScreen(this.#tuiTerminal, hardwareCursor, this.#logDirectory);
    if (this.#overlayGeometry === undefined) return new TuiAltScreen(this.#tuiTerminal, hardwareCursor, this.#logDirectory, this.#tuiOptions);
    const screen = new GeometryObservedAltScreen(this.#tuiTerminal, hardwareCursor, this.#logDirectory, this.#tuiOptions);
    screen.geometry = this.#overlayGeometry;
    return screen;
  }

  #routePreInput(data: string): string {
    let current = data;
    for (const listener of this.#preInputListeners) {
      if (current.length === 0) break;
      const result = listener(current);
      if (result?.data !== undefined) current = result.data;
      else if (result?.consume === true) current = "";
    }
    // Invariant: bare A1 owns every fullscreen pointer path. Listeners keep first
    // refusal, then this boundary prevents Pi's reverse-video fallback selection.
    return this.#consumeUnhandledMouse ? stripSgrMouseReports(current) : current;
  }

  #focusedOverlayInputCoordination(): "owned" | "opaque" | undefined {
    for (const [bridge, coordination] of this.#overlayInputCoordination) {
      if (bridge.focused) return coordination;
    }
    return undefined;
  }

  #mountTui(tui: TUI): void {
    tui.addChild(this.#rootBridge);
    if (tui instanceof TuiAltScreen && this.#layoutRoot !== undefined) {
      tui.setLayoutRoot(this.#buildLayout(this.#layoutRoot));
    }
  }

  #bridgeFor(component: TerminalComponentPort | null): ComponentBridge | null {
    if (component === null) return null;
    const bridge = this.#bridges.get(component);
    if (!bridge) throw new TypeError("Pi TUI focus target is not mounted");
    return bridge;
  }

  #mount(component: TerminalComponentPort): ComponentBridge {
    const existing = this.#bridges.get(component);
    if (existing) return existing;
    const bridge = new ComponentBridge(component);
    this.#bridges.set(component, bridge);
    this.#mountedComponents.add(component);
    return bridge;
  }

  #buildLayout(node: TerminalLayoutNode): Component {
    if (node.type === "component") return this.#mount(node.component);
    if (node.type === "scroll") {
      if (this.#scrollIds.has(node.id)) throw new TypeError(`duplicate Pi TUI scroll layout id: ${node.id}`);
      const options = {
        ...(node.follow === undefined ? {} : { follow: node.follow }),
        ...(node.primary === undefined ? {} : { primary: node.primary }),
        ...(node.overscroll === undefined ? {} : { overscroll: node.overscroll }),
        ...(node.scrollbar === undefined ? {} : { scrollbar: node.scrollbar }),
        ...(node.scrollbarTrackStyle === undefined ? {} : { scrollbarTrackStyle: node.scrollbarTrackStyle }),
        ...(node.scrollbarThumbStyle === undefined ? {} : { scrollbarThumbStyle: node.scrollbarThumbStyle }),
        ...(node.scrollbarHideDelayMs === undefined ? {} : { scrollbarHideDelayMs: node.scrollbarHideDelayMs }),
      };
      this.#scrollIds.add(node.id);
      return new ScrollView(this.#buildLayout(node.child), options);
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

  #assertRunning(operation: string): void {
    if (!this.active) throw new Error(`Pi TUI ${operation} requires a running runtime`);
  }

  #restoreAfterFailedStart(): void {
    this.#presentationFrozen = false;
    this.#presentationHolds.clear();
    try {
      this.#tui.stop();
    } catch {
      this.#bestEffortTerminalRestore();
    }
  }

  #clearTerminalProgress(): void {
    try {
      this.#terminal.setProgress(false);
    } catch {}
    this.#terminalProgress = false;
  }

  #bestEffortTerminalRestore(): void {
    this.#presentationFrozen = false;
    this.#presentationHolds.clear();
    this.#clearTerminalProgress();
    try { if (this.mode === "fullscreen") this.#terminal.write(EMERGENCY_TERMINAL_RESET); } catch {}
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
    this.#inputCoordinator?.dispose(false);
    this.#inputSink = undefined;
    for (const remove of this.#inputListeners.values()) remove();
    this.#inputListeners.clear();
    this.#preInputListeners.clear();
    for (const dispose of [...this.#overlayDisposers]) dispose();
    this.#overlayInputCoordination.clear();
    this.#disposeRoot();
  }
}

/** The terminal Pi's TUI drives: the neutral port with program status always present. */
type PiTuiTerminal = TerminalPort & { setProgramStatus(status: ProgramStatus): void };

/** The terminal members a decorator may replace; the size getters always read the inner terminal. */
type TerminalOverrides = Partial<Omit<PiTuiTerminal, "columns" | "rows" | "kittyProtocolActive" | "restoreOnExit">>;

/**
 * Forwards every terminal member to `terminal` unless `overrides` replaces it.
 * Invariant: the size and keyboard getters stay live; spreading the inner terminal would freeze them.
 */
function forwardingTerminal(terminal: TerminalPort, overrides: TerminalOverrides = {}): PiTuiTerminal {
  return {
    get columns() { return terminal.columns; },
    get rows() { return terminal.rows; },
    get kittyProtocolActive() { return terminal.kittyProtocolActive; },
    start: overrides.start ?? ((onInput, onResize) => terminal.start(onInput, onResize)),
    stop: overrides.stop ?? (() => terminal.stop()),
    drainInput: overrides.drainInput ?? ((maxMs, idleMs) => terminal.drainInput(maxMs, idleMs)),
    write: overrides.write ?? (data => terminal.write(data)),
    moveBy: overrides.moveBy ?? (lines => terminal.moveBy(lines)),
    hideCursor: overrides.hideCursor ?? (() => terminal.hideCursor()),
    showCursor: overrides.showCursor ?? (() => terminal.showCursor()),
    clearLine: overrides.clearLine ?? (() => terminal.clearLine()),
    clearFromCursor: overrides.clearFromCursor ?? (() => terminal.clearFromCursor()),
    clearScreen: overrides.clearScreen ?? (() => terminal.clearScreen()),
    setTitle: overrides.setTitle ?? (title => terminal.setTitle(title)),
    setProgress: overrides.setProgress ?? (active => terminal.setProgress(active)),
    setProgramStatus: overrides.setProgramStatus ?? (status => terminal.setProgramStatus?.(status)),
  };
}

function coordinatedInputTerminal(
  terminal: TerminalPort,
  coordinator: InputPresentationCoordinator,
  setSink: (sink: ((data: string) => void) | undefined) => void,
  frameMouse: boolean,
): PiTuiTerminal {
  const mouse = frameMouse ? new MouseReportInput(data => coordinator.accept(data)) : undefined;
  return forwardingTerminal(terminal, {
    start(onInput, onResize) {
      setSink(onInput);
      terminal.start(data => mouse === undefined ? coordinator.accept(data) : mouse.accept(data), () => {
        coordinator.flush();
        mouse?.reset();
        onResize();
      });
    },
    stop() {
      coordinator.flush();
      mouse?.reset();
      setSink(undefined);
      terminal.stop();
    },
  });
}

function diagnosticTerminal(
  terminal: TerminalPort,
  trace: (phase: "write-start" | "write-end") => void,
): PiTuiTerminal {
  return forwardingTerminal(terminal, {
    write(data) {
      trace("write-start");
      try {
        terminal.write(data);
      } finally {
        trace("write-end");
      }
    },
  });
}

function frozenGateTerminal(terminal: TerminalPort, frozen: () => boolean): PiTuiTerminal {
  return forwardingTerminal(terminal, {
    write: data => { if (!frozen()) terminal.write(data); },
    moveBy: lines => { if (!frozen()) terminal.moveBy(lines); },
    hideCursor: () => { if (!frozen()) terminal.hideCursor(); },
    showCursor: () => { if (!frozen()) terminal.showCursor(); },
    clearLine: () => { if (!frozen()) terminal.clearLine(); },
    clearFromCursor: () => { if (!frozen()) terminal.clearFromCursor(); },
    clearScreen: () => { if (!frozen()) terminal.clearScreen(); },
  });
}

function preInputTerminal(terminal: TerminalPort, route: (data: string) => string, frameMouse: boolean): PiTuiTerminal {
  let mouse: MouseReportInput | undefined;
  return forwardingTerminal(terminal, {
    start(onInput, onResize) {
      const deliver = (data: string) => {
        const routed = route(data);
        if (routed.length > 0) onInput(routed);
      };
      mouse = frameMouse ? new MouseReportInput(deliver) : undefined;
      terminal.start(data => mouse === undefined ? deliver(data) : mouse.accept(data), () => {
        mouse?.reset();
        onResize();
      });
    },
    stop: () => { mouse?.reset(); terminal.stop(); },
  });
}

function toOverlayOptions(options: TerminalOverlayOptions | undefined): OverlayOptions | undefined {
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

type RuntimePhase = "composition-start" | "composition-end" | "write-start" | "write-end";

/** Reports one runtime phase with the input coordinator's depth and revision at that moment. */
function runtimePhaseTracer(
  diagnostics: NonNullable<TerminalRuntimeOptions["inputDiagnostics"]>,
  now: () => number,
  coordinator: () => InputPresentationCoordinator | undefined,
): (phase: RuntimePhase) => void {
  return phase => {
    const current = coordinator();
    diagnostics.onEvent({
      phase,
      revision: current?.appliedRevision ?? 0,
      atMs: now(),
      pendingDepth: current?.pendingDepth ?? 0,
      pendingPresentationDepth: current?.pendingPresentation === true ? 1 : 0,
      appliedRevision: current?.appliedRevision ?? 0,
    });
  };
}
