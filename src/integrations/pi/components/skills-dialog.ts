import { DynamicBorder } from "../startup-public.js";
import { Container, getKeybindings, Input, Spacer, Text } from "@earendil-works/pi-tui";
import { PINNED_PI_LAYOUT, piTheme, renderPiModalShortcutHints } from "./theme.js";
import { componentPort, ensureTheme, piShellTruncateToWidth, piShellVisibleWidth, type PiShellComponentPort } from "./shell-shared-facade.js";
import { SKILL_COMMAND_PREFIX, skillMatchesQuery, type PiShellSkillSummary } from "./skills-command.js";

export interface PiShellSkillsSelectorOptions {
  /** The skills the engine registered, in its discovery order. */
  readonly skills: readonly PiShellSkillSummary[];
  readonly onSelect: (name: string) => void;
  readonly onCancel: () => void;
}

/** A single line clipped at the viewport width: no wrap, no ellipsis, padded to the full width. */
class ClippedLine {
  readonly #text: string;
  constructor(text: string) { this.#text = text; }
  invalidate(): void {}
  render(width: number): string[] {
    const line = piShellTruncateToWidth(this.#text.split("\n", 1)[0] ?? "", width);
    return [line + " ".repeat(Math.max(0, width - piShellVisibleWidth(line)))];
  }
}

/**
 * The A1-owned searchable Skills dialog. Its composition is the model selector's (border, spacer,
 * search input, spacer, list, spacer, hint footer, border) built from public pi-tui components; its
 * content follows the v2 skills extension: an accent bold title, `skill:<name>` rows, the selected
 * skill's description cut to one line under the rows, the pinned scroll counter on overflow,
 * and the two empty states. Enter applies the selected skill with no arguments; the query is never appended.
 */
class SkillsSelectorComponent extends Container {
  readonly #searchInput = new Input();
  readonly #listContainer = new Container();
  readonly #skills: readonly PiShellSkillSummary[];
  readonly #onSelect: (name: string) => void;
  readonly #onCancel: () => void;
  #filtered: readonly PiShellSkillSummary[];
  #selectedIndex = 0;
  #focused = false;

  constructor(options: PiShellSkillsSelectorOptions) {
    super();
    this.#skills = options.skills;
    this.#filtered = options.skills;
    this.#onSelect = options.onSelect;
    this.#onCancel = options.onCancel;
    this.#searchInput.onSubmit = () => this.#selectCurrent();
    this.addChild(new DynamicBorder());
    this.addChild(new Spacer(1));
    this.addChild(new Text(piTheme().fg("accent", piTheme().bold("Skills")), 0, 0));
    this.addChild(new Spacer(1));
    this.addChild(this.#searchInput);
    this.addChild(new Spacer(1));
    this.addChild(this.#listContainer);
    this.addChild(new Spacer(1));
    const bindings = getKeybindings();
    this.addChild(new Text(renderPiModalShortcutHints([
      { key: "↑↓", action: "navigate" },
      { key: bindings.getKeys("tui.select.confirm").join("/"), action: "select" },
      { key: bindings.getKeys("tui.select.cancel").join("/"), action: "cancel" },
    ]), 0, 0));
    this.addChild(new DynamicBorder());
    this.#updateList();
  }

  // Protocol: focus propagates to the search input so the terminal cursor follows the query.
  get focused(): boolean { return this.#focused; }
  set focused(value: boolean) {
    this.#focused = value;
    this.#searchInput.focused = value;
  }

  handleInput(data: string): void {
    const keybindings = getKeybindings();
    if (keybindings.matches(data, "tui.select.up")) {
      if (this.#filtered.length === 0) return;
      this.#selectedIndex = this.#selectedIndex === 0 ? this.#filtered.length - 1 : this.#selectedIndex - 1;
      this.#updateList();
    } else if (keybindings.matches(data, "tui.select.down")) {
      if (this.#filtered.length === 0) return;
      this.#selectedIndex = this.#selectedIndex === this.#filtered.length - 1 ? 0 : this.#selectedIndex + 1;
      this.#updateList();
    } else if (keybindings.matches(data, "tui.select.confirm")) {
      this.#selectCurrent();
    } else if (keybindings.matches(data, "tui.select.cancel")) {
      this.#onCancel();
    } else {
      const before = this.#searchInput.getValue();
      this.#searchInput.handleInput(data);
      const query = this.#searchInput.getValue();
      if (query === before) return;
      this.#filtered = this.#skills.filter(skill => skillMatchesQuery(skill, query));
      this.#selectedIndex = 0;
      this.#updateList();
    }
  }

  #selectCurrent(): void {
    const selected = this.#filtered[this.#selectedIndex];
    if (selected !== undefined) this.#onSelect(selected.name);
  }

  #updateList(): void {
    this.#listContainer.clear();
    const theme = piTheme();
    if (this.#filtered.length === 0) {
      this.#listContainer.addChild(new Text(theme.fg("muted", this.#skills.length === 0 ? "  No skills yet" : "  No matching skills"), 0, 0));
      return;
    }
    const maxVisible = PINNED_PI_LAYOUT.selectorMaxVisible;
    const start = Math.max(0, Math.min(this.#selectedIndex - Math.floor(maxVisible / 2), this.#filtered.length - maxVisible));
    const end = Math.min(start + maxVisible, this.#filtered.length);
    for (let index = start; index < end; index++) {
      const skill = this.#filtered[index]!;
      const selected = index === this.#selectedIndex;
      const label = `${SKILL_COMMAND_PREFIX}${skill.name}`;
      this.#listContainer.addChild(new Text(`${selected ? theme.fg("accent", "→ ") : "  "}${selected ? theme.fg("accent", label) : label}`, 0, 0));
    }
    if (start > 0 || end < this.#filtered.length) {
      this.#listContainer.addChild(new Text(theme.fg("muted", `  (${this.#selectedIndex + 1}/${this.#filtered.length})`), 0, 0));
    }
    const description = this.#filtered[this.#selectedIndex]?.description ?? "";
    if (description.length > 0) {
      this.#listContainer.addChild(new Spacer(1));
      // Invariant: the description never wraps; it is cut at the viewport width with no ellipsis.
      this.#listContainer.addChild(new ClippedLine(theme.fg("muted", `  ${description}`)));
    }
  }
}

export function createPiShellSkillsSelector(options: PiShellSkillsSelectorOptions): PiShellComponentPort {
  ensureTheme();
  return componentPort(new SkillsSelectorComponent(options));
}
