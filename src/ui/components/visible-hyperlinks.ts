import { displayWidth } from "./text.js";

export interface VisibleHyperlinkRange {
  readonly from: number;
  readonly to: number;
  readonly target: string;
  readonly kind: "explicit" | "candidate";
}

export interface VisibleHyperlinkRow {
  readonly ranges: readonly VisibleHyperlinkRange[];
  /**
   * Whether the row declares a terminal hyperlink of its own. Only a declared link gives the
   * terminal per-cell link identity that moving the row can misattribute, so movement safety
   * asks this rather than counting ranges: a candidate range is host-hover text such as
   * `obj.method` or `./src/index.ts`, which ordinary code produces on nearly every row.
   */
  readonly hasExplicitLink: boolean;
  /** False for unclosed links, malformed escapes, images, or row-moving controls. */
  readonly replaySafe: boolean;
  readonly width: number;
  /** Paint identity includes labels, not just targets; it never changes source bytes. */
  readonly signature: string;
}

/** Linear tokenization: a valid large OSC target must not exhaust the regular-expression engine's stack. */
function* rowTokens(line: string): Generator<string> {
  const oscBoundary = /[\u0007\u001b]/g;
  for (let offset = 0; offset < line.length;) {
    if (line.charCodeAt(offset) !== 27) {
      const next = line.indexOf("\u001b", offset);
      const end = next < 0 ? line.length : next;
      yield line.slice(offset, end); offset = end; continue;
    }
    let end = offset + 1;
    if (line[offset + 1] === "[") {
      let cursor = offset + 2;
      while (line.charCodeAt(cursor) >= 0x30 && line.charCodeAt(cursor) <= 0x3f) cursor++;
      while (line.charCodeAt(cursor) >= 0x20 && line.charCodeAt(cursor) <= 0x2f) cursor++;
      if (line.charCodeAt(cursor) >= 0x40 && line.charCodeAt(cursor) <= 0x7e) end = cursor + 1;
    } else if (line[offset + 1] === "]") {
      // Performance: search for one boundary, not a quantified alternation over the entire URI.
      oscBoundary.lastIndex = offset + 2;
      const boundary = oscBoundary.exec(line);
      if (boundary?.[0] === "\u0007") end = boundary.index + 1;
      else if (boundary !== null && line[boundary.index + 1] === "\\") end = boundary.index + 2;
    }
    yield line.slice(offset, end); offset = end;
  }
}
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
  for (const token of rowTokens(line)) {
    if (token.startsWith("\u001b")) {
      const separator = token.startsWith("\u001b]8;") ? token.indexOf(";", 4) : -1;
      if (separator !== -1) {
        finish();
        const target = token.slice(separator + 1, token.endsWith("\u0007") ? -1 : -2);
        if (target) active = { from: column, target };
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
    hasExplicitLink: ranges.some(range => range.kind === "explicit"),
    replaySafe,
    width: column,
    // Rationale: a path with spaces or a wrapped host match may extend beyond
    // the conservative candidate. Changes anywhere in that row invalidate it.
    signature: ranges.length === 0 ? "" : JSON.stringify([ranges, plain]),
  };
}
