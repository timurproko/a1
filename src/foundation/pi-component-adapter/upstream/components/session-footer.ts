/**
 * Adapted from @earendil-works/pi-coding-agent 0.84.2
 * packages/coding-agent/src/modes/interactive/components/footer.ts (MIT).
 * Modifications: consumes neutral owned-UI view data rather than a concrete AgentSession.
 */
import { isAbsolute, relative, resolve, sep } from "node:path";
import { truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiSessionViewModel } from "../../../owned-ui-contracts/index.js";
import { piTheme } from "../../theme.js";

export class SessionFooter implements Component {
  constructor(private readonly getView: () => OwnedUiSessionViewModel, private readonly cwd: string) {}
  invalidate(): void {}
  dispose(): void {}

  render(width: number): string[] {
    const view = this.getView();
    const usage = view.status.usage;
    const theme = piTheme();
    const input = usage?.input ?? 0;
    const output = usage?.output ?? 0;
    const cacheRead = usage?.cacheRead ?? 0;
    const cacheWrite = usage?.cacheWrite ?? 0;
    const cost = usage?.cost ?? 0;
    const contextWindow = usage?.contextWindow ?? 0;
    const contextPercentValue = usage?.contextPercent ?? 0;
    const contextPercent = usage?.contextPercent !== null ? contextPercentValue.toFixed(1) : "?";

    let pwd = formatCwd(this.cwd, process.env.HOME || process.env.USERPROFILE);
    const branch = view.status.footer?.branch;
    if (branch) pwd = `${pwd} (${branch})`;
    const sessionName = view.status.footer?.sessionName;
    if (sessionName) pwd = `${pwd} • ${sessionName}`;

    const parts: string[] = [];
    if (input) parts.push(`↑${formatTokens(input)}`);
    if (output) parts.push(`↓${formatTokens(output)}`);
    if (cacheRead) parts.push(`R${formatTokens(cacheRead)}`);
    if (cacheWrite) parts.push(`W${formatTokens(cacheWrite)}`);
    if ((cacheRead > 0 || cacheWrite > 0) && usage?.latestCacheHitRate !== null && usage?.latestCacheHitRate !== undefined) parts.push(`CH${usage.latestCacheHitRate.toFixed(1)}%`);
    if (cost || usage?.usingSubscription) parts.push(`$${cost.toFixed(3)}${usage?.usingSubscription ? " (sub)" : ""}`);

    const autoIndicator = usage?.autoCompactEnabled === false ? "" : " (auto)";
    const contextDisplay = contextPercent === "?"
      ? `?/${formatTokens(contextWindow)}${autoIndicator}`
      : `${contextPercent}%/${formatTokens(contextWindow)}${autoIndicator}`;
    parts.push(contextPercentValue > 90 ? theme.fg("error", contextDisplay) : contextPercentValue > 70 ? theme.fg("warning", contextDisplay) : contextDisplay);

    let left = parts.join(" ");
    let leftWidth = visibleWidth(left);
    if (leftWidth > width) { left = truncateToWidth(left, width, "..."); leftWidth = visibleWidth(left); }

    const modelName = view.activeModel?.modelId ?? "no-model";
    const rightWithoutProvider = view.activeModel === null || view.thinkingLevel === "off"
      ? modelName
      : `${modelName} • ${view.thinkingLevel}`;
    let right = rightWithoutProvider;
    if ((view.status.footer?.availableProviderCount ?? 1) > 1 && view.activeModel) {
      right = `(${view.activeModel.providerId}) ${rightWithoutProvider}`;
      if (leftWidth + 2 + visibleWidth(right) > width) right = rightWithoutProvider;
    }

    const rightWidth = visibleWidth(right);
    let line: string;
    if (leftWidth + 2 + rightWidth <= width) {
      line = left + " ".repeat(width - leftWidth - rightWidth) + right;
    } else {
      const available = width - leftWidth - 2;
      if (available > 0) {
        const truncated = truncateToWidth(right, available, "");
        line = left + " ".repeat(Math.max(0, width - leftWidth - visibleWidth(truncated))) + truncated;
      } else line = left;
    }

    const lines = [
      truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "...")),
      theme.fg("dim", left) + theme.fg("dim", line.slice(left.length)),
    ];
    const statuses = view.status.footer?.extensionStatuses ?? [];
    if (statuses.length > 0) {
      const status = [...statuses].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)).map(([, text]) => sanitize(text)).join(" ");
      lines.push(truncateToWidth(status, width, theme.fg("dim", "...")));
    }
    return lines;
  }
}

function sanitize(text: string): string { return text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim(); }
function formatTokens(count: number): string {
  if (count < 1000) return count.toString();
  if (count < 10000) return `${(count / 1000).toFixed(1)}k`;
  if (count < 1000000) return `${Math.round(count / 1000)}k`;
  if (count < 10000000) return `${(count / 1000000).toFixed(1)}M`;
  return `${Math.round(count / 1000000)}M`;
}
function formatCwd(cwd: string, home: string | undefined): string {
  if (!home) return cwd;
  const resolvedCwd = resolve(cwd);
  const resolvedHome = resolve(home);
  const relativeToHome = relative(resolvedHome, resolvedCwd);
  const inside = relativeToHome === "" || (relativeToHome !== ".." && !relativeToHome.startsWith(`..${sep}`) && !isAbsolute(relativeToHome));
  if (!inside) return cwd;
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}
