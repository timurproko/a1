import type {
  OwnedUiBackgroundSettingsPort,
  OwnedUiPresenterHost,
  OwnedUiSessionPresenter,
  OwnedUiTerminalHost as OwnedUiTerminalHostContract,
} from "../../contracts/owned-ui/index.js";
import type { UiRouteSurface } from "../../ui/apps/contracts.js";
import type { QuitOutroEffect } from "./quit-outro-effects.js";
import { MOUSE_TRACKING_OFF, MOUSE_TRACKING_ON, parseMouseInput } from "../../ui/components/mouse.js";
import { readVisibleHyperlinks } from "../../ui/components/visible-hyperlinks.js";
import { piCanvasBackgroundAnsi } from "../../integrations/pi/components/theme.js";
import {
  DamageAwareTerminalAdapter,
  type PiTuiDamageDecision,
  type PiTuiDamageFrameDescriptor,
  type PiTuiDamageFrameSafety,
} from "../../integrations/pi/tui-runtime/damage-aware-terminal.js";
import { PiTuiRuntimeAdapter } from "../../integrations/pi/tui-runtime/adapter.js";
import { classifyPiTuiInput } from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type { PiTuiInputSurfaceKind } from "../../integrations/pi/tui-runtime/input-presentation-coordinator.js";
import type {
  PiTuiComponentPort,
  PiTuiInputListener,
  PiTuiInputListenerResult,
  PiTuiOverlayHandle,
  PiTuiOverlayOptions,
  PiTuiOverlayUnfocusOptions,
  PiTuiPointerSurface,
  PiTuiPreInputListener,
  PiTuiRuntimeAdapterOptions,
  PiTuiTerminalPort,
} from "../../integrations/pi/tui-runtime/contracts.js";
import {
  pinnedLayoutRoot,
  type OwnedUiSessionShellOptions,
  type OwnedUiShellPresentationOptions,
  type PinnedLayoutPart,
  type PinnedLayoutParts,
} from "./session-shell-root.js";

type ProgramStatus = Parameters<PiTuiRuntimeAdapter["setProgramStatus"]>[0];
type WheelScrollLines = Parameters<PiTuiRuntimeAdapter["setWheelScrollLines"]>[0];

/** What the terminal host needs from a presenter beyond the neutral contract: the Pi runtime's per-session seams. */
export interface OwnedUiHostedPresenter extends OwnedUiSessionPresenter {
  inputCoordinationSurface(): PiTuiInputSurfaceKind;
  setOverlaySurfaces(surfaces: readonly PiTuiPointerSurface[] | null): void;
  noteImmediatePresentation(): void;
  /** The bare-A1 viewport's pre-input routing; returns what the runtime's pre-input listener returns. */
  handleViewportInput(data: string): PiTuiInputListenerResult | undefined;
  layoutPart(part: PinnedLayoutPart): PiTuiComponentPort;
  /** Called after the host makes this presenter active, to republish its terminal-wide state. */
  activated(): void;
  /**
   * Releases the presenter's session bindings synchronously. `settle` finishes the asynchronous cleanup the
   * host awaits after the terminal is restored, and resolves to any failures.
   */
  release(terminal: { readonly mode: "regular" | "fullscreen"; readonly columns: number }): OwnedUiPresenterRelease;
}

export interface OwnedUiPresenterRelease {
  /** Text to leave in the parent terminal after a fullscreen leave; empty for none. */
  readonly exitText: string;
  readonly failures: readonly unknown[];
  settle(): Promise<readonly unknown[]>;
}

