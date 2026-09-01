import { displayWidth, truncateToWidth } from "./text.js";

export interface PaneRect {
  readonly width: number;
  readonly height: number;
}

/** Identifies the pane whose bounded frame geometry or rendered rows violated the contract. */
export class FrameContractError extends Error {
  constructor(readonly pane: string, message: string) {
    super(`${pane}: ${message}`);
    this.name = "FrameContractError";
  }
}

const MAX_DIMENSION = 10_000;

export function assertPaneRect(rect: PaneRect, pane = "pane"): void {
  for (const [name, value] of [["width", rect.width], ["height", rect.height]] as const) {
    if (!Number.isInteger(value) || value < 0 || value > MAX_DIMENSION) {
      throw new FrameContractError(pane, `${name} must be an integer between 0 and ${MAX_DIMENSION}, received ${value}`);
    }
  }
}

/**
 * A pane owns its rectangle exactly: one row per row of height, each within
 * width, and never an embedded newline — the host counts rows to place
 * everything below, so a miscount corrupts the surrounding layout.
 */
export function validateFrame(lines: readonly string[], rect: PaneRect, pane = "pane"): void {
  assertPaneRect(rect, pane);
  if (lines.length !== rect.height) {
    throw new FrameContractError(pane, `rendered ${lines.length} rows for a height of ${rect.height}`);
  }
  lines.forEach((line, index) => {
    if (line.includes("\n") || line.includes("\r")) {
      throw new FrameContractError(pane, `row ${index} contains a line break`);
    }
    const width = displayWidth(line);
    if (width > rect.width) {
      throw new FrameContractError(pane, `row ${index} is ${width} columns wide for a width of ${rect.width}`);
    }
  });
}

/**
 * Brings a rendered body up to the contract: truncates overlong rows, pads a
 * short body with blank rows, and drops rows beyond the rectangle. Panes that
 * compose other panes use this so one child cannot break the parent's layout.
 */
export function finalizeFrame(lines: readonly string[], rect: PaneRect, pane = "pane"): readonly string[] {
  assertPaneRect(rect, pane);
  const rows: string[] = [];
  for (let index = 0; index < rect.height; index++) {
    const line = lines[index] ?? "";
    if (line.includes("\n") || line.includes("\r")) {
      throw new FrameContractError(pane, `row ${index} contains a line break`);
    }
    rows.push(displayWidth(line) > rect.width ? truncateToWidth(line, rect.width) : line);
  }
  return Object.freeze(rows);
}
