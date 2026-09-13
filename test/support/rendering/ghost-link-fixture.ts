import { stripAnsi, truncateToWidth } from "../../../src/ui/components/text.js";

export type GhostLinkFixtureMode = "explicit" | "auto-detected";

const CLOSE_LINK = "\u001b]8;;\u001b\\";
const ROW_RESET = `${CLOSE_LINK}\u001b[0m`;
const TOOL_BACKGROUND = "\u001b[48;2;38;48;38m";
export const GHOST_FIXTURE_URL = "https://example.invalid/ghost-link-baseline/very-long-label/";

/**
 * Paint-only fixture: explicit and auto-detected cases share labels, but only
 * the explicit case emits OSC 8. No link is activated by the diagnostic runner.
 */
export function ghostLinkDocument(
  width: number,
  mode: GhostLinkFixtureMode,
  fileTarget: string,
  short = false,
): readonly string[] {
  const available = Math.max(1, width - 2);
  const linked = (label: string, target: string) => mode === "explicit"
    ? `\u001b]8;;${target}\u001b\\\u001b[38;2;97;175;239m${label}${ROW_RESET}`
    : label;
  // Rationale: ASCII labels make fixture wrapping independent of the parser
  // being repaired. Grapheme-aware production ranges have separate regressions.
  const longUrl = GHOST_FIXTURE_URL + "segment/".repeat(24);
  const wrapped = (label: string, target: string): string[] => {
    const rows: string[] = [];
    for (let column = 0; column < label.length; column += available) {
      rows.push(`  ${linked(label.slice(column, column + available), target)}`);
    }
    return rows;
  };
  return [
    "Hover a link, then press x or scroll WITHOUT moving the pointer.",
    "",
    short ? `    ${linked("short", GHOST_FIXTURE_URL)}` : `  ${linked("long link label with trailing cells", GHOST_FIXTURE_URL)}`,
    "",
    `  ${linked("duplicate", GHOST_FIXTURE_URL)} plain gap ${linked("duplicate", GHOST_FIXTURE_URL)}`,
    "",
    ...wrapped("C:/work/ghost-link-baseline/src/long-file-name-for-hover-testing.ts", fileTarget),
    "",
    ...wrapped(longUrl, longUrl),
    "",
    "Plain tool text (terminal auto-detection is host-owned):",
    // Protocol: deliberately no OSC 8 for these tool rows in either mode.
    "import('file:///C:/work/ghost-link-baseline/dist/index.js')",
    "C:/work/ghost-link-baseline/package.json",
    ...Array.from({ length: 80 }, (_, index) => index % 3 === 0 ? `plain trailing row ${index}` : ""),
  ];
}

/** Makes a complete, row-bounded terminal frame, including blank replacement cells. */
export function ghostLinkScreen(
  document: readonly string[],
  width: number,
  height: number,
  scrollTop: number,
  blank: boolean,
  status: string,
): readonly string[] {
  const contentHeight = Math.max(0, height - 2);
  const rows = Array.from({ length: contentHeight }, (_, row) => {
    const content = truncateToWidth(blank ? "" : document[scrollTop + row] ?? "", width);
    // Protocol: end the explicit link before painting padding, including on a clipped row.
    const padding = " ".repeat(Math.max(0, width - stripAnsi(content).length));
    return `${TOOL_BACKGROUND}${content}${CLOSE_LINK}${TOOL_BACKGROUND}${padding}${ROW_RESET}`;
  });
  return [
    ...rows,
    `${status.slice(0, width)}${ROW_RESET}`,
    `${"1 explicit | 2 auto | r reset | b bounds | x blank | j/k scroll | f clear | y ghost | n clean | q quit".slice(0, width)}${ROW_RESET}`,
  ];
}

/** Emits the adapter's pinned complete-row grammar without running an agent or Pi UI. */
export function ghostLinkWrite(rows: readonly string[], force: boolean): string {
  const body = rows.map((row, index) => `\u001b[${index + 1};1H\u001b[2K${row}`).join("");
  return `\u001b[?2026h${force ? "\u001b[2J" : ""}${body}\u001b[${rows.length};1H\u001b[?25l\u001b[?2026l`;
}

/** Exposes semantic rows for fixture tests without interpreting host hover decoration. */
export function ghostLinkPlainRows(rows: readonly string[]): readonly string[] {
  return rows.map(row => stripAnsi(row));
}
