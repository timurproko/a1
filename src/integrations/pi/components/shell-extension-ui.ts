import { type ExtensionUIContext } from "../startup-public.js";
import { ExtensionEditorComponent } from "./upstream/components/extension-editor.js";
import { ExtensionInputComponent } from "./upstream/components/extension-input.js";
import { ExtensionSelectorComponent } from "./upstream/components/extension-selector.js";
import type { ProgramStatusBlocked } from "./upstream/program-status-reporter.js";
import {
  Text,
  type Component,
  type OverlayHandle,
} from "@earendil-works/pi-tui";
import {
  assertOwnedUiExtensionUiPort,
  type OwnedUiExtensionOverlayHandle,
  type OwnedUiExtensionOverlayOptions,
  type OwnedUiExtensionUiPort,
} from "../../../contracts/owned-ui/index.js";
import {
  KeybindingsManager,
} from "./upstream/adjacent/core/keybindings.js";
import {
  PINNED_PI_LAYOUT,
  applyPiTheme,
  applyPiThemeInstance,
  getAvailablePiThemes,
  getPiSelectListTheme,
  loadPiTheme,
  piTheme,
} from "./theme.js";
import {
  componentPort,
  createTuiFacade,
  ensureTheme,
  isRecord,
  withPiDialogCancel,
  type PiShellComponentPort,
  type PiShellEditorOptions,
} from "./shell-shared-facade.js";

type PiEditorFactory = NonNullable<Parameters<ExtensionUIContext["setEditorComponent"]>[0]>;

export interface PiExtensionUiBridgeHost {
  readonly runtime: Pick<PiShellEditorOptions, "getColumns" | "getRows" | "requestRender">;
  readonly agentDir?: string;
  setInputSurface(component: PiShellComponentPort | null): void;
  setProgramStatusBlocked(status: ProgramStatusBlocked | undefined): void;
  showOverlay(component: PiShellComponentPort, options?: OwnedUiExtensionOverlayOptions): OwnedUiExtensionOverlayHandle;
  listenInput(handler: (data: string) => { readonly consume?: boolean; readonly data?: string } | undefined): () => void;
  replaceWidget(key: string, component: PiShellComponentPort | null, placement: "aboveEditor" | "belowEditor"): void;
  replaceHeader(component: PiShellComponentPort | null): void;
  replaceFooter(component: PiShellComponentPort | null): void;
  setStatus(key: string, text: string | undefined): void;
  setWorking(message: string | undefined, visible?: boolean): void;
  notify(message: string, type: "info" | "warning" | "error"): void;
  setTitle(title: string): void;
  getEditorText(): string;
  setEditorText(text: string): void;
  pasteToEditor(text: string): void;
  addAutocompleteProvider(factory: unknown): void;
  setCustomEditor(component: PiShellComponentPort | null): void;
  getFooterData(): unknown;
  getToolsExpanded(): boolean;
  setToolsExpanded(expanded: boolean): void;
}

export interface PiExtensionUiBridge {
  /** The extension UI context the engine binds to a session, typed by the neutral contract it satisfies. */
  readonly context: OwnedUiExtensionUiPort;
  input(title: string, placeholder: string, options?: { readonly retainSurfaceOnSettle?: boolean }): Promise<string | undefined>;
  reset(): void;
  dispose(): void;
}

