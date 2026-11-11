/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.2 (MIT), commit b4afdddf44e059c67ccf5097e5317d913521b470,
 * packages/coding-agent/src/modes/interactive/components/login-dialog.ts.
 * Modifications: Adapt all provider login states to shared live-themed framing: title, immediate muted
 * description, blank row before accent-chevron input and one-cell inset. Preserve prompt, callback,
 * device/copy, browser, cancellation and nested lifecycle contracts through neutral runtime ports;
 * retain the public component for comparison.
 * Deviations: shared-login-template.
 */
import { Container, getKeybindings, Input, Spacer, type Component } from "@earendil-works/pi-tui";
import { copyToClipboard, DynamicBorder } from "../../../startup-public.js";
import type { OwnedUiShellLoginDialogPort, OwnedUiShellRuntime } from "../../../../../contracts/owned-ui/index.js";
import { addPiModalHeader, adoptPiModalFrame, renderPiModalSearchInput } from "../../modal-frame.js";
import { componentPort } from "../../shell-shared-facade.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, internalDialogTitle, paintPiBorder, piTheme, renderPiModalShortcutHints } from "../../theme.js";
import { loginLink, loginWebUrl, openLoginBrowser } from "../../login-links.js";
import { loginPlainText, loginText } from "../../login-text.js";
import { AuthUrlComponent } from "./auth-url.js";

interface DeviceCode {
  readonly verificationUri: string;
  readonly userCode: string;
}

/** Provider-independent login state presentation with the pinned interaction/effect contract. */
class LoginDialog extends Container {
  readonly #input = new Input();
  readonly #content = new Container();
  readonly #runtime: Pick<OwnedUiShellRuntime, "requestRender">;
  readonly #complete: (success: boolean, message?: string) => void;
  readonly #abort = new AbortController();
  #pending: { resolve(value: string): void; reject(error: Error): void } | undefined;
  #auth: AuthUrlComponent | undefined;
  #device: { readonly info: DeviceCode; readonly hint: Container } | undefined;
  #deviceHint: Container | undefined;
  #focused = false;
  #closed = false;

  constructor(runtime: Pick<OwnedUiShellRuntime, "requestRender">, providerId: string, complete: (success: boolean, message?: string) => void, providerName?: string, title?: string) {
    super();
    this.#runtime = runtime;
    this.#complete = complete;
    const heading = internalDialogTitle(title ?? `Login to ${providerName ?? providerId}`);
    const header = addPiModalHeader(this, new DynamicBorder(paintPiBorder), loginText(heading, "accent", true));
    this.addChild(this.#content);
    this.addChild(new Spacer(1));
    this.addChild({
      render: width => loginText(() => renderPiModalShortcutHints([DIALOG_CLOSE_SHORTCUT_HINT])).render(width),
      invalidate() {},
    });
    this.addChild(new DynamicBorder(paintPiBorder));
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
    this.#input.onSubmit = value => {
      const pending = this.#pending;
      if (pending === undefined || this.#closed) return;
      this.#pending = undefined;
      this.#content.children = this.#content.children.map(child => child === this.#inputView
        ? { render: width => loginText(() => `${piTheme().fg("accent", ">")} ${piTheme().fg("text", loginPlainText(value))}`).render(width), invalidate() {} }
        : child);
      pending.resolve(value);
      this.#runtime.requestRender();
    };
    this.#input.onEscape = () => this.#cancel();
  }

  readonly #inputView: Component = {
    render: width => renderPiModalSearchInput(this.#input, width),
    invalidate: () => this.#input.invalidate(),
  };

