import {
  decodeKittyPrintable,
  visibleWidth,
  type Editor,
} from "#pi-tui";
import type { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";

/**
 * Middleware boundary around Pi's editor. Interceptors may claim an input or
 * delegate to the next interceptor/vanilla editor, and may decorate the rows
 * vanilla Pi renders. This keeps owned UX additions out of the synchronized
 * Pi editor port and gives future interactions one registration point.
 */
export interface OwnedEditorUxInterceptor {
  handleInput(data: string, next: () => void): void;
  render(width: number, next: () => string[]): string[];
  reset(): void;
  handlePointer?(event: OwnedEditorPointerEvent): boolean;
  hasSelection?(): boolean;
  ownsPointer?(): boolean;
}

export interface OwnedEditorPointerEvent {
  readonly kind: "press" | "motion" | "release";
  readonly button: number;
  readonly column: number;
  /** One-based row relative to the top of the editor component. */
  readonly row: number;
}

export class OwnedEditorUxInterception {
  constructor(
    readonly interceptors: readonly OwnedEditorUxInterceptor[],
    readonly fallback: { handleInput(data: string): void; render(width: number): string[] },
  ) {}

  handleInput(data: string): void {
    const invoke = (index: number): void => {
      const interceptor = this.interceptors[index];
      if (interceptor === undefined) {
        this.fallback.handleInput(data);
        return;
      }
      interceptor.handleInput(data, () => invoke(index + 1));
    };
    invoke(0);
  }

  render(width: number): string[] {
    const invoke = (index: number): string[] => {
      const interceptor = this.interceptors[index];
      return interceptor === undefined
        ? this.fallback.render(width)
        : interceptor.render(width, () => invoke(index + 1));
    };
    return invoke(0);
  }

  reset(): void {
    for (const interceptor of this.interceptors) interceptor.reset();
  }

  handlePointer(event: OwnedEditorPointerEvent): boolean {
    return this.interceptors.some(interceptor => interceptor.handlePointer?.(event) === true);
  }

  hasSelection(): boolean {
    return this.interceptors.some(interceptor => interceptor.hasSelection?.() === true);
  }

  ownsPointer(): boolean {
    return this.interceptors.some(interceptor => interceptor.ownsPointer?.() === true);
  }
}

interface Position {
  line: number;
  col: number;
}

interface Selection {
  anchor: Position;
  head: Position;
}

interface EditorState {
  lines: string[];
  cursorLine: number;
  cursorCol: number;
}

interface EditorSnapshot {
  text: string;
  cursor: Position;
}

interface VisualLine {
  logicalLine: number;
  startCol: number;
  length: number;
}

export interface PromptSelectionUxOptions {
  readonly copyText: (text: string) => void;
  readonly readClipboardText: () => Promise<string | null>;
  readonly paintSelection: (line: string, from: number, to: number) => string;
  readonly requestRender: () => void;
  readonly getRows: () => number;
}

const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });
const MULTI_CLICK_MS = 500;
export function createPromptSelectionInterceptor(
  editor: Editor,
  keybindings: KeybindingsManager,
  options: PromptSelectionUxOptions,
): OwnedEditorUxInterceptor {
  return new PromptSelectionInterceptor(editor, keybindings, options);
}

