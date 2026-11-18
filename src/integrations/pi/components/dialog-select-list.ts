import { Container, SelectList, truncateToWidth, visibleWidth, type SelectItem, type Component } from "@earendil-works/pi-tui";
import { PiDialogChoice, paintPiDialogText } from "./dialog-choice.js";
import { piTheme } from "./theme.js";

/** Owned presentation over a public keyboard SelectList; mouse activation never steers that controller. */
export class PiOwnedSelectList extends Container {
  #selection: string | undefined;
  readonly #list: SelectList;
  readonly #items: readonly SelectItem[];
  readonly #maximum: number;
  readonly #paint: ((item: SelectItem, selected: boolean, hovered: boolean, width: number) => string) | undefined;
  readonly #afterChoice: ((item: SelectItem) => readonly Component[]) | undefined;

  constructor(list: SelectList, items: readonly SelectItem[], maximum: number,
    paint?: (item: SelectItem, selected: boolean, hovered: boolean, width: number) => string,
    afterChoice?: (item: SelectItem) => readonly Component[]) {
    super(); this.#list = list; this.#items = items; this.#maximum = maximum; this.#paint = paint; this.#afterChoice = afterChoice;
  }

  render(width: number): string[] {
    const selected = this.#list.getSelectedItem()?.value;
    if (selected !== this.#selection || this.children.length === 0) {
      this.clear(); this.#selection = selected;
      const index = Math.max(0, this.#items.findIndex(item => item.value === selected));
      const start = Math.max(0, Math.min(index - Math.floor(this.#maximum / 2), this.#items.length - this.#maximum));
      const end = Math.min(start + this.#maximum, this.#items.length);
      for (const item of this.#items.slice(start, end)) {
        const active = item.value === selected;
        this.addChild(new PiDialogChoice((hovered, columns) => {
          if (this.#paint !== undefined) return this.#paint(item, active, hovered, columns);
          const prefix = active ? piTheme().fg("accent", "→ ") : "  ";
          const description = item.description?.replace(/\s+/gu, " ");
          const primaryWidth = Math.max(1, Math.min(32, columns - 6));
          const hasDescription = description !== undefined && columns > 40 && columns - primaryWidth - 4 > 10;
          const label = truncateToWidth(item.label || item.value, Math.max(0, hasDescription ? primaryWidth - 2 : columns - 4), "");
          const suffix = hasDescription ? " ".repeat(Math.max(1, primaryWidth - visibleWidth(label))) + truncateToWidth(description, columns - primaryWidth - 4, "") : "";
          return prefix + paintPiDialogText(hovered, "text", label) + paintPiDialogText(hovered, "muted", suffix);
        }, active, () => this.#list.onSelect?.(item)));
        for (const component of this.#afterChoice?.(item) ?? []) this.addChild(component);
      }
      if (this.#items.length === 0) this.addChild({ render: columns => [piTheme().fg("muted", truncateToWidth("  No matching commands", columns, ""))], invalidate() {} });
      if (start > 0 || end < this.#items.length) this.addChild({ render: columns => [piTheme().fg("muted", truncateToWidth(`  (${index + 1}/${this.#items.length})`, columns, ""))], invalidate() {} });
    }
    return super.render(width);
  }
}
