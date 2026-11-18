import {
  scrollbarGeometry, scrollbarWheelRows, withScrollbarRail,
  type DialogChoiceLayout, type DialogChoicePresentation, type DialogRow,
  type PaneMouseEvent, type PaneRect, type ScrollbarAppearance, type ScrollbarSpeed, type ScrollbarStyle, type UiTheme,
} from "../../ui/components/index.js";
import { SettingsScrollRail } from "./settings-scroll-rail.js";
import type { StructuredEdit } from "./settings-configure-state.js";

export interface SettingsDialogScrollOptions {
  readonly appearance: ScrollbarAppearance;
  readonly style: ScrollbarStyle;
  readonly speed: ScrollbarSpeed;
  readonly requestRender: () => void;
}

/** A configure list scrolls independently from its keyboard-active item using the shared Settings rail. */
export class SettingsDialogList {
  #rail = new SettingsScrollRail();
  #scroll = 0;
  #total = 0;
  #height = 0;
  #lastIndex: number | undefined;
  #captured = false;
  #cells: readonly string[] = [];
  #context: { owner: StructuredEdit; key: string; geometry: string; options: SettingsDialogScrollOptions; theme: UiTheme } | undefined;

  get held(): boolean { return this.#captured; }

  begin(owner: StructuredEdit, rect: PaneRect, theme: UiTheme, options: SettingsDialogScrollOptions): void {
    const key = `${owner.step}/${owner.modelKey ?? ""}/${owner.filter?.value ?? ""}`;
    const geometry = `${rect.width}/${rect.height}`;
    if (this.#context?.owner !== owner || this.#context.key !== key) {
      this.#rail.dispose(); this.#rail = new SettingsScrollRail();
      this.#scroll = 0; this.#lastIndex = undefined; this.#captured = false;
      owner.pointer.invalidate();
    } else if (this.#context.geometry !== geometry) {
      this.cancelPointer(); this.#lastIndex = undefined;
      owner.pointer.invalidate();
    } else if (this.#context.options.appearance !== options.appearance || this.#context.options.style !== options.style) this.cancelPointer();
    this.#context = { owner, key, geometry, options, theme };
  }

  project(rows: readonly DialogRow[], index: number, maximum: number): { readonly rows: readonly DialogRow[]; readonly index: number } {
    this.#total = rows.length;
    this.#height = Math.min(rows.length, Math.max(1, Math.min(10, maximum)));
    this.#scroll = Math.max(0, Math.min(this.#scroll, this.#total - this.#height));
    if (this.#lastIndex !== index) {
      if (index < this.#scroll) this.#scroll = Math.max(0, index);
      else if (index >= this.#scroll + this.#height) this.#scroll = Math.max(0, index - this.#height + 1);
      this.#scroll = Math.min(this.#scroll, Math.max(0, this.#total - this.#height));
      this.#lastIndex = index;
    }
    return { rows: rows.slice(this.#scroll, this.#scroll + this.#height), index: index - this.#scroll };
  }

  presentation(): DialogChoicePresentation {
    return {
      onChoiceLayout: layout => this.#layout(layout),
      ...(this.#context?.options.appearance === "hidden" ? {} : { choiceRail: (row: number) => this.#cells[row] ?? "  " }),
    };
  }

  pointer(event: PaneMouseEvent): { readonly owned: boolean; readonly render: boolean } {
    if (this.#context === undefined) return { owned: false, render: false };
    if (event.kind === "wheel-up" || event.kind === "wheel-down") {
      const distance = scrollbarWheelRows(this.#context.options.speed);
      return { owned: true, render: this.#move(this.#scroll + (event.kind === "wheel-down" ? distance : -distance)) };
    }
    const primary = event.kind === "press" && event.button === 0;
    const report = event.kind === "press" && !primary ? { ...event, kind: "motion" as const } : event;
    const rail = this.#rail.pointer(report, this.#scroll);
    if (primary && rail.owned) this.#captured = true;
    const owned = rail.owned || this.#captured;
    if (event.kind === "release") this.#captured = false;
    const moved = rail.scroll === undefined ? false : this.#move(rail.scroll);
    if (owned || rail.overRail) this.#context.owner.pointer.clearHover();
    return { owned, render: rail.changed || moved };
  }

  cancelPointer(): void { this.#captured = false; this.#rail.clear(); this.#rail.setFrame(null); }
  dispose(): void { this.#rail.dispose(); this.#context = undefined; this.#captured = false; this.#cells = []; }

  #move(scroll: number): boolean {
    const next = Math.max(0, Math.min(scroll, Math.max(0, this.#total - this.#height)));
    if (next === this.#scroll) return false;
    this.#scroll = next;
    this.#context?.owner.pointer.invalidate();
    return true;
  }

  #layout(layout: DialogChoiceLayout): void {
    const context = this.#context;
    if (context === undefined) return;
    const { options, theme } = context;
    const geometry = scrollbarGeometry({ contentLength: this.#total, viewportHeight: this.#height, scroll: this.#scroll, trackHeight: layout.rows });
    const now = Date.now();
    this.#rail.noteRenderedScroll(this.#scroll, now, options.requestRender);
    const presentation = this.#rail.presentation({ geometry, appearance: options.appearance, style: options.style, now });
    this.#rail.setFrame(presentation.reservesSpace && geometry !== null ? {
      rail: { column: layout.railColumn, rowStart: layout.firstRow - 1, trackHeight: layout.rows }, geometry, page: this.#height,
    } : null);
    this.#cells = withScrollbarRail(Array.from({ length: layout.rows }, () => ""), geometry, 0, theme, { presentation });
  }
}