class PromptSelectionInterceptor implements OwnedEditorUxInterceptor {
  #selection: Selection | undefined;
  #pointerSelecting = false;
  #lastClick: { time: number; line: number; col: number; count: number } | undefined;
  #redoStack: EditorSnapshot[] = [];
  #selectionRevision = 0;
  #geometry: {
    width: number;
    padding: number;
    layoutWidth: number;
    visualLines: VisualLine[];
    scrollOffset: number;
    textRows: number;
  } | undefined;

  constructor(
    readonly editor: Editor,
    readonly keybindings: KeybindingsManager,
    readonly options: PromptSelectionUxOptions,
  ) {}

  handleInput(data: string, next: () => void): void {
    if (this.keybindings.matches(data, "owned.editor.selectAll")) {
      this.#selectAll();
      return;
    }
    if (this.keybindings.matches(data, "owned.editor.extendLeft")) {
      this.#extend(-1);
      return;
    }
    if (this.keybindings.matches(data, "owned.editor.extendRight")) {
      this.#extend(1);
      return;
    }
    if (this.keybindings.matches(data, "tui.input.copy") && this.hasSelection()) {
      this.options.copyText(this.#selectedText());
      return;
    }
    if (this.keybindings.matches(data, "owned.editor.cut") && this.hasSelection()) {
      this.options.copyText(this.#selectedText());
      this.#deleteSelection();
      return;
    }
    if (this.keybindings.matches(data, "owned.editor.paste")) {
      this.#pasteFromClipboard();
      return;
    }
    if (this.keybindings.matches(data, "owned.editor.redo")) {
      this.#redo();
      return;
    }

    if (this.keybindings.matches(data, "tui.editor.undo")) {
      const before = this.#snapshot();
      this.#clearSelection(false);
      next();
      if (!sameSnapshot(before, this.#snapshot())) this.#redoStack.push(before);
      this.#requestRender();
      return;
    }

    const selection = this.#orderedSelection();
    if (selection !== undefined) {
      const inserted = insertedText(data);
      if (inserted !== undefined) {
        this.#replaceSelection(inserted);
        return;
      }
      if (data.includes("\u001b[200~")) {
        // Let Pi retain its streaming bracketed-paste parser. Removing the
        // selection first still gives paste the expected replacement point.
        this.#deleteSelection();
        next();
        return;
      }
      if (this.keybindings.matches(data, "tui.editor.deleteCharBackward")
        || this.keybindings.matches(data, "tui.editor.deleteCharForward")) {
        this.#deleteSelection();
        return;
      }
      if (this.keybindings.matches(data, "tui.editor.cursorLeft")) {
        this.#setCursor(selection.start);
        this.#clearSelection();
        return;
      }
      if (this.keybindings.matches(data, "tui.editor.cursorRight")) {
        this.#setCursor(selection.end);
        this.#clearSelection();
        return;
      }
      this.#clearSelection(false);
    }

    const beforeText = this.editor.getText();
    next();
    if (this.editor.getText() !== beforeText) this.#redoStack = [];
  }

  render(width: number, next: () => string[]): string[] {
    const rows = next();
    const maxPadding = Math.max(0, Math.floor((width - 1) / 2));
    const padding = Math.min(this.editor.getPaddingX(), maxPadding);
    const contentWidth = Math.max(1, width - padding * 2);
    const layoutWidth = Math.max(1, contentWidth - (padding ? 0 : 1));
    const visualLines = buildVisualLineMap(editorState(this.editor).lines, layoutWidth);
    const scrollOffset = numericProperty(this.editor, "scrollOffset");
    const maxVisibleLines = Math.max(5, Math.floor(this.options.getRows() * 0.3));
    const textRows = Math.max(0, Math.min(visualLines.length - scrollOffset, maxVisibleLines, rows.length - 2));
    this.#geometry = { width, padding, layoutWidth, visualLines, scrollOffset, textRows };

    const selection = this.#orderedSelection();
    if (selection === undefined) return rows;
    for (let row = 0; row < textRows; row += 1) {
      const visual = visualLines[scrollOffset + row];
      if (visual === undefined || visual.logicalLine < selection.start.line || visual.logicalLine > selection.end.line) continue;
      const segmentStart = visual.startCol;
      const segmentEnd = visual.startCol + visual.length;
      const from = visual.logicalLine === selection.start.line ? Math.max(selection.start.col, segmentStart) : segmentStart;
      const to = visual.logicalLine === selection.end.line ? Math.min(selection.end.col, segmentEnd) : segmentEnd;
      if (to <= from) continue;
      const line = editorState(this.editor).lines[visual.logicalLine] ?? "";
      const fromColumn = padding + visibleWidth(line.slice(segmentStart, from));
      const toColumn = fromColumn + visibleWidth(line.slice(from, to));
      const rendered = rows[row + 1];
      if (rendered !== undefined && toColumn > fromColumn) {
        rows[row + 1] = this.options.paintSelection(rendered, fromColumn, toColumn);
      }
    }
    return rows;
  }

  reset(): void {
    this.#selection = undefined;
    this.#pointerSelecting = false;
    this.#lastClick = undefined;
    this.#redoStack = [];
    this.#selectionRevision += 1;
  }

  hasSelection(): boolean {
    return this.#orderedSelection() !== undefined;
  }

  ownsPointer(): boolean {
    return this.#pointerSelecting;
  }

  handlePointer(event: OwnedEditorPointerEvent): boolean {
    if (event.button !== 0) return false;
    if (event.kind === "press") return this.#pointerPress(event.column, event.row);
    if (event.kind === "motion") {
      if (!this.#pointerSelecting) return false;
      const position = this.#positionAt(event.column, event.row, true);
      if (position !== undefined && this.#selection !== undefined) {
        this.#selection = { ...this.#selection, head: position };
        this.#selectionRevision += 1;
        this.#requestRender();
      }
      return true;
    }
    if (!this.#pointerSelecting) return false;
    this.#pointerSelecting = false;
    const ordered = this.#orderedSelection();
    if (ordered === undefined && this.#selection !== undefined) this.#setCursor(this.#selection.head);
    if (ordered === undefined) this.#clearSelection(false);
    this.#requestRender();
    return true;
  }

  #pointerPress(column: number, row: number): boolean {
    const position = this.#positionAt(column, row, false);
    if (position === undefined) return false;
    const now = Date.now();
    const previous = this.#lastClick;
    const count = previous !== undefined
      && now - previous.time <= MULTI_CLICK_MS
      && previous.line === position.line
      && Math.abs(previous.col - position.col) <= 1
      ? previous.count + 1
      : 1;
    this.#lastClick = { time: now, ...position, count };
    const kind = ((count - 1) % 3) + 1;
    if (kind === 2) this.#selectWord(position);
    else if (kind === 3) this.#selectLine(position.line);
    else this.#selection = { anchor: position, head: position };
    this.#pointerSelecting = true;
    this.#selectionRevision += 1;
    this.#requestRender();
    return true;
  }

  #positionAt(column: number, row: number, clampRow: boolean): Position | undefined {
    const geometry = this.#geometry;
    if (geometry === undefined || geometry.textRows === 0) return undefined;
    let textRow = row - 2;
    if (clampRow) textRow = clamp(textRow, 0, geometry.textRows - 1);
    if (textRow < 0 || textRow >= geometry.textRows) return undefined;
    const visual = geometry.visualLines[geometry.scrollOffset + textRow];
    if (visual === undefined) return undefined;
    const line = editorState(this.editor).lines[visual.logicalLine] ?? "";
    const segment = line.slice(visual.startCol, visual.startCol + visual.length);
    const displayColumn = Math.max(0, column - 1 - geometry.padding);
    return {
      line: visual.logicalLine,
      col: visual.startCol + indexAtDisplayWidth(segment, displayColumn),
    };
  }

  #selectWord(position: Position): void {
    const line = editorState(this.editor).lines[position.line] ?? "";
    const segments = [...GRAPHEMES.segment(line)].map(({ segment, index }) => ({
      class: charClass(segment), start: index, end: index + segment.length,
    }));
    let selected = segments.findIndex(segment => position.col >= segment.start && position.col < segment.end);
    if (selected < 0 && segments.length > 0 && position.col === line.length) selected = segments.length - 1;
    if (selected < 0) return;
    let start = selected;
    let end = selected;
    while (start > 0 && segments[start - 1]?.class === segments[selected]?.class) start -= 1;
    while (end + 1 < segments.length && segments[end + 1]?.class === segments[selected]?.class) end += 1;
    this.#selection = {
      anchor: { line: position.line, col: segments[start]?.start ?? position.col },
      head: { line: position.line, col: segments[end]?.end ?? position.col },
    };
  }

  #selectLine(line: number): void {
    const text = editorState(this.editor).lines[line] ?? "";
    this.#selection = { anchor: { line, col: 0 }, head: { line, col: text.length } };
  }

  #selectAll(): void {
    const lines = editorState(this.editor).lines;
    const finalLine = Math.max(0, lines.length - 1);
    this.#selection = {
      anchor: { line: 0, col: 0 },
      head: { line: finalLine, col: (lines[finalLine] ?? "").length },
    };
    this.#pointerSelecting = false;
    this.#selectionRevision += 1;
    this.#requestRender();
  }

  #extend(delta: -1 | 1): void {
    const cursor = this.#cursor();
    if (this.#selection === undefined) this.#selection = { anchor: cursor, head: cursor };
    else if (!samePosition(cursor, this.#selection.head)) this.#setCursor(this.#selection.head);
    this.#moveCursor(delta);
    this.#selection = { anchor: this.#selection.anchor, head: this.#cursor() };
    this.#pointerSelecting = false;
    this.#lastClick = undefined;
    this.#selectionRevision += 1;
    this.#requestRender();
  }

  #pasteFromClipboard(): void {
    const revision = this.#selectionRevision;
    const selection = this.#orderedSelection();
    void this.options.readClipboardText().then(text => {
      if (text === null || text.length === 0) return;
      if (selection !== undefined && revision === this.#selectionRevision && this.#orderedSelection() !== undefined) {
        this.#replaceSelection(text);
        return;
      }
      this.#clearSelection(false);
      this.editor.insertTextAtCursor(text);
      this.#redoStack = [];
      this.#requestRender();
    }).catch(() => {});
  }

  #replaceSelection(text: string): void {
    const selection = this.#orderedSelection();
    if (selection === undefined) {
      this.editor.insertTextAtCursor(text);
      return;
    }
    const normalized = normalizeInsertedText(text);
    const current = this.editor.getText();
    const lines = editorState(this.editor).lines;
    const from = positionOffset(lines, selection.start);
    const to = positionOffset(lines, selection.end);
    const next = current.slice(0, from) + normalized + current.slice(to);
    this.editor.setText(next);
    this.#setCursor(positionAtOffset(next, from + normalized.length));
    this.#redoStack = [];
    this.#clearSelection(false);
    this.#requestRender();
  }

  #deleteSelection(): boolean {
    const selection = this.#orderedSelection();
    if (selection === undefined) return false;
    const current = this.editor.getText();
    const lines = editorState(this.editor).lines;
    const from = positionOffset(lines, selection.start);
    const to = positionOffset(lines, selection.end);
    this.editor.setText(current.slice(0, from) + current.slice(to));
    this.#setCursor(positionAtOffset(this.editor.getText(), from));
    this.#redoStack = [];
    this.#clearSelection(false);
    this.#requestRender();
    return true;
  }

  #redo(): void {
    const snapshot = this.#redoStack.pop();
    if (snapshot === undefined) return;
    this.editor.setText(snapshot.text);
    this.#setCursor(snapshot.cursor);
    this.#clearSelection(false);
    this.#requestRender();
  }

  #selectedText(): string {
    const selection = this.#orderedSelection();
    if (selection === undefined) return "";
    const current = this.editor.getText();
    const lines = editorState(this.editor).lines;
    return current.slice(positionOffset(lines, selection.start), positionOffset(lines, selection.end));
  }

  #orderedSelection(): { start: Position; end: Position } | undefined {
    const selection = this.#selection;
    if (selection === undefined || samePosition(selection.anchor, selection.head)) return undefined;
    return positionBefore(selection.anchor, selection.head)
      ? { start: selection.anchor, end: selection.head }
      : { start: selection.head, end: selection.anchor };
  }

  #clearSelection(render = true): void {
    if (this.#selection === undefined && !this.#pointerSelecting) return;
    this.#selection = undefined;
    this.#pointerSelecting = false;
    this.#selectionRevision += 1;
    if (render) this.#requestRender();
  }

  #cursor(): Position {
    return this.editor.getCursor();
  }

  #setCursor(position: Position): void {
    const state = editorState(this.editor);
    const line = clamp(position.line, 0, Math.max(0, state.lines.length - 1));
    state.cursorLine = line;
    state.cursorCol = clamp(position.col, 0, (state.lines[line] ?? "").length);
  }

  #moveCursor(delta: -1 | 1): void {
    const state = editorState(this.editor);
    const line = state.lines[state.cursorLine] ?? "";
    if (delta < 0) {
      if (state.cursorCol > 0) {
        const segments = [...GRAPHEMES.segment(line.slice(0, state.cursorCol))];
        state.cursorCol -= segments.at(-1)?.segment.length ?? 1;
      } else if (state.cursorLine > 0) {
        state.cursorLine -= 1;
        state.cursorCol = (state.lines[state.cursorLine] ?? "").length;
      }
      return;
    }
    if (state.cursorCol < line.length) {
      state.cursorCol += [...GRAPHEMES.segment(line.slice(state.cursorCol))][0]?.segment.length ?? 1;
    } else if (state.cursorLine < state.lines.length - 1) {
      state.cursorLine += 1;
      state.cursorCol = 0;
    }
  }

  #snapshot(): EditorSnapshot {
    return { text: this.editor.getText(), cursor: this.#cursor() };
  }

  #requestRender(): void {
    this.options.requestRender();
  }
}

