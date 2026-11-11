/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.2 (MIT), commit b4afdddf44e059c67ccf5097e5317d913521b470,
 * packages/coding-agent/src/modes/interactive/components/auth-url.ts.
 * Modifications: Adapt sign-in URL/copy feedback to live semantic roles, shared zero-inset login
 * content and canonical shortcut hints. Preserve safe hyperlinks, copy results and lifetime guards;
 * the comparison profile keeps the public component.
 * Deviations: shared-login-template.
 */
import { Container, getKeybindings } from "@earendil-works/pi-tui";
import { copyToClipboard } from "../../../startup-public.js";
import { loginLink, loginWebUrl } from "../../login-links.js";
import { loginText } from "../../login-text.js";
import { renderPiModalShortcutHints } from "../../theme.js";

/** A live-themed browser URL whose copy feedback stays local to the same login state. */
export class AuthUrlComponent extends Container {
  readonly #url: string;
  readonly #render: () => void;
  #feedback: "copied" | "failed" | undefined;
  #failure = "";
  #closed = false;

  constructor(url: string, requestRender: () => void) {
    super();
    this.#url = loginWebUrl(url) ?? url;
    this.#render = requestRender;
    this.addChild(loginText(() => loginLink(this.#url), "accent"));
    this.addChild({
      render: width => {
        if (this.#feedback !== undefined) return loginText(this.#feedback === "copied" ? "Copied URL to clipboard" : this.#failure, this.#feedback === "copied" ? "success" : "error").render(width);
        const click = process.platform === "darwin" ? "Cmd+click to open" : "Ctrl+click to open";
        return loginText(() => `${loginLink(this.#url, click)}  ${renderPiModalShortcutHints([{ key: getKeybindings().getKeys("app.message.copy").join("/"), action: "copy" }])}`).render(width);
      },
      invalidate() {},
    });
  }

  async copy(): Promise<void> {
    try { await copyToClipboard(this.#url); this.#feedback = "copied"; }
    catch (error) { this.#feedback = "failed"; this.#failure = error instanceof Error ? error.message : String(error); }
    if (!this.#closed) this.#render();
  }

  dispose(): void { this.#closed = true; }
}
