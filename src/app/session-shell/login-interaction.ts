import type {
  OwnedUiWorkflowInteractionRequest,
  OwnedUiWorkflowLoginNotification,
  OwnedUiWorkflowLoginStart,
} from "../../contracts/owned-ui/index.js";
import {
  createPiShellExtensionSelector,
  createPiShellLoginDialog,
  type PiShellLoginDialogPort,
} from "../../integrations/pi/components/shell-selectors-dialogs.js";
import type { ProgramStatusReporter } from "../../integrations/pi/components/upstream/program-status-reporter.js";
import type { SessionConcern } from "./session-concern.js";
import type { OwnedUiSessionShellRoot } from "./session-shell-root.js";
import { componentRuntime, type OwnedUiPresenterTerminal } from "./shell-host.js";

export interface LoginInteractionPorts {
  readonly terminal: Pick<OwnedUiPresenterTerminal, "viewport" | "requestRender">;
  readonly root: Pick<OwnedUiSessionShellRoot, "setInputSurface">;
  readonly programStatus: Pick<ProgramStatusReporter, "setBlocked">;
  /** The blocked-on-authentication state changed; the presenter republishes terminal progress. */
  readonly syncProgress: () => void;
}

/**
 * The engine's login flow in the dock: one login dialog at a time, the prompts and selections the
 * engine asks through it, and the terminal's blocked-on-authentication status while it is open.
 */
export class LoginInteraction implements SessionConcern {
  readonly #ports: LoginInteractionPorts;
  #dialog: PiShellLoginDialogPort | undefined;

  constructor(ports: LoginInteractionPorts) {
    this.#ports = ports;
  }

  start(request: OwnedUiWorkflowLoginStart): void {
    this.finish();
    const dialog = createPiShellLoginDialog(componentRuntime(this.#ports.terminal), request.providerId, success => {
      if (!success) this.finish();
    }, request.providerName);
    this.#dialog = dialog;
    this.#ports.root.setInputSurface(dialog);
    this.#ports.programStatus.setBlocked("authentication", {
      kind: "auth",
      message: `Log in to ${request.providerName}`,
    });
    this.#ports.syncProgress();
    this.#ports.terminal.requestRender();
  }

  /** Answers an engine prompt through the open dialog; null when no login is in progress or it is cancelled. */
  requestInput(request: OwnedUiWorkflowInteractionRequest): Promise<string | null> {
    const dialog = this.#dialog;
    if (!dialog) return Promise.resolve(null);
    if (request.type === "select") {
      return new Promise(resolve => {
        const options = request.options ?? [];
        const labels = options.map(option => option.label);
        const restoreDialog = () => {
          if (this.#dialog === dialog) this.#ports.root.setInputSurface(dialog);
          this.#ports.terminal.requestRender();
        };
        const selector = createPiShellExtensionSelector(request.message, labels, label => {
          const id = options.find(option => option.label === label)?.id;
          restoreDialog();
          resolve(id ?? null);
        }, () => {
          restoreDialog();
          resolve(null);
        });
        this.#ports.root.setInputSurface(selector, false);
        this.#ports.terminal.requestRender();
      });
    }
    const response = request.type === "manual-code"
      ? dialog.showManualInput(request.message)
      : dialog.showPrompt(request.message, request.placeholder);
    this.#ports.terminal.requestRender();
    return response.then(value => value, () => null);
  }

  notify(event: OwnedUiWorkflowLoginNotification): void {
    const dialog = this.#dialog;
    if (!dialog) return;
    if (event.type === "auth_url") dialog.showAuth(event.url, event.instructions);
    else if (event.type === "device_code") {
      dialog.showDeviceCode(event);
      dialog.showWaiting("Waiting for authentication...");
    } else if (event.type === "info") dialog.showInfo(event.message, event.links);
    else if (event.type === "waiting") dialog.showWaiting(event.message);
    else dialog.showProgress(event.message);
    this.#ports.terminal.requestRender();
  }

  finish(): void {
    if (!this.#dialog) return;
    this.#dialog = undefined;
    this.#ports.root.setInputSurface(null);
    this.#ports.programStatus.setBlocked("authentication", undefined);
    this.#ports.syncProgress();
    this.#ports.terminal.requestRender();
  }

  /** A replaced session forgets its dialog; the presenter clears the input surface as part of the same replacement. */
  onSessionReplaced(): void {
    this.#dialog = undefined;
  }
}