function insertedText(data: string): string | undefined {
  if (!data || data.includes("\u001b[200~")) return undefined;
  const kitty = decodeKittyPrintable(data);
  if (kitty !== undefined) return kitty;
  return data.charCodeAt(0) >= 32 ? data : undefined;
}

function indexAtDisplayWidth(text: string, target: number): number {
  if (target <= 0) return 0;
  let width = 0;
  let index = 0;
  for (const { segment } of GRAPHEMES.segment(text)) {
    const next = width + visibleWidth(segment);
    if (next > target) break;
    width = next;
    index += segment.length;
  }
  return index;
}

function charClass(value: string): number {
  if (/\s/u.test(value)) return 0;
  if (/[\p{L}\p{N}_]/u.test(value)) return 1;
  return 2;
}

function positionBefore(left: Position, right: Position): boolean {
  return left.line < right.line || (left.line === right.line && left.col <= right.col);
}

function samePosition(left: Position, right: Position): boolean {
  return left.line === right.line && left.col === right.col;
}

function sameSnapshot(left: EditorSnapshot, right: EditorSnapshot): boolean {
  return left.text === right.text && samePosition(left.cursor, right.cursor);
}

function editorState(editor: Editor): EditorState {
  const value: unknown = Object.getOwnPropertyDescriptor(editor, "state")?.value;
  if (!isEditorState(value)) throw new Error("Pi editor state is unavailable");
  return value;
}

