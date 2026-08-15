import type { OwnedUiTranscriptBlock } from "../../foundation/owned-ui-contracts/index.js";
import type { OwnedTerminalComponent, OwnedTerminalViewport } from "./terminal-runtime.js";

export type OwnedTranscriptRenderer = (
  block: OwnedUiTranscriptBlock,
  width: number,
) => readonly string[];

export interface OwnedTranscriptFrame {
  readonly width: number;
  readonly revision: number;
  readonly committedRows: readonly string[];
  readonly liveRows: readonly string[];
  readonly fullPaint: boolean;
}

interface CachedBlockRows {
  readonly blockId: string;
  readonly revision: number;
  readonly width: number;
  readonly rows: readonly string[];
}

interface CommittedBlock {
  readonly blockId: string;
  readonly revision: number;
  readonly width: number;
  readonly rows: readonly string[];
  readonly committedRowStart: number;
}

export class OwnedTranscriptHistory {
  readonly #renderBlock: OwnedTranscriptRenderer;
  readonly #cachedRows = new Map<string, CachedBlockRows>();
  readonly #committedBlocks = new Map<string, CommittedBlock>();
  #committedRows: string[] = [];
  #width: number;
  #revision = 0;
  #fullPaint = true;

  constructor(width: number, renderBlock: OwnedTranscriptRenderer) {
    if (!Number.isSafeInteger(width) || width <= 0) throw new RangeError("transcript width must be a positive integer");
    this.#width = width;
    this.#renderBlock = renderBlock;
  }

  get committedRowCount(): number {
    return this.#committedRows.length;
  }

  render(blocks: readonly OwnedUiTranscriptBlock[], width = this.#width): OwnedTranscriptFrame {
    if (!Number.isSafeInteger(width) || width <= 0) throw new RangeError("transcript width must be a positive integer");
    if (width !== this.#width) {
      this.#width = width;
      this.#fullPaint = true;
    }

    const committedRows: string[] = [];
    const liveRows: string[] = [];
    let live = false;
    for (const block of blocks) {
      const rows = this.#rowsFor(block);
      if (!live && block.status === "finalized") {
        const previous = this.#committedBlocks.get(block.id);
        if (previous && previous.width === width && previous.revision !== block.revision) {
          this.#fullPaint = true;
        }
        committedRows.push(...rows);
        liveRows.push(...[]);
        this.#committedBlocks.set(block.id, {
          blockId: block.id,
          revision: block.revision,
          width,
          rows,
          committedRowStart: committedRows.length - rows.length,
        });
      } else {
        live = true;
        liveRows.push(...rows);
      }
    }

    if (!arraysEqual(committedRows, this.#committedRows)) {
      this.#committedRows = [...committedRows];
    }
    const frame: OwnedTranscriptFrame = {
      width,
      revision: ++this.#revision,
      committedRows,
      liveRows,
      fullPaint: this.#fullPaint,
    };
    this.#fullPaint = false;
    return frame;
  }

  invalidate(blockId?: string): void {
    if (blockId === undefined) {
      this.#cachedRows.clear();
    } else {
      this.#cachedRows.delete(blockId);
    }
    this.#fullPaint = true;
  }

  #rowsFor(block: OwnedUiTranscriptBlock): readonly string[] {
    const cached = this.#cachedRows.get(block.id);
    if (cached && cached.revision === block.revision && cached.width === this.#width) return cached.rows;
    const rows = Object.freeze([...this.#renderBlock(block, this.#width)]);
    const next: CachedBlockRows = {
      blockId: block.id,
      revision: block.revision,
      width: this.#width,
      rows,
    };
    this.#cachedRows.set(block.id, next);
    return rows;
  }
}

export class OwnedTranscriptComponent implements OwnedTerminalComponent {
  readonly id = "transcript";
  focused = false;
  readonly #history: OwnedTranscriptHistory;
  #blocks: readonly OwnedUiTranscriptBlock[] = [];
  #onRequestRender: (() => void) | undefined;

  constructor(width: number, renderBlock: OwnedTranscriptRenderer) {
    this.#history = new OwnedTranscriptHistory(width, renderBlock);
  }

  setBlocks(blocks: readonly OwnedUiTranscriptBlock[]): void {
    this.#blocks = [...blocks];
    this.#onRequestRender?.();
  }

  setRenderRequestHandler(callback: () => void): void {
    this.#onRequestRender = callback;
  }

  invalidate(): void {
    this.#history.invalidate();
  }

  render(viewport: OwnedTerminalViewport): readonly string[] {
    const frame = this.#history.render(this.#blocks, viewport.columns);
    const rows = [...frame.committedRows, ...frame.liveRows];
    return rows.slice(Math.max(0, rows.length - viewport.rows));
  }
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }
  return true;
}
