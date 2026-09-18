import { PRODUCT_IDENTITY } from "../../../product-identity.js";
import { isRecord } from "./message-values.js";
import type { AgentSession, ExtensionUIContext } from "../startup-public.js";
import {
  OWNED_UI_EXTENSION_CONTRACT_VERSION,
  OWNED_UI_EXTENSION_RENDER_CALLBACKS,
  OWNED_UI_EXTENSION_UI_CALLBACKS,
  OWNED_UI_EXTENSION_UI_PROPERTIES,
  assertOwnedUiExtensionUiPort,
  type OwnedUiDiagnostics,
} from "../../../contracts/owned-ui/index.js";

export interface OwnedPiVisualExtensionSupport {
  readonly available: boolean;
  readonly contractComplete: true;
  readonly contractVersion: typeof OWNED_UI_EXTENSION_CONTRACT_VERSION;
  readonly binding: "bound" | "unbound";
  readonly uiCallbacks: typeof OWNED_UI_EXTENSION_UI_CALLBACKS;
  readonly uiProperties: typeof OWNED_UI_EXTENSION_UI_PROPERTIES;
  readonly renderCallbacks: typeof OWNED_UI_EXTENSION_RENDER_CALLBACKS;
  readonly diagnostic: string;
}

export interface PiExtensionUiBindingPorts {
  session(): AgentSession | undefined;
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

  /** Bind the attached bridge to the current session, reporting failures as diagnostics. */
  async rebind(): Promise<void> {
    const session = this.#ports.session();
    const ui = this.#extensionUi;
    if (session === undefined || ui === undefined || session.bindExtensions === undefined) {
      this.#extensionBound = false;
      return;
    }
    try {
      await session.bindExtensions({
        uiContext: ui,
        mode: "tui",
        shutdownHandler: () => this.#extensionShutdown?.(),
        onError: error => {
          const message = isRecord(error) && typeof error.error === "string"
            ? error.error
            : error instanceof Error ? error.message : String(error);
          this.#ports.diagnostic("warning", "extension-ui", message, true);
          this.#ports.emitView();
        },
      });
      this.#extensionBound = true;
      this.#ports.emitView();
    } catch (error) {
      this.#extensionBound = false;
      this.#ports.diagnostic("error", "extension-ui-bind", error instanceof Error ? error.message : String(error), true);
      this.#ports.emitView();
    }
  }
}

function assertPiExtensionUiContext(value: unknown): asserts value is ExtensionUIContext {
  assertOwnedUiExtensionUiPort(value);
}