function isEditorState(value: unknown): value is EditorState {
  if (typeof value !== "object" || value === null) return false;
  const lines = Object.getOwnPropertyDescriptor(value, "lines")?.value;
  const cursorLine = Object.getOwnPropertyDescriptor(value, "cursorLine")?.value;
  const cursorCol = Object.getOwnPropertyDescriptor(value, "cursorCol")?.value;
  return Array.isArray(lines) && lines.every(line => typeof line === "string")
    && typeof cursorLine === "number" && typeof cursorCol === "number";
}

function numericProperty(target: object, key: string): number {
  const value: unknown = Object.getOwnPropertyDescriptor(target, key)?.value;
  return typeof value === "number" ? value : 0;
}

function buildVisualLineMap(lines: readonly string[], width: number): VisualLine[] {
  const visualLines: VisualLine[] = [];
  for (let logicalLine = 0; logicalLine < lines.length; logicalLine += 1) {
    const line = lines[logicalLine] ?? "";
    if (line.length === 0) {
      visualLines.push({ logicalLine, startCol: 0, length: 0 });
      continue;
    }
    for (const chunk of wrapLine(line, width)) {
      visualLines.push({ logicalLine, startCol: chunk.start, length: chunk.end - chunk.start });
    }
  }
  return visualLines;
}

