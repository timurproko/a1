import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { isRecord } from "./message-values.js";
import { missingSessionCwdRecovery } from "./session-cwd-recovery.js";
import { switchToRecoveredFork } from "./runtime-integration.js";
import type { AgentSession, AgentSessionRuntime, ExtensionUIContext } from "../startup-public.js";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  assertOwnedUiExtensionUiPort,
  type OwnedUiDiagnostics,
  type OwnedUiVisualExtensionSupport,
} from "../../../contracts/owned-ui/index.js";

export type OwnedPiVisualExtensionSupport = OwnedUiVisualExtensionSupport;

interface PiExtensionUiBindingPorts {
  session(): AgentSession | undefined;
  runtime(): AgentSessionRuntime | undefined;
  diagnostic(severity: OwnedUiDiagnostics["severity"], code: string, message: string, recoverable: boolean): void;
  emitView(): void;
}

/**
 * The owned extension UI bridge's attachment to pinned Pi sessions: the bridge the shell hands
 * over, whether the current session is bound to it, and the rebind that every new session needs.
 * Extension errors surface as adapter diagnostics through the ports.
 */
export class PiExtensionUiBinding {
  readonly #ports: PiExtensionUiBindingPorts;
  #extensionUi: ExtensionUIContext | undefined;
  #extensionShutdown: (() => void | Promise<void>) | undefined;
  #extensionBound = false;
  readonly #bindings = new WeakMap<AgentSession, Promise<boolean>>();
  // Invariant: a presenter transfer changes the UI target, not the extension session lifecycle.
  readonly #forwardedUi = new Proxy({} as ExtensionUIContext, {
    get: (_target, key) => {
      const ui = this.#extensionUi;
      if (ui === undefined) throw new Error("Extension UI is detached");
      const value: unknown = Reflect.get(ui, key, ui);
      return typeof value === "function" ? (...args: unknown[]) => {
        const current = this.#extensionUi;
        if (current === undefined) throw new Error("Extension UI is detached");
        return Reflect.apply(Reflect.get(current, key, current) as (...arguments_: unknown[]) => unknown, current, args);
      } : value;
    },
    ownKeys: () => Reflect.ownKeys(this.#extensionUi ?? {}),
    getOwnPropertyDescriptor: () => ({ configurable: true, enumerable: true }),
  });

  constructor(ports: PiExtensionUiBindingPorts) {
    this.#ports = ports;
  }

  /** True while a bridge is attached, bound or not. */
  get attached(): boolean {
    return this.#extensionUi !== undefined;
  }

  support(): OwnedPiVisualExtensionSupport {
    return {
      available: this.#extensionBound,
      contractComplete: true,
      contractVersion: OWNED_UI_EXTENSION_CONTRACT_VERSION,
      binding: this.#extensionBound ? "bound" : "unbound",
      uiCallbacks: OWNED_UI_EXTENSION_UI_CALLBACKS,
      uiProperties: OWNED_UI_EXTENSION_UI_PROPERTIES,
      renderCallbacks: OWNED_UI_EXTENSION_RENDER_CALLBACKS,
      diagnostic: this.#extensionBound
        ? `Pinned public extension UI lifecycle is bound through the ${PRODUCT_IDENTITY.displayName}-owned bridge.`
        : `The complete ${PRODUCT_IDENTITY.displayName}-owned extension UI contract is available; the active session has not been bound to the owned UI bridge.`,
    };
  }

  /** Attach the owned extension UI bridge and bind it to the current session. */
  async bind(ui: unknown, shutdown?: () => void | Promise<void>): Promise<void> {
    assertPiExtensionUiContext(ui);
    this.#extensionUi = ui;
    this.#extensionShutdown = shutdown;
    await this.rebind();
  }

  /** Detach the bridge; the next session binding will not rebind it. */
  async unbind(): Promise<void> {
    this.#extensionUi = undefined;
    this.#extensionShutdown = undefined;
    this.#extensionBound = false;
  }

  /** Wait for startup already admitted by the owned shell before accepting its initial prompt. */
  async settle(): Promise<void> {
    const session = this.#ports.session();
    if (session !== undefined) await this.#bindings.get(session);
  }

  /** Bind once per session; pinned SDK reload already restores bindings and emits its own startup. */
  async rebind(): Promise<void> {
    const session = this.#ports.session();
    if (session === undefined || this.#extensionUi === undefined || session.bindExtensions === undefined) {
      this.#extensionBound = false;
      return;
    }
    let binding = this.#bindings.get(session);
    if (binding === undefined) {
      this.#extensionBound = false;
      binding = this.#bindSession(session);
      this.#bindings.set(session, binding);
    }
    const bound = await binding;
    if (!bound) this.#bindings.delete(session);
    if (this.#ports.session() !== session || this.#extensionUi === undefined) return;
    this.#extensionBound = bound;
    this.#ports.emitView();
  }

  async #bindSession(session: AgentSession): Promise<boolean> {
    try {
      const runtime = this.#ports.runtime();
      await session.bindExtensions({
        uiContext: this.#forwardedUi,
        ...(runtime === undefined ? {} : {
          commandContextActions: {
            waitForIdle: () => session.waitForIdle(),
            newSession: options => runtime.newSession(options),
            fork: (entryId, options) => runtime.fork(entryId, options),
            navigateTree: async (targetId, options) => {
              const result = await session.navigateTree(targetId, options);
              return { cancelled: result.cancelled === true };
            },
            reload: async () => { await session.reload(); await this.rebind(); },
            switchSession: async (path, options) => {
              try {
                const result = await runtime.switchSession(path, options);
                if (!result.cancelled) this.#forwardedUi.notify("Resumed session", "info");
                return result;
              } catch (error) {
                const recovery = missingSessionCwdRecovery(error);
                if (recovery === undefined) throw error;
                const selected = await this.#forwardedUi.select(recovery.message, recovery.options.map(option => option.label));
                const choice = recovery.options.find(option => option.label === selected)?.id;
                const cwd = recovery.cwdRecovery.fallbackCwd;
                if (choice === "fork") {
                  const result = await switchToRecoveredFork(runtime, path, cwd, options);
                  if (!result.cancelled) this.#forwardedUi.notify(result.message, "info");
                  return { cancelled: result.cancelled };
                }
                if (choice === "continue") {
                  const result = await runtime.switchSession(path, { ...options, cwdOverride: cwd });
                  if (!result.cancelled) this.#forwardedUi.notify(`Resumed session in ${cwd}`, "info");
                  return result;
                }
                this.#forwardedUi.notify("Resume cancelled", "info");
                return { cancelled: true };
              }
            },
          },
        }),
        mode: "tui",
        shutdownHandler: () => this.#extensionShutdown?.(),
        onError: error => {
          if (this.#ports.session() !== session || this.#extensionUi === undefined) return;
          const message = isRecord(error) && typeof error.error === "string"
            ? error.error
            : error instanceof Error ? error.message : String(error);
          this.#ports.diagnostic("warning", "extension-ui", message, true);
          this.#ports.emitView();
        },
      });
      return true;
    } catch (error) {
      if (this.#ports.session() === session && this.#extensionUi !== undefined) {
        this.#ports.diagnostic("error", "extension-ui-bind", error instanceof Error ? error.message : String(error), true);
      }
      return false;
    }
  }
}

function assertPiExtensionUiContext(value: unknown): asserts value is ExtensionUIContext {
  assertOwnedUiExtensionUiPort(value);
}
