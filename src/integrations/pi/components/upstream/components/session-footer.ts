/**
 * Provenance: @earendil-works/pi-coding-agent 1.4.0 (MIT), commit 4a080252f06caf63a525d7873c5d94d3c23887e0,
 * packages/coding-agent/src/modes/interactive/components/footer.ts.
 * Modifications: Owned UI/routing; A1 level color, linked PRs, resident names, dim ellipsis and model
 * priority; Pi unchanged.
 * Deviations: owned-status-level-color, owned-pull-request-badge, owned-resident-session-name,
 * owned-footer-ellipsis, owned-footer-model-priority.
 */
import { isAbsolute, relative, resolve, sep } from "node:path";
import { hyperlink, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiSessionViewModel } from "../../../../../contracts/owned-ui/index.js";
import { piTheme } from "../../theme.js";

export class SessionFooter implements Component {
  private readonly getView: () => OwnedUiSessionViewModel;
  private readonly cwd: string;
  private readonly profile: "pi" | "a1";
  private readonly show: () => boolean;
  private readonly showSessionName: boolean;
  constructor(getView: () => OwnedUiSessionViewModel, cwd: string, profile: "pi" | "a1" = "pi", show: () => boolean = () => true, showSessionName = true) {
    this.getView = getView; this.cwd = cwd; this.profile = profile; this.show = show; this.showSessionName = showSessionName;
  }
  invalidate(): void {}
  dispose(): void {}

  render(width: number): string[] {
    const view = this.getView();
    const usage = view.status.usage;
    const theme = piTheme();
    const dimEllipsis = theme.fg("dim", this.profile === "a1" ? "…" : "...");
    const input = usage?.input ?? 0;
    const output = usage?.output ?? 0;
    const cacheRead = usage?.cacheRead ?? 0;
    const cacheWrite = usage?.cacheWrite ?? 0;
    const cost = usage?.cost ?? 0;
    const contextWindow = usage?.contextWindow ?? 0;
    const contextPercentValue = usage?.contextPercent ?? 0;
    const contextPercent = usage?.contextAvailable !== false && usage?.contextPercent === null
      ? "?" : contextPercentValue.toFixed(1);

    const repositoryPath = this.profile === "a1" ? view.status.footer?.repositoryPath ?? this.cwd : this.cwd;
    let pwd = formatCwd(repositoryPath, process.env.HOME || process.env.USERPROFILE);
    const branch = view.status.footer?.branch;
    if (branch) pwd = `${pwd} (${branch})`;
    const sessionName = this.showSessionName ? view.status.footer?.sessionName : null;
    const pullRequest = this.profile === "a1" ? view.status.footer?.pullRequest : null;
    let pathRow: string;
    if (pullRequest == null) {
      pathRow = theme.fg("dim", sessionName ? `${pwd} • ${sessionName}` : pwd);
    } else {
      const badge = theme.fg("dim", " ")
        + hyperlink(theme.fg("mdLink", `#${pullRequest.number}`), pullRequest.url);
      const sessionSuffix = sessionName ? theme.fg("dim", ` • ${sessionName}`) : "";
      const full = theme.fg("dim", pwd) + badge + sessionSuffix;
      if (visibleWidth(full) <= width) pathRow = full;
      else if (visibleWidth(badge) <= width) {
        pathRow = truncateToWidth(theme.fg("dim", pwd), width - visibleWidth(badge), dimEllipsis) + badge;
      } else {
        pathRow = truncateToWidth(badge, width, dimEllipsis);
      }
    }

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
    if (leftWidth > width) { left = truncateToWidth(left, width, this.profile === "a1" ? dimEllipsis : "..."); leftWidth = visibleWidth(left); }

    const modelName = view.activeModel?.modelId ?? "no-model";
    let rightWithoutProvider = this.profile === "a1"
      ? view.activeModel === null || !this.show() ? theme.fg("dim", modelName)
        : theme.fg("dim", `${modelName} • `) + theme.getThinkingBorderColor(view.thinkingLevel)(view.thinkingLevel)
      : view.activeModel === null || view.thinkingLevel === "off" || !this.show() ? modelName : `${modelName} • ${view.thinkingLevel}`;
    const modelLevel = rightWithoutProvider;
    const routed = view.routedModel;
    if (routed) {
      const level = routed.thinkingLevel === undefined ? "" : ` • ${routed.thinkingLevel}`;
      const route = ` → ${routed.model.modelId}${level}`;
      rightWithoutProvider += this.profile === "a1" ? theme.fg("dim", route) : route;
    }
    let right = rightWithoutProvider;
    if ((view.status.footer?.availableProviderCount ?? 1) > 1 && view.activeModel) {
      const provider = `(${view.activeModel.providerId}) `;
      right = (this.profile === "a1" ? theme.fg("dim", provider) : provider) + rightWithoutProvider;
      if (leftWidth + 2 + visibleWidth(right) > width) right = rightWithoutProvider;
    }

    if (this.profile === "a1" && leftWidth + 2 + visibleWidth(right) > width) {
      right = [rightWithoutProvider, modelLevel].find(value => visibleWidth(value) + 2 <= width)
        ?? truncateToWidth(theme.fg("dim", modelName), width, dimEllipsis);
      left = truncateToWidth(left, Math.max(0, width - visibleWidth(right) - 2), dimEllipsis);
      leftWidth = visibleWidth(left);
    }
    const rightWidth = visibleWidth(right);
    let line: string;
    if (this.profile === "a1" && leftWidth === 0) {
      line = " ".repeat(Math.max(0, width - rightWidth)) + right;
    } else if (leftWidth + 2 + rightWidth <= width) {
      line = left + " ".repeat(width - leftWidth - rightWidth) + right;
    } else {
      const available = width - leftWidth - 2;
      if (available > 0) {
        const truncated = truncateToWidth(right, available, "");
        line = left + " ".repeat(Math.max(0, width - leftWidth - visibleWidth(truncated))) + truncated;
      } else line = left;
    }

    const lines = [
      truncateToWidth(pathRow, width, dimEllipsis),
      theme.fg("dim", left) + (this.profile === "a1" ? line.slice(left.length) : theme.fg("dim", line.slice(left.length))),
    ];
    const statuses = view.status.footer?.extensionStatuses ?? [];
    if (statuses.length > 0) {
      const status = [...statuses].sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey)).map(([, text]) => sanitize(text)).join(" ");
      lines.push(truncateToWidth(status, width, dimEllipsis));
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
  const relativeToHome = relative(resolve(home), resolve(cwd));
  if (isAbsolute(relativeToHome) || relativeToHome === ".." || relativeToHome.startsWith(`..${sep}`)) return cwd;
  return relativeToHome === "" ? "~" : `~${sep}${relativeToHome}`;
}