  get focused(): boolean { return this.#focused; }
  set focused(value: boolean) { this.#focused = value; this.#input.focused = value; }

  showAuth(url: string, instructions?: string): void {
    if (this.#closed) return;
    this.#clearContent();
    if (instructions) this.#content.addChild(loginText(instructions));
    else this.#content.addChild(loginText("Continue in your browser"));
    this.#content.addChild(new Spacer(1));
    this.#auth = new AuthUrlComponent(url, () => { if (!this.#closed) this.#runtime.requestRender(); });
    this.#content.addChild(this.#auth);
    openLoginBrowser(url);
    this.#runtime.requestRender();
  }

  showDeviceCode(info: DeviceCode): void {
    if (this.#closed) return;
    this.#clearContent();
    this.#content.addChild(loginText("Continue in your browser"));
    this.#content.addChild(new Spacer(1));
    this.#content.addChild(loginText(() => loginLink(info.verificationUri), "accent"));
    const click = process.platform === "darwin" ? "Cmd+click to open" : "Ctrl+click to open";
    this.#content.addChild(loginText(() => loginLink(info.verificationUri, click), "dim"));
    this.#content.addChild(new Spacer(1));
    this.#content.addChild(loginText(`Enter code: ${info.userCode}`, "warning"));
    const hint = new Container();
    hint.addChild({ render: width => loginText(() => renderPiModalShortcutHints([{ key: getKeybindings().getKeys("tui.select.confirm").join("/"), action: "open browser and copy code" }])).render(width), invalidate() {} });
    this.#content.addChild(hint);
    this.#device = { info, hint };
    this.#deviceHint = hint;
    this.#runtime.requestRender();
  }

  showManualInput(message: string): Promise<string> { return this.showPrompt(message); }

  showPrompt(message: string, placeholder?: string): Promise<string> {
    if (this.#closed) return Promise.reject(new Error("Login cancelled"));
    this.#clearDevice();
    const context = [...this.#content.children];
    // Invariant: the current description is directly under the title; retained auth context follows input.
    this.#content.clear();
    this.#content.addChild(loginText(message));
    if (placeholder) this.#content.addChild(loginText(`e.g., ${placeholder}`, "dim"));
    this.#content.addChild(new Spacer(1));
    this.#input.setValue("");
    this.#content.addChild(this.#inputView);
    if (context.length > 0) { this.#content.addChild(new Spacer(1)); for (const child of context) this.#content.addChild(child); }
    this.#runtime.requestRender();
    return new Promise((resolve, reject) => { this.#pending = { resolve, reject }; });
  }

  showDetails(lines: readonly string[]): void {
    if (this.#closed) return;
    this.#clearContent();
    for (const line of lines) this.#content.addChild(loginText(line));
    this.#runtime.requestRender();
  }

  showInfo(message: string, links: readonly { readonly label?: string; readonly url: string }[] = []): void {
    if (this.#closed) return;
    this.#appendDescription(message);
    for (const link of links) this.#content.addChild(loginText(() => loginLink(link.url, link.label ? `${link.label}: ${loginWebUrl(link.url) ?? link.url}` : undefined), "accent"));
    this.#runtime.requestRender();
  }

  showWaiting(message: string): void { if (!this.#closed) { this.#appendDescription(message); this.#runtime.requestRender(); } }
  showProgress(message: string): void { if (!this.#closed) { this.#content.addChild(loginText(message)); this.#runtime.requestRender(); } }

  handleInput(data: string): void {
    if (this.#closed) return;
    const keys = getKeybindings();
    if (keys.matches(data, "tui.select.cancel")) { this.#cancel(); return; }
    if (this.#auth !== undefined && keys.matches(data, "app.message.copy")) { void this.#auth.copy(); return; }
    if (this.#device !== undefined && this.#pending === undefined && this.#focused && keys.matches(data, "tui.select.confirm")) {
      const { info, hint } = this.#device;
      this.#device = undefined;
      hint.clear(); hint.addChild(loginText("Copying code...", "dim"));
      openLoginBrowser(info.verificationUri);
      void copyToClipboard(info.userCode).then(() => this.#deviceStatus(hint, "Code copied to clipboard"), () => this.#deviceStatus(hint, "Copy code manually"));
      this.#runtime.requestRender();
      return;
    }
    this.#input.handleInput(data);
  }

  dispose(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#abort.abort(); this.#auth?.dispose();
    this.#pending?.reject(new Error("Login cancelled")); this.#pending = undefined;
  }

  #cancel(): void { this.dispose(); this.#complete(false, "Login cancelled"); }
  #appendDescription(message: string): void {
    if (this.#content.children.length > 0) this.#content.addChild(new Spacer(1));
    this.#content.addChild(loginText(message));
  }
  #clearDevice(): void {
    if (this.#deviceHint !== undefined) this.#content.removeChild(this.#deviceHint);
    this.#deviceHint = undefined;
    this.#device = undefined;
  }
  #clearContent(): void {
    this.#clearDevice(); this.#auth?.dispose(); this.#auth = undefined; this.#content.clear();
  }
  #deviceStatus(hint: Container, message: string): void {
    if (this.#closed || !this.#focused || !this.#content.children.includes(hint)) return;
    hint.clear(); hint.addChild(loginText(message, "dim")); this.#runtime.requestRender();
  }
}

/** One owned login port for every provider, keeping all state methods on the shared template. */
export function createThemedLoginDialog(runtime: OwnedUiShellRuntime, providerId: string, complete: (success: boolean, message?: string) => void, providerName?: string, title?: string): OwnedUiShellLoginDialogPort {
  const dialog = new LoginDialog(runtime, providerId, complete, providerName, title);
  return {
    ...componentPort(dialog),
    showAuth: (url, instructions) => dialog.showAuth(url, instructions),
    showDeviceCode: info => dialog.showDeviceCode(info),
    showManualInput: message => dialog.showManualInput(message),
    showPrompt: (message, placeholder) => dialog.showPrompt(message, placeholder),
    showDetails: lines => dialog.showDetails(lines),
    showInfo: (message, links) => dialog.showInfo(message, links),
    showWaiting: message => dialog.showWaiting(message),
    showProgress: message => dialog.showProgress(message),
  };
}
