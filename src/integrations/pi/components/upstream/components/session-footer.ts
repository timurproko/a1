/**
 * Provenance: @earendil-works/pi-coding-agent 1.5.2 (MIT), commit b4afdddf44e059c67ccf5097e5317d913521b470,
 * packages/coding-agent/src/modes/interactive/components/footer.ts.
 * Modifications: A1 PR links, model priority, level colors, secondary-accent name reveals, dim
 * name/row clipping; Pi intact.
 * Deviations: owned-status-level-color, owned-pull-request-badge, owned-footer-ellipsis,
 * owned-footer-model-priority, owned-session-name-reveal.
 */
import { isAbsolute, relative, resolve, sep } from "node:path";
import { hyperlink, stripTerminalSequences, truncateToWidth, visibleWidth, type Component } from "@earendil-works/pi-tui";
import type { OwnedUiSessionViewModel } from "../../../../../contracts/owned-ui/index.js";
import { piTheme } from "../../theme.js";
import { sessionNameFrame } from "../../../../../ui/components/session-name-frame.js";

export class SessionFooter implements Component {
  #reveal: { readonly from: string; readonly elapsed: number } | null = null;
  #nameBudget = Number.MAX_SAFE_INTEGER;
  private readonly getView;
  private readonly cwd;
  private readonly profile;
  private readonly show;
  constructor(getView: () => OwnedUiSessionViewModel, cwd: string, profile: "pi" | "a1" = "pi", show: () => boolean = () => true) {
    this.getView = getView; this.cwd = cwd; this.profile = profile; this.show = show;
  }
  invalidate(): void {}
  dispose(): void { this.#reveal = null; }

  setNameReveal(frame: { readonly from: string; readonly elapsed: number } | null): boolean {
    this.#reveal = this.profile === "a1" ? frame : null;
    if (this.#reveal && this.#nameFrame(this.getView().status.footer?.sessionName ?? "", this.#nameBudget).done) this.#reveal = null;
    return this.#reveal !== null;
  }

  #nameFrame(name: string, width: number): { readonly text: string; readonly done: boolean } {
    const theme = piTheme();
    const secondary = rgb(theme.getFgAnsi("mdHeading"));
    const settled = rgb(theme.getFgAnsi("dim"));
    const clip = (text: string, columns: number) => stripTerminalSequences(truncateToWidth(text, columns, "…"));
    if (!this.#reveal) return { text: theme.fg("dim", clip(name, width)), done: true };
    return sessionNameFrame({
      ...this.#reveal, to: name, width,
      truecolor: theme.getColorMode() === "truecolor" && secondary !== null && settled !== null,
      measure: visibleWidth, clip,
      dim: text => theme.fg("dim", text),
      paint: (text, brightness, progress) => {
        if (text === "…") return theme.fg("dim", text);
        const channels = secondary!.map((value, index) => {
          const bright = value + (235 - value) * brightness;
          return Math.round(bright + (settled![index]! - bright) * progress);
        });
        return `\u001b[38;2;${channels.join(";")}m${text}\u001b[39m`;
      },
    });
  }

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
    const sessionName = view.status.footer?.sessionName;
    const pullRequest = this.profile === "a1" ? view.status.footer?.pullRequest : null;
    let pathRow: string;
    if (pullRequest == null) {
      pathRow = theme.fg("dim", this.profile === "pi" && sessionName ? `${pwd} • ${sessionName}` : pwd);
    } else {
      const badge = hyperlink(theme.fg("mdLink", `#${pullRequest.number}`), pullRequest.url);
      const separator = theme.fg("dim", " • ");
      const budget = width - visibleWidth(badge) - visibleWidth(separator);
      const prefix = budget > 0 ? truncateToWidth(theme.fg("dim", pwd), budget, dimEllipsis) : "";
      pathRow = visibleWidth(badge) > width ? truncateToWidth(dimEllipsis, width, "")
        : (visibleWidth(prefix) > 0 ? prefix + separator : "") + badge;
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
    this.#nameBudget = Math.max(0, width - leftWidth - rightWidth - 2 - 3);
    if (this.profile === "a1" && sessionName && this.#nameBudget > 0) {
      left += theme.fg("dim", " • ") + this.#nameFrame(sessionName, this.#nameBudget).text;
      leftWidth = visibleWidth(left);
    }
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

function rgb(ansi: string): number[] | null {
  const match = /\u001b\[38;2;(\d+);(\d+);(\d+)m/u.exec(ansi);
  return match ? match.slice(1).map(Number) : null;
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
