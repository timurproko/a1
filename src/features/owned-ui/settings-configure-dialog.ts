import {
  centeredDialogBounds, configureDialogChoiceCapacity, configureDialogTextRows, configureDialogWidth,
  humanizeLabel, renderCenteredDialogOverlay, renderDialogPanel,
  type PaneMouseEvent, type PaneRect, type ShortcutHintEntry, type UiTheme,
} from "../../ui/components/index.js";
import { SettingsDialogList, type SettingsDialogScrollOptions } from "./settings-dialog-list.js";
import { modelDialogLines, type StructuredEdit } from "./settings-model-dialog.js";

interface PointerResult { readonly consumed: true; readonly render: boolean; readonly clicked?: number }

/** The configure panel's painted geometry and gesture ownership, independent from setting writes. */
export class SettingsConfigureDialog {
  open: StructuredEdit | null = null;
  #frame: (ReturnType<typeof centeredDialogBounds> & { readonly owner: StructuredEdit; readonly screenWidth: number; readonly screenHeight: number }) | null = null;
  #draining = false;
  readonly #list = new SettingsDialogList();

  invalidate(): void {
    if (this.#list.held) this.#draining = true;
    this.#list.cancelPointer(); this.open?.pointer.invalidate(); this.#frame = null;
  }
  dispose(): void { this.#list.dispose(); this.open = null; this.#frame = null; this.#draining = false; }

  render(frame: readonly string[], rect: PaneRect, theme: UiTheme, title: string, hint: readonly ShortcutHintEntry[], scroll: SettingsDialogScrollOptions): readonly string[] {
    const open = this.open;
    if (open === null) { this.#list.dispose(); this.#frame = null; return frame; }
    if (this.#frame?.owner !== open || this.#frame.screenWidth !== rect.width || this.#frame.screenHeight !== rect.height) this.invalidate();
    this.#list.begin(open, rect, theme, scroll);
    const dialog = configureLines(open, title, hint, configureDialogWidth(rect.width), Math.min(20, rect.height), theme, this.#list);
    this.#frame = { ...centeredDialogBounds(rect, dialog.length), owner: open, screenWidth: rect.width, screenHeight: rect.height };
    return renderCenteredDialogOverlay(frame, dialog, rect, theme);
  }

  pointer(event: PaneMouseEvent, size: PaneRect): PointerResult | null {
    if (this.#draining) {
      if (event.kind === "release") this.#draining = false;
      return { consumed: true, render: false };
    }
    const open = this.open;
    if (open === null) return null;
    const frame = this.#frame;
    if (frame === null || frame.owner !== open) return { consumed: true, render: false };
    if (size.width !== frame.screenWidth || size.height !== frame.screenHeight) {
      this.invalidate();
      return { consumed: true, render: true };
    }
    const inside = event.column > frame.left && event.column <= frame.left + frame.width
      && event.row > frame.top && event.row <= frame.top + frame.height;
    const local = { ...event, column: event.column - frame.left, row: event.row - frame.top };
    const wheel = event.kind === "wheel-up" || event.kind === "wheel-down";
    const rail = this.#list.pointer(wheel && !inside && !this.#list.held ? { ...local, kind: "motion" } : local);
    if (rail.owned) return { consumed: true, render: rail.render };
    if (wheel) return null;
    if (!inside && event.kind === "press" && event.button === 0) {
      this.invalidate(); this.open = null; this.#draining = true;
      return { consumed: true, render: true };
    }
    const before = open.pointer.hovered;
    const clicked = open.pointer.handle(local);
    if (clicked !== undefined && inside) {
      const index = clicked + open.windowStart;
      this.invalidate();
      return { consumed: true, render: true, clicked: index };
    }
    return { consumed: true, render: rail.render || before !== open.pointer.hovered };
  }
}

function configureLines(open: StructuredEdit, title: string, hint: readonly ShortcutHintEntry[], width: number, height: number, theme: UiTheme, list: SettingsDialogList): readonly string[] {
  if (open.modelDialog !== null) return modelDialogLines(open, width, height, theme, list);
  const rows = open.flags.map(key => {
    const declared = open.entry.flags.find(flag => flag.key === key);
    return {
      label: declared?.label ?? humanizeLabel(key),
      value: declared?.choices === undefined ? ((open.record[key] ?? false) ? "true" : "false") : String(open.record[key] ?? declared.fallback),
      ...(declared?.description === undefined ? {} : { description: declared.description }),
    };
  });
  const description = rows[open.index]?.description ?? "";
  const visible = list.project(rows, open.index, configureDialogChoiceCapacity(height, false, configureDialogTextRows(description, width)));
  open.windowStart = open.index - visible.index;
  return renderDialogPanel({ title, description, compact: height < 8, rows: visible.rows, index: visible.index, pointer: open.pointer, hint, ...list.presentation() }, width, theme);
}
