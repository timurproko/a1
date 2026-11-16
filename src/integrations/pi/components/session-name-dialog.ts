import { DynamicBorder } from "@earendil-works/pi-coding-agent";
import { CURSOR_MARKER, Spacer, Text, decodeKittyPrintable, getKeybindings, matchesKey, renderFakeCursor, truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import type { OwnedUiShellComponentPort, OwnedUiShellExtensionUiBridgeHost } from "../../../contracts/owned-ui/index.js";
import { dialogFrameGeometry } from "../../../contracts/presentation/index.js";
import { paintTextSelection, wordLeft, wordRight } from "../../../ui/components/index.js";
import { BracketedPasteFramer, PASTE_START } from "./bracketed-paste.js";
import { PiModalFrame } from "./modal-frame.js";
import { DIALOG_CLOSE_SHORTCUT_HINT, paintPiBorder, piTheme, renderPiModalShortcutHints } from "./theme.js";

type Mouse = Parameters<NonNullable<OwnedUiShellComponentPort["handleLocalMouse"]>>[0];
type Clipboard = Pick<OwnedUiShellExtensionUiBridgeHost, "onCopyText" | "readClipboardContent">;
interface Snapshot { readonly value: string; readonly caret: number; readonly anchor: number | undefined }
interface NameDialogPorts extends Clipboard {
  readonly submit: (value: string) => void;
  readonly cancel: () => void;
  readonly requestRender: () => void;
}
const MAX_LENGTH = 4_096;
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const DELETE_ACTIONS = ["tui.editor.deleteCharBackward", "tui.editor.deleteCharForward", "tui.editor.deleteWordBackward", "tui.editor.deleteWordForward", "tui.editor.deleteToLineStart", "tui.editor.deleteToLineEnd"] as const;

function singleLine(text: string): string {
  return text.replace(/\r\n|[\r\n\u2028\u2029]/gu, "").replace(/\t/gu, "    ").replace(/[\u0000-\u001f\u007f-\u009f]/gu, "");
}

/** Compact naming surface with prompt-consistent selection, isolated from public extension inputs. */
export class SessionNameDialog implements OwnedUiShellComponentPort {
  readonly #ports: NameDialogPorts;
  readonly #paste = new BracketedPasteFramer(MAX_LENGTH * 4);
  readonly #undo: Snapshot[] = [];
  readonly #reads = new Set<AbortController>();
  #value: string;
  #caret: number;
  #anchor: number | undefined;
  #start = 0;
  #width = 0;
  #inputRow = 4;
  #focused = false;
  #dragging = false;
  #disposed = false;
  #revision = 0;

  constructor(initialValue: string, ports: NameDialogPorts) {
    this.#value = "";
    for (const { segment } of GRAPHEMES.segment(singleLine(initialValue))) {
      if (this.#value.length + segment.length > MAX_LENGTH) break;
      this.#value += segment;
    }
    this.#caret = this.#value.length;
    this.#ports = ports;
  }

  invalidate(): void {}
  setFocused(focused: boolean): void { this.#focused = focused; }

  render(width: number): readonly string[] {
    const theme = piTheme();
    const title = new Text(theme.fg("accent", theme.bold("Session Name")), 0, 0);
    const hints = new Text(renderPiModalShortcutHints([
      { key: getKeybindings().getKeys("tui.select.confirm").join("/"), action: "submit" }, DIALOG_CLOSE_SHORTCUT_HINT,
    ]), 0, 0);
    this.#inputRow = title.render(dialogFrameGeometry(width).contentWidth).length + 3;
    return new PiModalFrame(new DynamicBorder(paintPiBorder), [
      title, new Spacer(1), { render: inputWidth => [this.#renderInput(inputWidth)], invalidate() {} }, new Spacer(1), hints,
    ], new DynamicBorder(paintPiBorder)).render(width).map(row => truncateToWidth(row, width, ""));
  }

  handleInput(data: string): void {
    if (this.#disposed) return;
    if (this.#paste.open || data.includes(PASTE_START)) {
      const start = data.indexOf(PASTE_START);
      if (!this.#paste.open && start > 0) this.handleInput(data.slice(0, start));
      if (this.#disposed) return;
      const paste = this.#paste.feed(data);
      if (paste !== undefined) {
        if (!paste.oversized) this.#replace(singleLine(paste.text));
        if (paste.remaining) this.handleInput(paste.remaining);
      }
      return;
    }
    const keys = getKeybindings();
    if (matchesKey(data, "ctrl+a")) {
      this.#anchor = 0;
      this.#caret = this.#value.length;
    } else if (matchesKey(data, "ctrl+c") && this.#selection() !== undefined) {
      this.#copy();
    } else if (keys.matches(data, "tui.select.cancel") || matchesKey(data, "ctrl+c")) {
      this.#ports.cancel();
      return;
    } else if (keys.matches(data, "tui.select.confirm") || data === "\n") {
      this.#ports.submit(this.#value);
      return;
    } else if (matchesKey(data, "ctrl+z")) {
      const previous = this.#undo.pop();
      if (previous !== undefined) {
        this.#value = previous.value;
        this.#caret = previous.caret;
        this.#anchor = previous.anchor;
        this.#start = 0;
      }
    } else if (matchesKey(data, "ctrl+x")) {
      if (this.#selection() !== undefined) { this.#copy(true); this.#replace(""); }
    } else if (matchesKey(data, "ctrl+v")) {
      this.#readClipboard();
      return;
    } else if (matchesKey(data, "shift+left") || matchesKey(data, "shift+right")) {
      this.#anchor ??= this.#caret;
      this.#caret = this.#step(matchesKey(data, "shift+left") ? -1 : 1);
    } else if (keys.matches(data, "tui.editor.cursorLeft") || keys.matches(data, "tui.editor.cursorRight")) {
      const left = keys.matches(data, "tui.editor.cursorLeft");
      const selection = this.#selection();
      this.#caret = selection === undefined ? this.#step(left ? -1 : 1) : left ? selection.from : selection.to;
      this.#anchor = undefined;
    } else if (keys.matches(data, "tui.editor.cursorWordLeft") || keys.matches(data, "tui.editor.cursorWordRight")) {
      this.#caret = keys.matches(data, "tui.editor.cursorWordLeft") ? wordLeft(this.#value, this.#caret) : wordRight(this.#value, this.#caret);
      this.#anchor = undefined;
    } else if (keys.matches(data, "tui.editor.cursorLineStart") || keys.matches(data, "tui.editor.cursorLineEnd")) {
      this.#caret = keys.matches(data, "tui.editor.cursorLineStart") ? 0 : this.#value.length;
      this.#anchor = undefined;
    } else if (DELETE_ACTIONS.some(action => keys.matches(data, action))) {
      if (this.#selection() === undefined) {
        this.#anchor = keys.matches(data, "tui.editor.deleteToLineStart") ? 0
          : keys.matches(data, "tui.editor.deleteToLineEnd") ? this.#value.length
          : keys.matches(data, "tui.editor.deleteWordBackward") ? wordLeft(this.#value, this.#caret)
          : keys.matches(data, "tui.editor.deleteWordForward") ? wordRight(this.#value, this.#caret)
          : this.#step(keys.matches(data, "tui.editor.deleteCharBackward") ? -1 : 1);
      }
      this.#replace("");
    } else {
      const text = decodeKittyPrintable(data) ?? data;
      if (text.length > 0 && !/[\u0000-\u001f\u007f-\u009f]/u.test(text)) this.#replace(singleLine(text));
    }
    this.#revision++;
    this.#ports.requestRender();
  }

  handleLocalMouse(event: Mouse): void {
    if (this.#disposed || event.button !== 0) return;
    if (event.kind === "press") {
      if (event.row !== this.#inputRow) { this.#anchor = undefined; return; }
      this.#caret = this.#position(event.column);
      this.#anchor = this.#caret;
      this.#dragging = true;
    } else if ((event.kind === "motion" || event.kind === "release") && this.#dragging) {
      this.#caret = this.#position(event.column);
      if (event.kind === "release") this.#dragging = false;
    } else return;
    this.#revision++;
    this.#ports.requestRender();
  }

  dispose(): void {
    this.#disposed = true;
    this.#dragging = false;
    this.#paste.clear();
    for (const read of this.#reads) read.abort();
    this.#reads.clear();
  }

  #selection(): { readonly from: number; readonly to: number } | undefined {
    return this.#anchor === undefined || this.#anchor === this.#caret ? undefined
      : { from: Math.min(this.#anchor, this.#caret), to: Math.max(this.#anchor, this.#caret) };
  }

  #step(direction: -1 | 1): number {
    if (direction < 0) {
      const before = [...GRAPHEMES.segment(this.#value.slice(0, this.#caret))];
      return before.at(-1)?.index ?? 0;
    }
    return this.#caret + ([...GRAPHEMES.segment(this.#value.slice(this.#caret))][0]?.segment.length ?? 0);
  }

  #replace(text: string): void {
    const range = this.#selection() ?? { from: this.#caret, to: this.#caret };
    const next = this.#value.slice(0, range.from) + text + this.#value.slice(range.to);
    if (next.length > MAX_LENGTH || next === this.#value) return;
    this.#undo.push({ value: this.#value, caret: this.#caret, anchor: this.#anchor });
    if (this.#undo.length > 100) this.#undo.shift();
    this.#value = next;
    this.#caret = range.from + text.length;
    this.#anchor = undefined;
    this.#start = 0;
    this.#revision++;
  }

  #copy(cut = false): void {
    const range = this.#selection();
    if (range !== undefined) this.#ports.onCopyText?.(this.#value.slice(range.from, range.to), cut);
  }

  #readClipboard(): void {
    const revision = this.#revision;
    const read = new AbortController();
    this.#reads.add(read);
    void Promise.resolve().then(() => this.#ports.readClipboardContent?.(read.signal)).then(content => {
      if (this.#disposed || read.signal.aborted || revision !== this.#revision || content?.kind !== "text") return;
      this.#replace(singleLine(content.text));
      this.#ports.requestRender();
    }).catch(() => {}).finally(() => this.#reads.delete(read));
  }

  #position(column: number): number {
    // Component-local column includes the frame's one-cell inset and the two-cell prompt marker.
    if (this.#dragging && column < 4 && this.#start > 0) {
      this.#start = [...GRAPHEMES.segment(this.#value.slice(0, this.#start))].at(-1)?.index ?? 0;
    }
    const target = Math.max(0, Math.min(this.#width - 2, column - 4));
    let cells = 0;
    for (const { index, segment } of GRAPHEMES.segment(this.#value.slice(this.#start))) {
      const next = cells + visibleWidth(segment);
      if (target < next) return this.#start + index + (target - cells >= (next - cells) / 2 ? segment.length : 0);
      cells = next;
    }
    return this.#value.length;
  }

  #renderInput(width: number): string {
    this.#width = width;
    const available = Math.max(0, width - 2);
    if (available === 0) return truncateToWidth("> ", width, "");
    if (visibleWidth(this.#value) < available) this.#start = 0;
    if (this.#caret < this.#start) this.#start = this.#caret;
    const cursor = [...GRAPHEMES.segment(this.#value.slice(this.#caret))][0]?.segment ?? " ";
    while (this.#start < this.#caret
      && visibleWidth(this.#value.slice(this.#start, this.#caret)) + visibleWidth(cursor) > available) {
      this.#start += [...GRAPHEMES.segment(this.#value.slice(this.#start))][0]!.segment.length;
    }
    const visible = truncateToWidth(this.#value.slice(this.#start), available, "");
    const caret = this.#caret - this.#start;
    let row = `${visible.slice(0, caret)}${this.#focused ? CURSOR_MARKER : ""}${renderFakeCursor(cursor)}${visible.slice(caret + cursor.length)}`;
    const range = this.#selection();
    if (range !== undefined) {
      const from = visibleWidth(this.#value.slice(this.#start, Math.max(this.#start, range.from)));
      const to = visibleWidth(this.#value.slice(this.#start, Math.max(this.#start, range.to)));
      row = paintTextSelection(row, from, Math.min(available, to), visibleWidth, true);
    }
    return `${piTheme().fg("accent", ">")} ${truncateToWidth(row, available, "")}${" ".repeat(Math.max(0, available - visibleWidth(row)))}`;
  }
}
