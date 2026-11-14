import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

const KITTY_IMAGE_PAYLOAD = /\u001b_G[^\u001b]*\u001b\\/g;
const KITTY_IMAGE_PAYLOAD_SPLIT = /(\u001b_G[^\u001b]*\u001b\\)/;
const ESCAPE_SEQUENCE = /\u001b(?:\[[0-9;:?]*[ -/]*[@-~]|[\]_][^\u0007\u001b]*(?:\u0007|\u001b\\)|[@-Z\\-_])/g;
const ROW_STATE_RESET = "\u001b[0m\u001b]8;;\u0007";
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

let containedRows = 0;

/** Over-width component rows clipped in this process; layout evidence expects no growth for A1 chrome. */
export function containedRowCount(): number {
  return containedRows;
}

/** Columns the pinned renderer assigns a row; Kitty APC carries pixels, not columns. */
function ordinaryWidth(row: string): number {
  return visibleWidth(row.replace(KITTY_IMAGE_PAYLOAD, ""));
}

function clipRow(row: string, width: number): string {
  let remaining = width;
  let out = "";
  for (const part of row.split(KITTY_IMAGE_PAYLOAD_SPLIT)) {
    if (part.startsWith("\u001b_G")) { out += part; continue; }
    const clipped = truncateToWidth(part, remaining, "");
    out += clipped;
    remaining = Math.max(0, remaining - visibleWidth(clipped));
  }
  // Protocol: the clip may have removed the row's own style or hyperlink terminators.
  if (out.replace(KITTY_IMAGE_PAYLOAD, "").includes("\u001b")) out += ROW_STATE_RESET;
  if (ordinaryWidth(out) <= width) return out;
  // Invariant: host truncation is trusted but not assumed; plain graphemes bound the row unconditionally.
  let plain = "";
  let used = 0;
  for (const { segment } of GRAPHEMES.segment(row.replace(ESCAPE_SEQUENCE, ""))) {
    const cells = visibleWidth(segment);
    if (used + cells > width) break;
    plain += segment;
    used += cells;
  }
  return plain;
}

/**
 * Bounds component rows to `width` under the pinned renderer's own measurement, returning
 * fitting rows unchanged. Session content that A1's shared geometry under-measures therefore
 * degrades to a clipped row instead of a fatal render error.
 */
export function containRows(rows: readonly string[], width: number): string[] {
  return rows.map(row => {
    if (ordinaryWidth(row) <= width) return row;
    containedRows += 1;
    return clipRow(row, width);
  });
}