function wrapLine(line: string, width: number): Array<{ start: number; end: number }> {
  if (visibleWidth(line) <= width) return [{ start: 0, end: line.length }];
  const segments = [...GRAPHEMES.segment(line)];
  const chunks: Array<{ start: number; end: number }> = [];
  let start = 0;
  let currentWidth = 0;
  let wrapAt = -1;
  let widthAtWrap = 0;
  for (let index = 0; index < segments.length; index += 1) {
    const segment = segments[index];
    if (segment === undefined) continue;
    const segmentWidth = visibleWidth(segment.segment);
    if (currentWidth + segmentWidth > width) {
      if (wrapAt > start && currentWidth - widthAtWrap + segmentWidth <= width) {
        chunks.push({ start, end: wrapAt });
        start = wrapAt;
        currentWidth -= widthAtWrap;
      } else if (start < segment.index) {
        chunks.push({ start, end: segment.index });
        start = segment.index;
        currentWidth = 0;
      }
      wrapAt = -1;
    }
    currentWidth += segmentWidth;
    const next = segments[index + 1];
    if (/\s/u.test(segment.segment) && next !== undefined && !/\s/u.test(next.segment)) {
      wrapAt = next.index;
      widthAtWrap = currentWidth;
    }
  }
  chunks.push({ start, end: line.length });
  return chunks;
}

function positionOffset(lines: readonly string[], position: Position): number {
  let offset = 0;
  for (let line = 0; line < position.line; line += 1) offset += (lines[line] ?? "").length + 1;
  return offset + position.col;
}

function positionAtOffset(text: string, requestedOffset: number): Position {
  const offset = clamp(requestedOffset, 0, text.length);
  const before = text.slice(0, offset).split("\n");
  return { line: before.length - 1, col: (before.at(-1) ?? "").length };
}

function normalizeInsertedText(text: string): string {
  return text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, "    ");
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
