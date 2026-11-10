import { sliceByColumn, Text, visibleWidth } from "@earendil-works/pi-tui";
import { formatCacheWarmingStatus, type PiShellSessionInfoPresentation } from "./shell-presenters-info.js";
import { ensureTheme, formatSessionTokens } from "./shell-shared-facade.js";
import { piTheme } from "./theme.js";

interface PiShellSessionInfoReferenceDocument {
  readonly preamble: readonly string[];
  readonly sections: readonly { readonly title: string; readonly rows: readonly string[] }[];
}

interface InfoRow {
  readonly label: string;
  readonly value: string;
  readonly indent?: number;
}

/** Splits a plain path by visible columns, preserving every source grapheme in order. */
function splitSessionFile(sessionFile: string, firstWidth: number, continuationWidth: number): readonly string[] {
  const rows: string[] = [];
  let remaining = sessionFile;
  let rowWidth = firstWidth;
  while (remaining) {
    let row = sliceByColumn(remaining, 0, rowWidth, true);
    if (!row && rowWidth !== continuationWidth) {
      rows.push(""); rowWidth = continuationWidth; continue;
    }
    // Compatibility: preserve a wide grapheme even when the outer frame cannot fit it.
    if (!row) row = sliceByColumn(remaining, 0, rowWidth);
    rows.push(row);
    remaining = remaining.slice(row.length);
    rowWidth = continuationWidth;
  }
  return rows.length > 0 ? rows : [""];
}

/** Renders complete report data in semantic rows sharing a left-aligned value column. */
export function renderPiShellSessionInfoReferenceDocument(
  presentation: PiShellSessionInfoPresentation,
  width: number,
): PiShellSessionInfoReferenceDocument {
  ensureTheme();
  const { stats, sessionName, cacheWaste, usageBreakdown, cacheWarming } = presentation;
  const identity: InfoRow[] = [
    ...(sessionName ? [{ label: "Name:", value: sessionName }] : []),
    { label: "File:", value: stats.sessionFile ?? "In-memory" },
    { label: "ID:", value: stats.sessionId },
  ];
  const messages: InfoRow[] = [
    { label: "Total:", value: String(stats.totalMessages) },
    { label: "User:", value: String(stats.userMessages) },
    { label: "Assistant:", value: String(stats.assistantMessages) },
    { label: "Tools:", value: `${stats.toolCalls} calls, ${stats.toolResults} results` },
  ];
  const { input, cacheRead, cacheWrite } = stats.tokens;
  const promptTokens = input + cacheRead + cacheWrite;
  const tokens: InfoRow[] = [{ label: "Input:", value: promptTokens.toLocaleString() }];
  if (promptTokens > 0 && (cacheRead > 0 || cacheWrite > 0)) {
    tokens.push({ label: "Cached:", indent: 2, value: `${cacheRead.toLocaleString()} ${piTheme().fg("dim", `(${((cacheRead / promptTokens) * 100).toFixed(1)}%)`)}` });
    const written = cacheWrite > 0 ? ` ${piTheme().fg("dim", `(${cacheWrite.toLocaleString()} written to cache)`)}` : "";
    tokens.push({ label: "Uncached:", indent: 2, value: `${(input + cacheWrite).toLocaleString()}${written}` });
  }
  tokens.push({ label: "Output:", value: stats.tokens.output.toLocaleString() });
  tokens.push({ label: "Total:", value: stats.tokens.total.toLocaleString() });
  const warmingStatus = cacheWarming.status;
  const warming: InfoRow[] = [
    { label: "Mode:", value: cacheWarming.mode },
    { label: "Status:", value: warmingStatus ? formatCacheWarmingStatus(warmingStatus) : "Inactive (cache warming unavailable)" },
  ];
  const decision = warmingStatus?.decision;
  if (decision?.economicsAvailable) {
    warming.push({ label: "Cache miss penalty:", value: `$${decision.missCost.toFixed(3)}` });
    warming.push({ label: "Refresh cost:", value: `$${decision.warmCost.toFixed(3)}` });
  }
  const groups = [{ title: "Messages", rows: messages }, { title: "Tokens", rows: tokens }, { title: "Cache Warming", rows: warming }];
  if (stats.cost > 0 || cacheWaste.missedTokens > 0) {
    const cost: InfoRow[] = [{ label: "Total:", value: `$${stats.cost.toFixed(3)}` }];
    if (usageBreakdown.length > 1) for (const entry of usageBreakdown) {
      cost.push({ label: `${entry.key}:`, indent: 2, value: `$${entry.cost.toFixed(3)} ${piTheme().fg("dim", `(${formatSessionTokens(entry.tokens)} tokens)`)}` });
    }
    if (cacheWaste.missedTokens > 0) {
      const detail = `${cacheWaste.missedTokens.toLocaleString()} tokens, ${cacheWaste.missCount === 1 ? "1 miss" : `${cacheWaste.missCount} misses`}`;
      cost.push({ label: "Cache Re-billed:", value: cacheWaste.missedCost >= 0.0001
        ? `$${cacheWaste.missedCost.toFixed(3)} ${piTheme().fg("dim", `(${detail})`)}` : detail });
    }
    groups.push({ title: "Cost", rows: cost });
  }

  // Compatibility: match Text's reduced-padding rule so explicit path breaks survive rendering.
  const padding = Math.min(1, Math.max(0, Math.floor((width - 1) / 2)));
  const contentWidth = Math.max(1, width - padding * 2);
  const allRows = [...identity, ...groups.flatMap(group => group.rows)];
  const column = Math.min(Math.max(...allRows.map(row => (row.indent ?? 0) + visibleWidth(row.label))) + 1, contentWidth - 1);
  const prefix = (row: InfoRow): string => `${" ".repeat(row.indent ?? 0)}${piTheme().fg("dim", row.label)}${" ".repeat(Math.max(1, column - (row.indent ?? 0) - visibleWidth(row.label)))}`;
  const render = (rows: readonly InfoRow[]) => new Text(rows.map(row => `${prefix(row)}${row.value}`).join("\n"), 1, 0).render(width);
  const preamble: string[] = [];
  for (const row of identity) {
    if (row.label !== "File:") { preamble.push(`${prefix(row)}${row.value}`); continue; }
    const label = prefix(row);
    const firstWidth = Math.max(0, contentWidth - visibleWidth(label));
    const [first = "", ...continuation] = splitSessionFile(row.value, firstWidth, contentWidth);
    preamble.push(firstWidth > 0 ? `${label}${first}` : piTheme().fg("dim", row.label), ...continuation);
  }
  return {
    preamble: new Text(preamble.join("\n"), 1, 0).render(width),
    sections: groups.map(group => ({ title: group.title, rows: render(group.rows) })),
  };
}