/** Public ExtensionUIContext ported from pinned InteractiveMode without constructing it. */
export function createPiExtensionUiBridge(host: PiExtensionUiBridgeHost): PiExtensionUiBridge {
  ensureTheme();
  const tui = createTuiFacade(host.runtime);
  // Invariant: extension components receive Pi's manager explicitly; the registry stays the process host's.
  const keybindings = KeybindingsManager.create(host.agentDir);
  const disposers = new Set<() => void>();
  let customEditorFactory: PiEditorFactory | undefined;
  const dialogs = createExtensionDialogStack(host);
  const overlayCancels = new Set<() => void>();
  const trackAbort = (signal: AbortSignal | undefined, cancel: () => void) => {
    if (signal === undefined) return () => {};
    if (signal.aborted) {
      cancel();
      return () => {};
    }
    signal.addEventListener("abort", cancel, { once: true });
    const dispose = () => signal.removeEventListener("abort", cancel);
    disposers.add(dispose);
    return () => {
      dispose();
      disposers.delete(dispose);
    };
  };
  const showInput = <T>(
    create: (resolve: (value: T) => void, cancel: () => void) => PiShellComponentPort,
    options?: { signal?: AbortSignal },
    retainSurfaceOnSettle = false,
    blocked?: ProgramStatusBlocked,
  ) =>
    new Promise<T>(resolve => {
      let settled = false;
      let surface: PiShellComponentPort | undefined;
      let untrack = () => {};
      const finish = (value: T) => {
        if (settled) return;
        settled = true;
        untrack();
        if (surface !== undefined) {
          const retained = retainSurfaceOnSettle && dialogs.isOnly(surface);
          // Rationale: like pinned Pi, a settled dialog is disposed so its countdown stops, unless it stays painted.
          if (!retained) surface.dispose?.();
          dialogs.remove(surface, retained);
        }
        resolve(value);
      };
      const cancel = () => finish(undefined as T);
      const created = create(finish, cancel);
      surface = created;
      untrack = trackAbort(options?.signal, cancel);
      if (!settled) dialogs.push({ surface: created, blocked, cancel });
      else created.dispose?.();
    });
  const createFactoryComponent = (factory: unknown, ...arguments_: unknown[]): PiShellComponentPort => {
    if (typeof factory !== "function") throw new TypeError("extension component factory must be a function");
    const component = factory(...arguments_);
    if (isPromiseLike(component)) throw new TypeError("synchronous extension surface factory returned a promise");
    if (!isComponent(component)) throw new TypeError("extension factory returned a malformed component");
    return componentPort(component);
  };
  const context: ExtensionUIContext = {
    select: (title, options, opts) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionSelectorComponent(title, [...options], resolve, cancel, {
        tui,
        ...(opts?.timeout === undefined ? {} : { timeout: opts.timeout }),
        onToggleToolsExpanded: () => host.setToolsExpanded(!host.getToolsExpanded()),
      }),
    ), opts, false, { kind: "question", message: title }),
    async confirm(title, message, opts) {
      const selected = await showInput<string | undefined>((resolve, cancel) => componentPort(
        new ExtensionSelectorComponent(`${title}\n${message}`, ["Yes", "No"], resolve, cancel, {
          tui,
          ...(opts?.timeout === undefined ? {} : { timeout: opts.timeout }),
          onToggleToolsExpanded: () => host.setToolsExpanded(!host.getToolsExpanded()),
        }),
      ), opts, false, { kind: "permission", message: title });
      return selected === "Yes";
    },
    input: (title, placeholder, opts) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionInputComponent(title, placeholder, resolve, cancel, {
        tui,
        ...(opts?.timeout === undefined ? {} : { timeout: opts.timeout }),
      }),
    ), opts, false, { kind: "question", message: title }),
    notify: (message, type = "info") => host.notify(message, type),
    onTerminalInput: handler => host.listenInput(handler),
    setStatus: (key, text) => host.setStatus(key, text),
    setWorkingMessage: message => host.setWorking(message),
    setWorkingVisible: visible => host.setWorking(undefined, visible),
    setWorkingIndicator: options => host.setWorking(options?.frames?.[0]),
    setHiddenThinkingLabel: () => host.runtime.requestRender(),
    setWidget(key, content, options) {
      if (content === undefined) {
        host.replaceWidget(key, null, options?.placement ?? "aboveEditor");
        return;
      }
      try {
        const component = Array.isArray(content)
          ? componentPort(new Text(content.join("\n"), PINNED_PI_LAYOUT.contentPaddingX, 0))
          : createFactoryComponent(content, tui, piTheme());
        host.replaceWidget(key, component, options?.placement ?? "aboveEditor");
      } catch (error) {
        host.notify(extensionError("widget", error), "error");
      }
    },
    setFooter(factory) {
      try {
        host.replaceFooter(factory === undefined ? null : createFactoryComponent(factory, tui, piTheme(), host.getFooterData()));
      } catch (error) {
        host.replaceFooter(null);
        host.notify(extensionError("footer", error), "error");
      }
    },
    setHeader(factory) {
      try {
        host.replaceHeader(factory === undefined ? null : createFactoryComponent(factory, tui, piTheme()));
      } catch (error) {
        host.replaceHeader(null);
        host.notify(extensionError("header", error), "error");
      }
    },
    setTitle: title => host.setTitle(title),
    custom: <T>(factory: Parameters<ExtensionUIContext["custom"]>[0], options?: Parameters<ExtensionUIContext["custom"]>[1]) => new Promise<T>((resolve, reject) => {
      let settled = false;
      let surface: PiShellComponentPort | undefined;
      let overlay: OwnedUiExtensionOverlayHandle | undefined;
      const close = (settle: () => void) => {
        if (settled) return;
        settled = true;
        overlayCancels.delete(cancelCustom);
        // Invariant: remove this dialog or overlay, not the topmost one; another may have opened above it.
        if (overlay !== undefined) overlay.hide();
        else if (surface !== undefined) dialogs.remove(surface);
        settle();
        if (overlay === undefined) {
          try { surface?.dispose?.(); } catch { /* Rationale: a settled dialog's dispose failure must not leak. */ }
        }
      };
      const done = (value: T) => close(() => resolve(value));
      const cancelCustom = () => close(() => Reflect.apply(resolve, undefined, []));
      let created: unknown;
      try {
        created = Reflect.apply(factory, undefined, [tui, piTheme(), keybindings, done]);
      } catch (error) {
        reject(error);
        return;
      }
      void Promise.resolve(created).then(component => {
        if (!isComponent(component)) throw new TypeError("extension custom factory returned a malformed component");
        if (settled) {
          if ("dispose" in component && typeof component.dispose === "function") component.dispose();
          return;
        }
        surface = withPiDialogCancel(componentPort(component), cancelCustom);
        if (options?.overlay) {
          const overlayOptions = typeof options.overlayOptions === "function" ? options.overlayOptions() : options.overlayOptions;
          overlayCancels.add(cancelCustom);
          overlay = host.showOverlay(surface, overlayOptions);
          options.onHandle?.(publicOverlayHandle(overlay));
        } else dialogs.push({ surface, blocked: undefined, cancel: cancelCustom });
      }).catch(error => {
        overlayCancels.delete(cancelCustom);
        if (surface !== undefined && overlay === undefined) dialogs.remove(surface);
        reject(error);
      });
    }),
    pasteToEditor: text => host.pasteToEditor(text),
    setEditorText: text => host.setEditorText(text),
    getEditorText: () => host.getEditorText(),
    editor: (title, prefill) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionEditorComponent(tui, keybindings, title, prefill, resolve, cancel),
    ), undefined, false, { kind: "question", message: title }),
    addAutocompleteProvider: factory => host.addAutocompleteProvider(factory),
    setEditorComponent(factory) {
      customEditorFactory = factory;
      if (factory === undefined) {
        host.setCustomEditor(null);
        return;
      }
      try {
        const editor: unknown = Reflect.apply(factory, undefined, [tui, {
          borderColor: (text: string) => piTheme().fg("borderMuted", text),
          selectList: getPiSelectListTheme(),
        }, keybindings]);
        if (!isComponent(editor)) throw new TypeError("extension editor factory returned a malformed editor");
        host.setCustomEditor(componentPort(editor));
      } catch (error) {
        customEditorFactory = undefined;
        host.setCustomEditor(null);
        host.notify(extensionError("editor", error), "error");
      }
    },
    getEditorComponent: () => customEditorFactory,
    get theme() { return piTheme(); },
    getAllThemes: () => getAvailablePiThemes().map(theme => ({ name: theme.name, path: theme.path })),
    getTheme(name) {
      try { return loadPiTheme(name); } catch { return undefined; }
    },
    setTheme(theme) {
      const result = typeof theme === "string" ? applyPiTheme(theme, true) : applyPiThemeInstance(theme);
      host.runtime.requestRender();
      return result.success
        ? { success: true }
        : { success: false, ...(result.error === undefined ? {} : { error: result.error }) };
    },
    getToolsExpanded: () => host.getToolsExpanded(),
    setToolsExpanded: expanded => host.setToolsExpanded(expanded),
  };
  const reset = () => {
    dialogs.cancelAll();
    for (const cancel of [...overlayCancels]) cancel();
    host.setInputSurface(null);
    host.setProgramStatusBlocked(undefined);
  };
  // Compatibility: Pi's context takes its own TUI and Theme in factory callbacks, so it is not statically the
  // neutral port; the same runtime check the engine applies at bind time lets the shell see only that port.
  assertOwnedUiExtensionUiPort(context);
  return {
    context,
    input: (title, placeholder, options) => showInput<string | undefined>((resolve, cancel) => componentPort(
      new ExtensionInputComponent(title, placeholder, resolve, cancel, { tui }),
    ), undefined, options?.retainSurfaceOnSettle === true, { kind: "question", message: title }),
    reset,
    dispose() {
      reset();
      for (const dispose of disposers) dispose();
      disposers.clear();
      host.replaceHeader(null);
      host.replaceFooter(null);
    },
  };
}