/** The terminal as one presenter reaches it. Paint, input, and status calls from an inactive presenter do nothing. */
export interface OwnedUiPresenterTerminal extends OwnedUiPresenterHost {
  /** True while the terminal runtime is running, whichever presenter is active. */
  readonly running: boolean;
  /** True while this presenter is the host's active presenter. */
  readonly attached: boolean;
  readonly mode: "regular" | "fullscreen";
  /** Starts the terminal; idempotent. */
  start(): void;
  renderNow(): void;
  writeControl(data: string): void;
  hasOverlay(): boolean;
  hasFocusedOverlay(): boolean;
  showOverlay(component: PiTuiComponentPort, options?: PiTuiOverlayOptions): PiTuiOverlayHandle;
  addInputListener(listener: PiTuiInputListener): () => void;
  armFrame(descriptor: PiTuiDamageFrameDescriptor, safety: PiTuiDamageFrameSafety): void;
  requestHyperlinkCleanup(rows?: readonly number[]): void;
  openRoute(surface: UiRouteSurface, callbacks: OwnedUiRouteCallbacks): { hide(): void };
  beginPresentationHold(): () => void;
  switchMode(mode: "regular" | "fullscreen"): boolean;
  setTitle(title: string): void;
  setProgramStatus(status: ProgramStatus): void;
  setTerminalProgress(active: boolean): void;
  setHardwareCursor(enabled: boolean): void;
  setClearOnShrink(enabled: boolean): void;
  setWheelScrollLines(lines: WheelScrollLines): void;
}

export interface OwnedUiRouteCallbacks {
  /** The route, or the interrupt chord over it, asked to leave A1. */
  exit(): void;
  /** The route closed itself; `rendered` is true when it was ever painted. */
  closed(rendered: boolean): void;
}

export interface OwnedUiTerminalHostOptions {
  /** Bare A1 owns a bounded custom viewport; comparison profiles keep the pinned layout. */
  readonly layout: "pinned" | "custom-viewport";
  readonly mode: "regular" | "fullscreen";
  readonly hardwareCursor: boolean;
  readonly wheelScrollLines?: WheelScrollLines;
  readonly terminal?: PiTuiTerminalPort;
  readonly input?: OwnedUiShellPresentationOptions["input"];
  readonly backgroundSettings?: OwnedUiBackgroundSettingsPort;
  readonly quitOutro?: OwnedUiShellPresentationOptions["quitOutro"];
}

/** The terminal a session's shell options call for: its layout, TUI mode, cursor, and presentation seams. */
export function sessionTerminalHostOptions(options: OwnedUiSessionShellOptions): OwnedUiTerminalHostOptions {
  const { backend, sessionLayout } = options.engine;
  const { terminal, input, backgroundSettings, quitOutro } = options.presentation ?? {};
  const customViewport = sessionLayout === "custom-viewport";
  const settings = backend.settings.snapshot();
  return {
    layout: customViewport ? "custom-viewport" : "pinned",
    // Invariant: bare A1 owns a bounded viewport and therefore always runs on the alternate
    // fullscreen surface. The pinned comparison profiles still honor Pi's mode.
    mode: customViewport ? "fullscreen" : backend.identity.disposed ? "regular" : settings.tuiMode,
    hardwareCursor: backend.session.view().terminal.hardwareCursor,
    ...(customViewport ? {} : { wheelScrollLines: settings.fullscreenWheelScrollLines }),
    ...(terminal === undefined ? {} : { terminal }),
    ...(input === undefined ? {} : { input }),
    ...(customViewport && backgroundSettings !== undefined ? { backgroundSettings } : {}),
    ...(quitOutro === undefined ? {} : { quitOutro }),
  };
}

/**
 * Owns the process terminal: the Pi TUI runtime, damage-aware presentation, pointer reporting, owned-route
 * overlays, the quit presentation, and restoration. It shows exactly one active presenter; the runtime's root
 * delegates to it, and a presenter switch starts a new presentation epoch so its first frame paints in full.
 */
export class OwnedUiTerminalHost implements OwnedUiTerminalHostContract<OwnedUiHostedPresenter> {
  readonly runtime: PiTuiRuntimeAdapter;
  readonly #customViewport: boolean;
  readonly #damageTerminal: DamageAwareTerminalAdapter | null;
  readonly #quitOutro: OwnedUiTerminalHostOptions["quitOutro"];
  readonly #presenters = new Set<OwnedUiHostedPresenter>();
  readonly #overlays = new Map<OwnedUiHostedPresenter, Set<PresenterOverlay>>();
  readonly #removeViewportPreInput: () => void;
  readonly #unsubscribeBackground: () => void;
  #active: OwnedUiHostedPresenter | null = null;
  #focused = false;
  #pointerReporting = false;
  #started = false;
  #ending: Promise<void> | undefined;

