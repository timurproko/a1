import { Text } from "@earendil-works/pi-tui";
import { formatCacheWarmingStatus, type PiShellSessionInfoPresentation } from "./shell-presenters-info.js";
import { ensureTheme, formatSessionTokens } from "./shell-shared-facade.js";
import { piTheme } from "./theme.js";

export interface PiShellSessionInfoReferenceDocument {
  readonly preamble: readonly string[];
  readonly sections: readonly { readonly title: string; readonly rows: readonly string[] }[];
}

/** Renders the pinned report values while leaving group names semantic for the owned screen. */
export function renderPiShellSessionInfoReferenceDocument(
  presentation: PiShellSessionInfoPresentation,
  width: number,
): PiShellSessionInfoReferenceDocument {
  ensureTheme();
  const { stats, sessionName, cacheWaste, usageBreakdown, cacheWarming } = presentation;
  const render = (rows: readonly string[]) => new Text(rows.join("\n"), 1, 0).render(width);
  const preamble = [
    ...(sessionName ? [`${piTheme().fg("dim", "Name:")} ${sessionName}`] : []),
    `${piTheme().fg("dim", "File:")} ${stats.sessionFile ?? "In-memory"}`,
    `${piTheme().fg("dim", "ID:")} ${stats.sessionId}`,
  ];
  const messages = [
    `${piTheme().fg("dim", "Total:")} ${stats.totalMessages}`,
    `${piTheme().fg("dim", "User:")} ${stats.userMessages}`,
    `${piTheme().fg("dim", "Assistant:")} ${stats.assistantMessages}`,
    `${piTheme().fg("dim", "Tools:")} ${stats.toolCalls} calls, ${stats.toolResults} results`,
  ];
  const { input, cacheRead, cacheWrite } = stats.tokens;
  const promptTokens = input + cacheRead + cacheWrite;
  const tokens = [`${piTheme().fg("dim", "Input:")} ${promptTokens.toLocaleString()}`];
  if (promptTokens > 0 && (cacheRead > 0 || cacheWrite > 0)) {
    tokens.push(`  ${piTheme().fg("dim", "Cached:")} ${cacheRead.toLocaleString()} ${piTheme().fg("dim", `(${((cacheRead / promptTokens) * 100).toFixed(1)}%)`)}`);
    const written = cacheWrite > 0 ? ` ${piTheme().fg("dim", `(${cacheWrite.toLocaleString()} written to cache)`)}` : "";
    tokens.push(`  ${piTheme().fg("dim", "Uncached:")} ${(input + cacheWrite).toLocaleString()}${written}`);
  }
  tokens.push(`${piTheme().fg("dim", "Output:")} ${stats.tokens.output.toLocaleString()}`);
  tokens.push(`${piTheme().fg("dim", "Total:")} ${stats.tokens.total.toLocaleString()}`);

  const warmingStatus = cacheWarming.status;
  const warming = [
    `${piTheme().fg("dim", "Mode:")} ${cacheWarming.mode}`,
    `${piTheme().fg("dim", "Status:")} ${warmingStatus ? formatCacheWarmingStatus(warmingStatus) : "Inactive (cache warming unavailable)"}`,
  ];
  const warmingDecision = warmingStatus?.decision;
  if (warmingDecision?.economicsAvailable) {
    warming.push(`${piTheme().fg("dim", "Cache miss penalty:")} $${warmingDecision.missCost.toFixed(3)}`);
    warming.push(`${piTheme().fg("dim", "Refresh cost:")} $${warmingDecision.warmCost.toFixed(3)}`);
  }

  const sections: Array<{ readonly title: string; readonly rows: readonly string[] }> = [
    { title: "Messages", rows: render(messages) },
    { title: "Tokens", rows: render(tokens) },
    { title: "Cache Warming", rows: render(warming) },
  ];
  if (stats.cost > 0 || cacheWaste.missedTokens > 0) {
    const cost = [`${piTheme().fg("dim", "Total:")} $${stats.cost.toFixed(3)}`];
    if (usageBreakdown.length > 1) for (const entry of usageBreakdown) {
      cost.push(`  ${piTheme().fg("dim", `${entry.key}:`)} $${entry.cost.toFixed(3)} ${piTheme().fg("dim", `(${formatSessionTokens(entry.tokens)} tokens)`)}`);
    }
    if (cacheWaste.missedTokens > 0) {
      const detail = `${cacheWaste.missedTokens.toLocaleString()} tokens, ${cacheWaste.missCount === 1 ? "1 miss" : `${cacheWaste.missCount} misses`}`;
      cost.push(cacheWaste.missedCost >= 0.0001
        ? `${piTheme().fg("dim", "Cache Re-billed:")} $${cacheWaste.missedCost.toFixed(3)} ${piTheme().fg("dim", `(${detail})`)}`
        : `${piTheme().fg("dim", "Cache Re-billed:")} ${detail}`);
    }
    sections.push({ title: "Cost", rows: render(cost) });
  }
  return { preamble: render(preamble), sections };
}
