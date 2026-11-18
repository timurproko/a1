import { stripTerminalSequences, visibleWidth, type Component, type TuiMouseEvent, type TuiMouseEventResult } from "@earendil-works/pi-tui";
import type { DialogPointer } from "../../../ui/components/index.js";
import { piTheme, paintPiDialogHover, renderPiModalListRow } from "./theme.js";

/** A semantic choice owns only its text hit span, never the keyboard selection. */
export class PiDialogChoice implements Component {
  #hovered = false;
  #width = 0;
  #textEnd = 0;
  readonly #render: (hovered: boolean, width: number) => string;
  readonly #activate: () => void;
  readonly #selected: boolean;
  readonly #textStart: number;

  constructor(render: (hovered: boolean, width: number) => string, selected: boolean, activate: () => void, textStart = 2) {
    this.#render = render; this.#selected = selected; this.#activate = activate; this.#textStart = textStart;
  }

  render(width: number): string[] {
    if (width !== this.#width) this.#hovered = false;
    this.#width = width;
    const content = this.#render(this.#hovered, width);
    this.#textEnd = Math.min(width, visibleWidth(stripTerminalSequences(content).trimEnd()));
    return [renderPiModalListRow(content, width, this.#selected)];
  }

  handleMouse(event: TuiMouseEvent): TuiMouseEventResult {
    if (event.type === "wheel") return { handled: true, render: false };
    const inside = event.y === 0 && event.x >= this.#textStart && event.x < this.#textEnd;
    const changed = this.#hovered !== inside;
    this.#hovered = inside;
    if (inside && event.type === "press" && event.button === "left") this.#activate();
    return { handled: true, render: changed };
  }

  clearMouseHover(): void { this.#hovered = false; }
  invalidate(): void { this.#textEnd = 0; this.clearMouseHover(); }
}

/** Preserve each semantic foreground while applying the shared text-only blend. */
export function paintPiDialogText(hovered: boolean, token: Parameters<ReturnType<typeof piTheme>["fg"]>[0], text: string): string {
  return hovered ? paintPiDialogHover(token, text) : piTheme().fg(token, text);
}

/** Adapt native composed-list coordinates to the shared pointer-only semantic target state. */
export function handlePiDialogPointer<Key>(pointer: DialogPointer<Key>, event: TuiMouseEvent): Key | undefined {
  if (event.type === "wheel" || event.type === "click") return undefined;
  return pointer.handle({ kind: event.type === "move" || event.type === "drag" ? "motion" : event.type,
    button: event.button === "left" ? 0 : event.button === "middle" ? 1 : event.button === "right" ? 2 : 3,
    column: event.x + 1, row: event.y + 1 });
}

