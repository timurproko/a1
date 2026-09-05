import { displayWidth } from "./text.js";

export interface VisibleHyperlinkRange {
  readonly from: number;
  readonly to: number;
  readonly target: string;
  readonly kind: "explicit" | "candidate";
}

export interface VisibleHyperlinkRow {
  readonly ranges: readonly VisibleHyperlinkRange[];
  /** False for unclosed links, malformed escapes, images, or row-moving controls. */
  readonly replaySafe: boolean;
  readonly width: number;
  /** Paint identity includes labels, not just targets; it never changes source bytes. */
  readonly signature: string;
}

const TOKENS = /\u001b\[[0-?]*[ -/]*[@-~]|\u001b\][^\u0007\u001b]*(?:\u0007|\u001b\\)|[^\u001b]+|\u001b/gu;
const LINK = /^\u001b\]8;[^;\u0007\u001b]*;([^\u0007\u001b]*)(?:\u0007|\u001b\\)$/u;
const SGR = /^\u001b\[[\d;:]*m$/u;
const SEMANTIC_ZONE = /^\u001b\]133;[ABC](?:\u0007|\u001b\\)$/u;
// Platform: this is a conservative cleanup detector, NOT a link-activation
// parser. Hosts recognize URLs, domains and file-like labels without OSC 8.
const CANDIDATE = /(?:[a-z][a-z\d+.-]*:\/\/[^\s<>"']+|www\.[^\s<>"']+|(?:[a-z]:[\\/]|\.{1,2}[\\/])[^\s<>"']+|[\p{L}\p{N}_-]+(?:\.\p{L}[\p{L}\p{N}_-]+)+(?:[\\/][^\s<>"']+)?)/giu;

/**
 * Reads final visible row geometry without decorating text. Candidate ranges
 * only invalidate host-hover paint; they never invent an explicit link target.
 */
export function readVisibleHyperlinks(
  line: string,
  widthOf: (text: string) => number = displayWidth,
): VisibleHyperlinkRow {
  const ranges: VisibleHyperlinkRange[] = [];
  let plain = "";
  let column = 0;
  let active: { from: number; target: string } | undefined;
  let replaySafe = true;
  const finish = () => {
    if (active !== undefined && column > active.from) {
      ranges.push({ from: active.from, to: column, target: active.target, kind: "explicit" });
    }
    active = undefined;
  };
  for (const match of line.matchAll(TOKENS)) {
    const token = match[0];
    if (token.startsWith("\u001b")) {
      const link = LINK.exec(token);
      if (link !== null) {
        finish();
        if (link[1]) active = { from: column, target: link[1] };
      } else if (!SGR.test(token) && !SEMANTIC_ZONE.test(token)) replaySafe = false;
    } else {
      if (/[\u0000-\u001f\u007f]/u.test(token)) replaySafe = false;
      plain += token;
      column += widthOf(token);
    }
  }
  if (active !== undefined) { replaySafe = false; finish(); }
  for (const match of plain.matchAll(CANDIDATE)) {
    const from = widthOf(plain.slice(0, match.index));
    const to = from + widthOf(match[0]);
    if (!ranges.some(range => from < range.to && to > range.from)) {
      ranges.push({ from, to, target: match[0], kind: "candidate" });
    }
  }
  ranges.sort((left, right) => left.from - right.from);
  return {
    ranges,
    replaySafe,
    width: column,
    // Rationale: a path with spaces or a wrapped host match may extend beyond
    // the conservative candidate. Changes anywhere in that row invalidate it.
    signature: ranges.length === 0 ? "" : JSON.stringify([ranges, plain]),
  };
}
