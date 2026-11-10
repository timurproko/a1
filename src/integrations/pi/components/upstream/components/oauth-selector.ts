/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.1 (MIT), commit dd30101cfc5b0609411dd80b6f93adbc14db14cf,
 * packages/coding-agent/src/modes/interactive/components/oauth-selector.ts.
 * Modifications: Adapt the provider controller to injected neutral options, shared framing, live
 * roles, Title Case and circular navigation. Configured status uses a muted dot, success-green
 * configured text and trailing checkmark without method/source qualifiers. Omit decorative
 * preferred-partner badges while retaining filtering, paging, actions and comparison presentation.
 * Deviations: standard-sign-in-dialog-styling.
 */
import { Container, fuzzyFilter, getKeybindings, getSelectPageIndex, Input, Spacer, Text, TruncatedText } from "@earendil-works/pi-tui";
import { wrapChoiceIndex } from "../../../../../contracts/presentation/index.js";
import type { OwnedUiShellAuthProviderOption as Provider } from "../../../../../contracts/owned-ui/index.js";
import { DynamicBorder } from "../../../startup-public.js";
import { addPiModalHeader, addPiModalSearchInput, adoptPiModalFrame } from "../../modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, paintPiBorder, piTheme, renderPiModalListRow, renderPiModalShortcutHints } from "../../theme.js";

const MAX_VISIBLE = 8;

/** Owned provider controller with pinned content/status semantics and circular choice navigation. */
export class AuthProviderSelector extends Container {
  readonly #search = new Input();
  readonly #list = new Container();
  readonly #providers: readonly Provider[];
  readonly #select: (id: string) => void;
  readonly #cancel: () => void;
  readonly #showTypes: boolean;
  readonly #mode: "login" | "logout";
  #filtered: readonly Provider[];
  #index = 0;

  constructor(mode: "login" | "logout", providers: readonly Provider[], select: (id: string) => void, cancel: () => void, query = "") {
    super();
    this.#providers = providers;
    this.#filtered = providers;
    this.#select = select;
    this.#cancel = cancel;
    this.#mode = mode;
    this.#showTypes = new Set(providers.map(provider => provider.authType)).size > 1;
    this.#search.setValue(query);
    this.#search.onSubmit = () => this.#selectCurrent();
    const title = mode === "login" ? "Select Provider to Configure" : "Select Provider to Log Out";
    const header = addPiModalHeader(this, new DynamicBorder(paintPiBorder), {
      render: width => new TruncatedText(piTheme().fg("accent", piTheme().bold(title)), 0, 0).render(width),
      invalidate: () => {},
    });
    this.addChild(new Spacer(1));
    addPiModalSearchInput(this, this.#search);
    this.addChild(new Spacer(1));
    this.addChild(this.#list);
    this.addChild(new Spacer(1));
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: getKeybindings().getKeys("tui.select.confirm").join("/"), action: "select" },
      DIALOG_CLOSE_SHORTCUT_HINT,
    ]), 0, 0));
    this.addChild(new DynamicBorder(paintPiBorder));
    adoptPiModalFrame(this, { topIndex: 0, bottomIndex: this.children.length - 1, header });
    this.#filter();
  }

  get focused(): boolean { return this.#search.focused; }
  set focused(value: boolean) { this.#search.focused = value; }

  handleInput(data: string): void {
    const keys = getKeybindings();
    const page = getSelectPageIndex(keys, data, this.#index, this.#filtered.length, MAX_VISIBLE);
    if (keys.matches(data, "tui.select.up") || keys.matches(data, "tui.select.down")) {
      this.#index = wrapChoiceIndex(this.#index, keys.matches(data, "tui.select.down") ? 1 : -1, this.#filtered.length);
    } else if (page !== undefined) this.#index = page;
    else if (keys.matches(data, "tui.select.confirm")) { this.#selectCurrent(); return; }
    else if (keys.matches(data, "tui.select.cancel")) { this.#cancel(); return; }
    else { this.#search.handleInput(data); this.#filter(); return; }
    this.#update();
  }

  #selectCurrent(): void {
    const provider = this.#filtered[this.#index];
    if (provider !== undefined) this.#select(provider.id);
  }

  #filter(): void {
    const query = this.#search.getValue();
    this.#filtered = query ? fuzzyFilter([...this.#providers], query, provider => `${provider.label} ${provider.providerId} ${provider.authType} `) : this.#providers;
    this.#index = Math.min(this.#index, Math.max(0, this.#filtered.length - 1));
    this.#update();
  }

  #update(): void {
    this.#list.clear();
    const start = Math.max(0, Math.min(this.#index - Math.floor(MAX_VISIBLE / 2), this.#filtered.length - MAX_VISIBLE));
    const end = Math.min(start + MAX_VISIBLE, this.#filtered.length);
    for (let index = start; index < end; index++) {
      const provider = this.#filtered[index]!;
      const selected = index === this.#index;
      this.#list.addChild({
        render: width => {
          const theme = piTheme();
          const prefix = selected ? theme.fg("accent", "→ ") : "  ";
          const type = this.#showTypes ? theme.fg("muted", ` [${provider.authType === "api_key" ? "API key" : "subscription"}]`) : "";
          return [renderPiModalListRow(`${prefix}${theme.fg("text", provider.label)}${type}${providerStatus(provider)}`, width, selected)];
        },
        invalidate: () => {},
      });
    }
    if (start > 0 || end < this.#filtered.length) this.#list.addChild(new TruncatedText(piTheme().fg("muted", `  (${this.#index + 1}/${this.#filtered.length})`), 0, 0));
    if (this.#filtered.length === 0) {
      const empty = this.#mode === "login" ? "No providers available" : "No providers logged in. Use /login first.";
      this.#list.addChild(new TruncatedText(piTheme().fg("muted", `  ${this.#providers.length === 0 ? empty : "No matching providers"}`), 0, 0));
    }
  }
}

function providerStatus(provider: Provider): string {
  const theme = piTheme();
  const separator = theme.fg("muted", " • ");
  if (provider.status === undefined) return separator + theme.fg("muted", "not configured");
  return separator + theme.fg("success", "configured ✓");
}
