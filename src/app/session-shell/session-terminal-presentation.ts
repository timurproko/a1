import type { OwnedUiSessionViewModel, OwnedUiShellProgramStatusReporter } from "../../contracts/owned-ui/index.js";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import type { OwnedUiPresenterTerminal } from "./shell-host.js";

interface SessionTerminalPresentationPorts {
  terminal(): OwnedUiPresenterTerminal;
  programStatus(): OwnedUiShellProgramStatusReporter;
  titleEnabled(): boolean;
}

/** Session-derived terminal state, published only through the presenter's guarded handle. */
export class SessionTerminalPresentation {
  readonly #ports: SessionTerminalPresentationPorts;
  progressEnabled = false;
  // Invariant: extension titles never change this memo, so unrelated views leave them alone.
  #lastCoreTitle: string | undefined;

  constructor(ports: SessionTerminalPresentationPorts) { this.#ports = ports; }

  syncTitle(view: OwnedUiSessionViewModel, force = false): void {
    const terminal = this.#ports.terminal();
    if (!this.#ports.titleEnabled() || !terminal.running || !terminal.attached) return;
    const title = view.status.footer?.sessionName?.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/gu, " ").trim()
      || PRODUCT_IDENTITY.displayName;
    if (!force && title === this.#lastCoreTitle) return;
    terminal.setTitle(title);
    this.#lastCoreTitle = title;
  }

  syncProgress(view: OwnedUiSessionViewModel): void {
    const terminal = this.#ports.terminal();
    if (!terminal.running) return;
    const status = this.#ports.programStatus();
    terminal.setTerminalProgress(this.progressEnabled && view.lifecycle === "busy");
    if (view.lifecycle === "stopped" || view.lifecycle === "stopping") {
      status.clear();
      return;
    }
    status.setBlocked("dialog", view.dialog === null ? undefined : { kind: "question", message: view.dialog.title });
    if (view.lifecycle === "failed") status.setErrorMessage(view.status.diagnostics.at(-1));
    status.report();
  }
}