  constructor(options: OwnedUiTerminalHostOptions) {
    this.#customViewport = options.layout === "custom-viewport";
    this.#quitOutro = options.quitOutro;
    const input = options.input;
    let damageTerminal: DamageAwareTerminalAdapter | undefined;
    const surface: PiTuiComponentPort = {
      render: width => this.#active?.render(width) ?? [],
      handleInput: data => this.#active?.handleInput(data),
      invalidate: () => this.#active?.invalidate(),
      setFocused: focused => {
        this.#focused = focused;
        this.#active?.setFocused(focused);
      },
    };
    const runtimeOptions: PiTuiRuntimeAdapterOptions = {
      root: surface,
      mode: options.mode,
      ...(this.#customViewport ? {
        // Invariant: the owned shell enables and routes mouse reports itself. Pi's
        // enclosing fullscreen renderer must never establish a competing white selection.
        mouse: false,
        consumeUnhandledMouse: true,
        onOverlayGeometry: surfaces => this.#active?.setOverlaySurfaces(surfaces),
        decorateTerminal: (terminal: PiTuiTerminalPort) => {
          damageTerminal = new DamageAwareTerminalAdapter(terminal, {
            regionalScroll: process.env.TERM !== "dumb",
            inspectHyperlinks: readVisibleHyperlinks,
            onResize: () => this.#active?.noteImmediatePresentation(),
            onHyperlinkCleanupRequired: () => this.runtime?.requestRender(true),
          });
          return damageTerminal;
        },
        ...(input?.coordination === false ? {} : {
          inputCoordination: {
            classify: (data: string, focusedOverlay) => classifyPiTuiInput(
              data,
              focusedOverlay ?? this.#active?.inputCoordinationSurface() ?? "opaque",
            ),
            onReceipt: () => this.#active?.noteImmediatePresentation(),
            ...(input?.scheduler === undefined ? {} : { scheduler: input.scheduler }),
          },
        }),
      } : { layoutRoot: pinnedLayoutRoot(this.#delegatingLayoutParts()) }),
      ...(input?.onEvent === undefined ? {} : {
        inputDiagnostics: {
          onEvent: input.onEvent,
          ...(input.now === undefined ? {} : { now: input.now }),
        },
      }),
      ...(options.terminal === undefined ? {} : { terminal: options.terminal }),
      hardwareCursor: options.hardwareCursor,
      ...(options.wheelScrollLines === undefined ? {} : { wheelScrollLines: options.wheelScrollLines }),
    };
    this.runtime = new PiTuiRuntimeAdapter(runtimeOptions);
    this.#damageTerminal = damageTerminal ?? null;
    const background = this.#customViewport ? options.backgroundSettings : undefined;
    if (background !== undefined) this.#damageTerminal?.setCanvasBackground(piCanvasBackgroundAnsi(background.snapshot()));
    this.#unsubscribeBackground = background === undefined || this.#damageTerminal === null ? () => {} : background.onChange(style => {
      if (this.#damageTerminal?.setCanvasBackground(piCanvasBackgroundAnsi(style))) this.runtime.requestRender(true);
    });
    this.#removeViewportPreInput = this.#customViewport
      ? this.runtime.addPreInputListener(data => this.#active?.handleViewportInput(data))
      : () => {};
  }

  get damagePresentationDecision(): PiTuiDamageDecision | null {
    return this.#damageTerminal?.lastDecision ?? null;
  }

  /** Registers a presenter and returns its terminal handle. The presenter paints only once attached. */
  connect(presenter: OwnedUiHostedPresenter): OwnedUiPresenterTerminal {
    if (this.#ending !== undefined) throw new Error("terminal host has ended");
    this.#presenters.add(presenter);
    return this.#handle(presenter);
  }

  /** Forgets a presenter whose construction failed before it could be attached or released. */
  disconnect(presenter: OwnedUiHostedPresenter): void {
    if (this.#active === presenter) this.#active = null;
    this.#forget(presenter);
  }

  attach(presenter: OwnedUiHostedPresenter): void {
    if (!this.#presenters.has(presenter)) throw new Error("presenter is not connected to this terminal host");
    if (this.#active === presenter) return;
    const previous = this.#active;
    previous?.setFocused(false);
    this.#active = presenter;
    if (previous !== null) for (const overlay of this.#overlays.get(previous) ?? []) overlay.syncVisibility();
    for (const overlay of this.#overlays.get(presenter) ?? []) overlay.syncVisibility();
    presenter.setFocused(this.#focused);
    // Invariant: the incoming presenter's frame ids are its own; the epoch keeps the damage terminal from
    // reading them as stale and from reconciling them against the previous presenter's cells.
    this.#damageTerminal?.invalidatePresentation();
    this.runtime.invalidate();
    this.runtime.requestRender(true);
    presenter.activated();
  }

  active(): OwnedUiHostedPresenter | null {
    return this.#active;
  }

  requestRender(from: OwnedUiHostedPresenter, force = false): void {
    if (from === this.#active) this.runtime.requestRender(force);
  }

  start(): void {
    if (this.#started || this.#ending !== undefined) return;
    this.#started = true;
    this.runtime.start();
    if (this.#customViewport) this.#setPointerReporting(true);
  }

  /** Closes one presenter. Closing the last one ends the terminal. */
  close(presenter: OwnedUiHostedPresenter): Promise<void> {
    if (this.#ending !== undefined || !this.#presenters.has(presenter)) return this.#ending ?? Promise.resolve();
    if (this.#presenters.size === 1) return this.dispose();
    return this.#closeOne(presenter);
  }

  // Invariant: one teardown per host, starting on a microtask so never inside the event listener that requested it.
  dispose(): Promise<void> {
    this.#ending ??= Promise.resolve().then(() => this.#end());
    return this.#ending;
  }

  async #closeOne(presenter: OwnedUiHostedPresenter): Promise<void> {
    const release = presenter.release({ mode: this.runtime.mode, columns: this.runtime.viewport().columns });
    this.#forget(presenter);
    if (this.#active === presenter) this.#active = null;
    const failures = [...release.failures, ...await release.settle()];
    if (failures.length > 0) throw new AggregateError(failures, "Owned UI disposal failed");
  }

  async #end(): Promise<void> {
    const failures: unknown[] = [];
    const attempt = (action: () => void) => { try { action(); } catch (error) { failures.push(error); } };
    // Invariant: the outro frame is what the terminal shows now, before any cleanup writes.
    const outroFrame = this.#captureQuitOutroFrame();
    attempt(() => this.#setPointerReporting(false, true));
    attempt(() => this.#removeViewportPreInput());
    attempt(() => this.#unsubscribeBackground());
    const terminal = { mode: this.runtime.mode, columns: this.runtime.viewport().columns };
    const active = this.#active;
    const releases: OwnedUiPresenterRelease[] = [];
    let exitText = "";
    for (const presenter of [...this.#presenters]) {
      try {
        const release = presenter.release(terminal);
        releases.push(release);
        failures.push(...release.failures);
        if (presenter === active) exitText = release.exitText;
      } catch (error) { failures.push(error); }
      this.#forget(presenter);
    }
    this.#active = null;
    // Invariant: from here to the leave nothing but the outro paints. A throttled frame the
    // renderer still has queued would otherwise land during the stop-time input drain and
    // flash the prompt and footer, whether or not an effect plays.
    attempt(() => this.#freezeQuitPresentation());
    await this.#playQuitOutro(outroFrame);
    // Invariant: terminal restoration precedes any potentially stalled session teardown. The
    // fullscreen leave preserves the screen: the pinned runtime never dumps its final document
    // into the parent terminal, so only the configured exit text follows the leave.
    await this.runtime.dispose({ preserveScreen: this.runtime.mode === "fullscreen" }).catch(error => failures.push(error));
    for (const release of releases) failures.push(...await release.settle());
    if (failures.length > 0) throw new AggregateError(failures, "Owned UI disposal failed");
    if (exitText.length > 0) this.runtime.writeAfterStop(`${exitText}\n`);
  }

  #forget(presenter: OwnedUiHostedPresenter): void {
    this.#presenters.delete(presenter);
    for (const overlay of this.#overlays.get(presenter) ?? []) overlay.hide();
    this.#overlays.delete(presenter);
  }

  #handle(presenter: OwnedUiHostedPresenter): OwnedUiPresenterTerminal {
    const runtime = this.runtime;
    const attached = () => this.#active === presenter;
    return {
      get running() { return runtime.active; },
      get attached() { return attached(); },
      get mode() { return runtime.mode; },
      start: () => this.start(),
      requestRender: force => this.requestRender(presenter, force),
      renderNow: () => { if (attached()) runtime.renderNow(); },
      viewport: () => runtime.viewport(),
      writeControl: data => runtime.writeControl(data),
      hasOverlay: () => runtime.hasOverlay(),
      hasFocusedOverlay: () => runtime.hasFocusedOverlay(),
      showOverlay: (component, options) => this.#showOverlay(presenter, component, options),
      addInputListener: listener => runtime.addInputListener(data => attached() ? listener(data) : undefined),
      armFrame: (descriptor, safety) => {
        if (!attached() || this.#damageTerminal === null) return;
        this.#damageTerminal.arm({ ...descriptor, epoch: this.#damageTerminal.presentationEpoch }, safety);
      },
      requestHyperlinkCleanup: rows => { if (attached()) this.#damageTerminal?.requestHyperlinkCleanup(rows); },
      openRoute: (surface, callbacks) => this.#openRoute(presenter, surface, callbacks),
      // Invariant: an inactive presenter must never hold the active presenter's frames.
      beginPresentationHold: () => attached() ? runtime.beginPresentationHold() : () => {},
      switchMode: mode => runtime.switchMode(mode),
      setTitle: title => { if (attached()) runtime.setTitle(title); },
      setProgramStatus: status => { if (attached() && runtime.active) runtime.setProgramStatus(status); },
      setTerminalProgress: active => { if (attached()) runtime.setTerminalProgress(active); },
      // Rationale: these follow the engine's settings files, which every session shares; the last write wins.
      setHardwareCursor: enabled => runtime.setHardwareCursor(enabled),
      setClearOnShrink: enabled => runtime.setClearOnShrink(enabled),
      setWheelScrollLines: lines => runtime.setWheelScrollLines(lines),
    };
  }

  #showOverlay(presenter: OwnedUiHostedPresenter, component: PiTuiComponentPort, options?: PiTuiOverlayOptions): PiTuiOverlayHandle {
    const owned = this.#overlays.get(presenter) ?? new Set<PresenterOverlay>();
    this.#overlays.set(presenter, owned);
    const overlay = new PresenterOverlay(
      this.runtime.showOverlay(component, options),
      () => this.#active === presenter,
      () => owned.delete(overlay),
    );
    overlay.syncVisibility();
    owned.add(overlay);
    return overlay;
  }

  // Invariant: the pinned layout is mounted once; each region renders whichever presenter is active.
  #delegatingLayoutParts(): PinnedLayoutParts {
    const part = (name: PinnedLayoutPart): PiTuiComponentPort => ({
      render: width => this.#active?.layoutPart(name).render(width) ?? [],
      invalidate: () => this.#active?.layoutPart(name).invalidate(),
      handleInput: data => this.#active?.layoutPart(name).handleInput?.(data),
    });
    return {
      document: part("document"),
      queued: part("queued"),
      aboveWidgets: part("aboveWidgets"),
      status: part("status"),
      editor: part("editor"),
      belowWidgets: part("belowWidgets"),
      footer: part("footer"),
    };
  }

  // Invariant: pointer reporting is disabled on every path that ends the owning screen.
  #setPointerReporting(enabled: boolean, forceOff = false): void {
    const effective = forceOff ? false : this.#customViewport || enabled;
    if (this.#pointerReporting === effective) return;
    this.#pointerReporting = effective;
    if (!this.runtime.active) return;
    this.runtime.writeControl(effective ? MOUSE_TRACKING_ON : MOUSE_TRACKING_OFF);
  }

  #openRoute(presenter: OwnedUiHostedPresenter, surface: UiRouteSurface, callbacks: OwnedUiRouteCallbacks): { hide(): void } {
    const runtime = this.runtime;
    const attached = () => this.#active === presenter;
    // Protocol: any-event reporting: hover and drag are what the screen is driven by, and
    // it also stops the terminal treating a drag as a text selection.
    this.#setPointerReporting(true);
    // Protocol: the interrupt chord is global, so it is watched on raw input rather than
    // through the overlay: the pinned shell handles that key before an overlay
    // ever sees it, which is why an owned screen must not rely on being asked.
    let armedAt = 0;
    let rendered = false;
    let closed = false;
    let overlay: PiTuiOverlayHandle | undefined;
    let removeSurfacePreInput = () => {};
    let removeInterruptWatch = () => {};
    const closeSurface = (notify: boolean) => {
      if (closed) return;
      closed = true;
      removeSurfacePreInput();
      removeInterruptWatch();
      this.#setPointerReporting(false);
      overlay?.hide();
      if (notify) callbacks.closed(rendered);
    };
    removeInterruptWatch = runtime.addInputListener(data => {
      if (!attached() || !data.includes(INTERRUPT)) return undefined;
      // Protocol: route hosts decide whether one interrupt closes their app. Raw-input forwarding
      // is required because Pi handles Ctrl+C before the fullscreen overlay receives normal input.
      const consumedBySurface = surface.handleInput(INTERRUPT);
      if (surface.isClosed()) {
        armedAt = 0;
        closeSurface(true);
        return { consume: true };
      }
      if (consumedBySurface) {
        armedAt = 0;
        runtime.requestRender();
        return { consume: true };
      }
      const now = Date.now();
      if (armedAt !== 0 && now - armedAt <= INTERRUPT_CHORD_MS) {
        armedAt = 0;
        closeSurface(true);
        callbacks.exit();
        return { consume: true };
      }
      armedAt = now;
      runtime.requestRender();
      // Invariant: the presented screen owns the chord, so the pinned shell never sees a
      // stray interrupt while it is up.
      return { consume: true };
    });
    // Compatibility: fullscreen Pi owns a fallback text-selection layer before focused overlay
    // components see pointer input. Route every mouse report to the owned screen
    // at the pre-input boundary so dropdowns, value hover, and numeric +/- work,
    // and consume even unhandled reports so settings content is never selected.
    const routeMouse: PiTuiPreInputListener = data => {
      if (!attached()) return undefined;
      const { events, rest } = parseMouseInput(data);
      if (events.length === 0) return undefined;
      for (const event of events) surface.handleMouse(event);
      if (surface.isClosed()) closeSurface(true);
      else runtime.requestRender();
      return rest.length === 0 ? { consume: true } : { data: rest };
    };
    removeSurfacePreInput = runtime.addPreInputListener(routeMouse);
    const rows = () => Math.max(1, runtime.viewport().rows);
    const component: PiTuiComponentPort = {
      render: (width: number) => {
        const frame = [...surface.render(Math.max(1, width), rows())];
        rendered = true;
        return frame;
      },
      handleInput: (data: string) => {
        const { events, rest } = parseMouseInput(data);
        for (const event of events) surface.handleMouse(event);
        if (rest.length > 0) surface.handleInput(rest);
        if (surface.isClosed()) {
          closeSurface(true);
          return;
        }
        this.requestRender(presenter);
      },
      invalidate: () => this.requestRender(presenter),
    };
    surface.onRenderRequested(() => this.requestRender(presenter));
    surface.onExitRequested(() => {
      closeSurface(true);
      callbacks.exit();
    });
    overlay = this.#showOverlay(presenter, component, {
      width: "100%",
      maxHeight: "100%",
      anchor: "top-left",
      inputCoordination: "owned",
    });
    return { hide: () => closeSurface(false) };
  }

  // Invariant: the snapshot is synchronous; the outro module itself loads only at quit.
  #captureQuitOutroFrame(): QuitOutroCapture | null {
    const outro = this.#quitOutro;
    if (outro === undefined || !outro.interactive || !this.#customViewport || this.#damageTerminal === null) return null;
    if (!this.runtime.active || this.runtime.mode !== "fullscreen") return null;
    try {
      if (!outro.snapshot().enabled) return null;
      const viewport = this.runtime.viewport();
      return {
        rows: this.#damageTerminal.presentedRows(), columns: viewport.columns, height: viewport.rows,
        settings: {
          effect: QUIT_OUTRO_EFFECT,
          durationMs: QUIT_OUTRO_DURATION_MS,
          canvasBackgroundAnsi: this.#damageTerminal.canvasBackgroundAnsi,
        },
      };
    } catch {
      return null;
    }
  }

  #freezeQuitPresentation(): void {
    if (!this.#customViewport || !this.runtime.active || this.runtime.mode !== "fullscreen") return;
    this.runtime.freezePresentation();
  }

  // Rationale: any failure here only skips the effect; restoration always follows.
  async #playQuitOutro(capture: QuitOutroCapture | null): Promise<void> {
    const outro = this.#quitOutro;
    if (capture === null || outro === undefined || !this.runtime.active) return;
    try {
      // Rationale: the effects stay off the startup graph; quit is the only time they load.
      const { captureQuitOutroFrame, playQuitOutro } = await import("./quit-outro.js");
      const frame = captureQuitOutroFrame(capture.rows, capture.columns, capture.height);
      if (frame === null || !this.runtime.active) return;
      await playQuitOutro(frame, capture.settings.effect, capture.settings.durationMs, {
        write: data => this.runtime.writeControl(data),
        ...(capture.settings.canvasBackgroundAnsi === null
          ? {}
          : { canvasBackgroundAnsi: capture.settings.canvasBackgroundAnsi }),
        ...(outro.now === undefined ? {} : { now: outro.now }),
        ...(outro.sleep === undefined ? {} : { sleep: outro.sleep }),
        ...(outro.seed === undefined ? {} : { seed: outro.seed }),
      });
    } catch {
      // Rationale: a failed or interrupted effect must never hold the terminal; restoration follows.
    }
  }
}

/** An overlay that stays hidden while its presenter is not the active one, whatever the presenter asked for. */
class PresenterOverlay implements PiTuiOverlayHandle {
  #requestedHidden = false;
  #hidden = false;

  readonly #handle: PiTuiOverlayHandle;
  readonly #attached: () => boolean;
  readonly #forget: () => void;
  constructor(handle: PiTuiOverlayHandle, attached: () => boolean, forget: () => void) {
    this.#handle = handle;
    this.#attached = attached;
    this.#forget = forget;
  }

  syncVisibility(): void {
    if (this.#hidden) return;
    this.#handle.setHidden(this.#requestedHidden || !this.#attached());
  }

  hide(): void {
    if (this.#hidden) return;
    this.#hidden = true;
    this.#forget();
    this.#handle.hide();
  }

  setHidden(hidden: boolean): void {
    this.#requestedHidden = hidden;
    this.syncVisibility();
  }

  isHidden(): boolean {
    return this.#hidden || this.#handle.isHidden();
  }

  getBounds(): ReturnType<PiTuiOverlayHandle["getBounds"]> {
    return this.#handle.getBounds();
  }

  focus(): void {
    if (this.#attached()) this.#handle.focus();
  }

  unfocus(options?: PiTuiOverlayUnfocusOptions): void {
    this.#handle.unfocus(options);
  }

  isFocused(): boolean {
    return this.#handle.isFocused();
  }
}

const INTERRUPT = "\u0003";
const INTERRUPT_CHORD_MS = 1_500;
// Rationale: the outro is not configurable; the switch only decides whether this plan plays.
const QUIT_OUTRO_EFFECT: QuitOutroEffect = "fall";
const QUIT_OUTRO_DURATION_MS = 800;

interface QuitOutroCapture {
  readonly rows: readonly string[];
  readonly columns: number;
  readonly height: number;
  readonly settings: {
    readonly effect: QuitOutroEffect;
    readonly durationMs: number;
    readonly canvasBackgroundAnsi: string | null;
  };
}