interface ExtensionDialog {
  readonly surface: PiShellComponentPort;
  readonly blocked: ProgramStatusBlocked | undefined;
  readonly cancel: () => void;
}

/**
 * Pinned Pi's extension dialog stack over the shell's single input slot. The last entry is visible; closing it shows
 * the previous one with its program status, and a covered dialog stays answerable, so no dialog promise is left pending.
 */
function createExtensionDialogStack(host: Pick<PiExtensionUiBridgeHost, "runtime" | "setInputSurface" | "setProgramStatusBlocked">) {
  const dialogs: ExtensionDialog[] = [];
  const showTop = () => {
    const top = dialogs.at(-1);
    host.setInputSurface(top?.surface ?? null);
    host.setProgramStatusBlocked(top?.blocked);
    host.runtime.requestRender();
  };
  return {
    push(dialog: ExtensionDialog): void {
      dialogs.push(dialog);
      showTop();
    },
    /** Only removing the visible dialog changes the slot; a retained last surface stays painted without its status. */
    remove(surface: PiShellComponentPort, retainSurface = false): void {
      const index = dialogs.findIndex(dialog => dialog.surface === surface);
      if (index === -1) return;
      dialogs.splice(index, 1);
      if (index !== dialogs.length) return;
      if (!retainSurface || dialogs.length > 0) return showTop();
      host.setProgramStatusBlocked(undefined);
      host.runtime.requestRender();
    },
    isOnly: (surface: PiShellComponentPort) => dialogs.length === 1 && dialogs[0]!.surface === surface,
    /** Rationale: unlike pinned Pi, which drops stacked dialogs unresolved, A1 settles each as cancelled, top first. */
    cancelAll(): void {
      for (const dialog of [...dialogs].reverse()) dialog.cancel();
      for (const dialog of dialogs.splice(0)) dialog.surface.dispose?.();
    },
  };
}

function extensionError(surface: string, error: unknown): string {
  return `Extension ${surface} failed: ${error instanceof Error ? error.message : String(error)}`;
}

function isPromiseLike(value: unknown): value is PromiseLike<unknown> {
  return isRecord(value) && typeof value.then === "function";
}

function isComponent(value: unknown): value is Component {
  return isRecord(value) && typeof value.render === "function" && typeof value.invalidate === "function";
}

function publicOverlayHandle(handle: OwnedUiExtensionOverlayHandle): OverlayHandle {
  return {
    hide: () => handle.hide(),
    setHidden: hidden => handle.setHidden(hidden),
    isHidden: () => handle.isHidden(),
    focus: () => handle.focus(),
    unfocus: options => handle.unfocus(options?.target === undefined
      ? undefined
      : { target: options.target === null ? null : componentPort(options.target) }),
    isFocused: () => handle.isFocused(),
    getBounds: () => handle.getBounds(),
  };
}

