import { DynamicBorder, getMarkdownTheme } from "../startup-public.js";
import { Container, Markdown, Spacer, Text, type KeybindingsConfig } from "@earendil-works/pi-tui";
import { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";
import { PINNED_PI_LAYOUT, piTheme } from "./theme.js";
import { componentPort, ensureTheme, formatSessionTokens, type PiShellComponentPort, type PiShellExtensionRendererResolver } from "./shell-shared-facade.js";

export interface PiShellSessionInfoPresentation {
  readonly sessionName?: string;
  readonly stats: {
    readonly sessionFile?: string; readonly sessionId: string; readonly userMessages: number;
    readonly assistantMessages: number; readonly toolCalls: number; readonly toolResults: number; readonly totalMessages: number;
    readonly tokens: { readonly input: number; readonly output: number; readonly cacheRead: number; readonly cacheWrite: number; readonly total: number };
    readonly cost: number;
  };
  readonly cacheWaste: { readonly missedTokens: number; readonly missedCost: number; readonly missCount: number };
  readonly usageBreakdown: readonly { readonly key: string; readonly cost: number; readonly tokens: number }[];
  readonly cacheWarming: PiShellCacheWarmingPresentation;
}

export interface PiShellCacheWarmingPresentation {
  readonly mode: string;
  readonly status?: {
    readonly state: "inactive" | "scheduled" | "refreshing";
    readonly reason?: string;
    readonly nextWarmAt?: number;
    readonly extensionOverride?: boolean;
    readonly decision?: {
      readonly phase: "streaming" | "idle";
      readonly action: string;
      readonly warmCost: number;
      readonly missCost: number;
      readonly continuationProbability: number;
      readonly expectedSavings: number;
      readonly economicsAvailable: boolean;
    };
  };
}

export function renderPiShellStatusText(message: string, width: number, outputPad: 0 | 1 = PINNED_PI_LAYOUT.outputPad): readonly string[] {
  ensureTheme();
  return new Text(piTheme().fg("dim", message), outputPad, 0).render(width);
}

export interface PiShellCommandMessagePresentation {
  readonly kind: "error" | "warning" | "accent" | "new" | "name" | "debug";
  readonly message: string;
  readonly detail?: string;
}

export function renderPiShellCommandMessage(
  presentation: PiShellCommandMessagePresentation,
  width: number,
  outputPad: 0 | 1 = PINNED_PI_LAYOUT.outputPad,
): readonly string[] {
  ensureTheme();
  const { kind, message, detail } = presentation;
  const prefix = kind === "error" ? "Error: " : kind === "warning" ? "Warning: " : "";
  const color = kind === "name" ? "dim" : kind === "error" || kind === "warning" ? kind : "accent";
  const content = piTheme().fg(color, `${prefix}${message}`)
    + (kind === "debug" && detail ? `\n${piTheme().fg("muted", detail)}` : "");
  // Compatibility: pinned errors honor outputPad; warnings and command notices retain
  // one-cell padding. New-session/debug notices also own one vertical padding row.
  const text = new Text(content, kind === "error" ? outputPad : 1, kind === "new" || kind === "debug" ? 1 : 0);
  return [
    ...(kind === "name" && detail ? renderPiShellCommandMessage({ kind: "warning", message: detail }, width) : []),
    ...new Spacer(1).render(width),
    ...text.render(width),
  ];
}

const CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS = 0.05;

function formatWarmingDollars(value: number): string {
  return value < 0 ? `-${Math.abs(value).toFixed(3)}` : `${value.toFixed(3)}`;
}

function formatWarmingEconomics(decision: NonNullable<NonNullable<PiShellCacheWarmingPresentation["status"]>["decision"]>): string {
  if (!decision.economicsAvailable) return "cache economics unavailable";
  const probability = Math.round(decision.continuationProbability * 100);
  const probabilityText = decision.phase === "streaming"
    ? `${probability}% continuation probability while agent is running`
    : `${probability}% continuation probability`;
  const comparison = decision.action === "warm" ? ">=" : "<";
  return `${probabilityText}, expected savings ${formatWarmingDollars(decision.expectedSavings)} ${comparison} ${CACHE_WARMING_MINIMUM_EXPECTED_SAVINGS.toFixed(3)}`;
}

function formatWarmingDecisionTime(nextWarmAt: number | undefined, now: number): string {
  if (nextWarmAt === undefined || nextWarmAt <= now) return "Decision now";
  let remainingSeconds = Math.ceil((nextWarmAt - now) / 1000);
  const hours = Math.floor(remainingSeconds / 3600);
  remainingSeconds %= 3600;
  const minutes = Math.floor(remainingSeconds / 60);
  const seconds = remainingSeconds % 60;
  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
  return `Decision in ${parts.join(" ")}`;
}

/** The one-line warming status the pinned session report shows; a decision is attached once warming acted. */
function formatCacheWarmingStatus(status: NonNullable<PiShellCacheWarmingPresentation["status"]>, now = Date.now()): string {
  const decision = status.decision;
  if (!decision || (status.state === "inactive" && !decision.economicsAvailable && !status.extensionOverride)) {
    return `Inactive (${status.reason ?? "unknown reason"})`;
  }
  const details = status.extensionOverride
    ? `extension override, ${formatWarmingEconomics(decision)}`
    : `${formatWarmingEconomics(decision)} -> ${decision.action}`;
  if (status.state === "inactive") return `Stopped (${details})`;
  if (status.state === "refreshing") return `Warming cache (${details})`;
  return `${formatWarmingDecisionTime(status.nextWarmAt, now)} (${details})`;
}
export function createPiShellSessionInfo(presentation: PiShellSessionInfoPresentation): PiShellComponentPort {
  ensureTheme();
  const { stats, sessionName, cacheWaste, usageBreakdown, cacheWarming } = presentation;
  let info = `${piTheme().bold("Session Info")}\n\n`;
  if (sessionName) info += `${piTheme().fg("dim", "Name:")} ${sessionName}\n`;
  info += `${piTheme().fg("dim", "File:")} ${stats.sessionFile ?? "In-memory"}\n${piTheme().fg("dim", "ID:")} ${stats.sessionId}\n\n`;
  info += `${piTheme().bold("Messages")}\n${piTheme().fg("dim", "Total:")} ${stats.totalMessages}\n${piTheme().fg("dim", "User:")} ${stats.userMessages}\n`;
  info += `${piTheme().fg("dim", "Assistant:")} ${stats.assistantMessages}\n${piTheme().fg("dim", "Tools:")} ${stats.toolCalls} calls, ${stats.toolResults} results\n\n`;
  info += `${piTheme().bold("Tokens")}\n`;
  const { input, cacheRead, cacheWrite } = stats.tokens;
  const promptTokens = input + cacheRead + cacheWrite;
  info += `${piTheme().fg("dim", "Input:")} ${promptTokens.toLocaleString()}\n`;
  if (promptTokens > 0 && (cacheRead > 0 || cacheWrite > 0)) {
    info += `  ${piTheme().fg("dim", "Cached:")} ${cacheRead.toLocaleString()} ${piTheme().fg("dim", `(${((cacheRead / promptTokens) * 100).toFixed(1)}%)`)}\n`;
    const written = cacheWrite > 0 ? ` ${piTheme().fg("dim", `(${cacheWrite.toLocaleString()} written to cache)`)}` : "";
    info += `  ${piTheme().fg("dim", "Uncached:")} ${(input + cacheWrite).toLocaleString()}${written}\n`;
  }
  info += `${piTheme().fg("dim", "Output:")} ${stats.tokens.output.toLocaleString()}\n${piTheme().fg("dim", "Total:")} ${stats.tokens.total.toLocaleString()}\n`;
  const warmingStatus = cacheWarming.status;
  info += `\n${piTheme().bold("Cache Warming")}\n${piTheme().fg("dim", "Mode:")} ${cacheWarming.mode}\n`;
  info += `${piTheme().fg("dim", "Status:")} ${warmingStatus ? formatCacheWarmingStatus(warmingStatus) : "Inactive (cache warming unavailable)"}\n`;
  const warmingDecision = warmingStatus?.decision;
  if (warmingDecision?.economicsAvailable) {
    info += `${piTheme().fg("dim", "Cache miss penalty:")} $${warmingDecision.missCost.toFixed(3)}\n`;
    info += `${piTheme().fg("dim", "Refresh cost:")} $${warmingDecision.warmCost.toFixed(3)}\n`;
  }
  if (stats.cost > 0 || cacheWaste.missedTokens > 0) {
    info += `\n${piTheme().bold("Cost")}\n${piTheme().fg("dim", "Total:")} $${stats.cost.toFixed(3)}`;
    if (usageBreakdown.length > 1) for (const entry of usageBreakdown) info += `\n  ${piTheme().fg("dim", `${entry.key}:`)} $${entry.cost.toFixed(3)} ${piTheme().fg("dim", `(${formatSessionTokens(entry.tokens)} tokens)`)}`;
    if (cacheWaste.missedTokens > 0) {
      const detail = `${cacheWaste.missedTokens.toLocaleString()} tokens, ${cacheWaste.missCount === 1 ? "1 miss" : `${cacheWaste.missCount} misses`}`;
      info += cacheWaste.missedCost >= 0.0001 ? `\n${piTheme().fg("dim", "Cache Re-billed:")} $${cacheWaste.missedCost.toFixed(3)} ${piTheme().fg("dim", `(${detail})`)}` : `\n${piTheme().fg("dim", "Cache Re-billed:")} ${detail}`;
    }
  }
  const container = new Container(); container.addChild(new Spacer(1)); container.addChild(new Text(info, 1, 0));
  return componentPort(container);
}

export function createPiShellCollapsedChangelog(): PiShellComponentPort {
  ensureTheme();
  const container = new Container(); container.addChild(new Spacer(1)); container.addChild(new DynamicBorder());
  container.addChild(new Text(`${piTheme().bold(piTheme().fg("accent", "What's New"))}\n${piTheme().fg("muted", "Run /changelog to view the full release notes.")}`, 1, 0));
  container.addChild(new DynamicBorder()); return componentPort(container);
}

export function createPiShellChangelog(markdown: string): PiShellComponentPort {
  ensureTheme();
  const container = new Container(); container.addChild(new Spacer(1)); container.addChild(new DynamicBorder());
  container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "What's New")), 1, 0)); container.addChild(new Spacer(1));
  container.addChild(changelogMarkdown(markdown)); container.addChild(new DynamicBorder());
  return componentPort(container);
}

/** The changelog document rows the feed presenter shows, without its spacer, borders, and heading. */
export function renderPiShellChangelogLines(markdown: string, width: number): readonly string[] {
  ensureTheme();
  return changelogMarkdown(markdown).render(width);
}

function changelogMarkdown(markdown: string): Markdown {
  return new Markdown(markdown.trim() || "No changelog entries found.", 1, 1, getMarkdownTheme());
}

function shortcutDisplay(key: string): string {
  // Platform: pinned Pi labels Alt as Option on macOS, including extension shortcuts.
  return key.split("/").map(binding => binding.split("+").map(part => {
    const label = process.platform === "darwin" && part.toLowerCase() === "alt" ? "option" : part;
    return label.charAt(0).toUpperCase() + label.slice(1);
  }).join("+")).join("/");
}

/** What the hotkeys presenters render: the editor bindings and the extension shortcuts declared over them. */
export interface PiShellHotkeysPresentation {
  readonly bindings?: KeybindingsConfig;
  readonly getShortcuts?: NonNullable<PiShellExtensionRendererResolver["getShortcuts"]>;
  readonly profile?: "pi" | "a1";
}

export function createPiShellHotkeys(
  bindings?: KeybindingsConfig,
  getShortcuts: NonNullable<PiShellExtensionRendererResolver["getShortcuts"]> = () => [],
  profile: "pi" | "a1" = "pi",
): PiShellComponentPort {
  ensureTheme();
  const markdown = hotkeysMarkdown(bindings, getShortcuts, profile);
  const container = new Container(); container.addChild(new Spacer(1)); container.addChild(new DynamicBorder()); container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "Keyboard Shortcuts")), 1, 0)); container.addChild(new Spacer(1)); container.addChild(hotkeysMarkdownComponent(markdown)); container.addChild(new DynamicBorder());
  return componentPort(container);
}

/** The keyboard-shortcut document rows the feed presenter shows, without its spacer, borders, and heading. */
export function renderPiShellHotkeysLines(presentation: PiShellHotkeysPresentation, width: number): readonly string[] {
  ensureTheme();
  return hotkeysMarkdownComponent(hotkeysMarkdown(presentation.bindings, presentation.getShortcuts ?? (() => []), presentation.profile ?? "pi")).render(width);
}

function hotkeysMarkdownComponent(markdown: string): Markdown {
  return new Markdown(markdown, 1, 1, getMarkdownTheme());
}

function hotkeysMarkdown(
  bindings: KeybindingsConfig | undefined,
  getShortcuts: NonNullable<PiShellExtensionRendererResolver["getShortcuts"]>,
  profile: "pi" | "a1",
): string {
  const keys = profile === "a1" ? KeybindingsManager.fromOwnedBindings(bindings) : new KeybindingsManager(bindings);
  // Compatibility: the owned viewport consumes these physical chords before editor actions.
  const display = (action: Parameters<typeof keys.getKeys>[0]) => keys.getKeys(action)
    .filter(key => profile !== "a1" || (key !== "ctrl+home" && key !== "ctrl+end"))
    .map(shortcutDisplay).join("/");
  const row = (actions: readonly Parameters<typeof keys.getKeys>[0][], description: string) => `| ${actions.map(action => {
    const label = display(action);
    return profile === "a1" && label.length === 0
      ? action === "app.model.select" ? "Unbound (`/models`)" : "Unbound"
      : `\`${label}\``;
  }).join(" / ")} | ${description} |`;
  let markdown = ["**Navigation**", "| Key | Action |", "|-----|--------|", row(["tui.editor.cursorUp", "tui.editor.cursorDown", "tui.editor.cursorLeft", "tui.editor.cursorRight"], "Move cursor / browse history"), row(["tui.editor.cursorWordLeft", "tui.editor.cursorWordRight"], "Move by word"), row(["tui.editor.cursorLineStart"], profile === "a1" ? "Start of prompt line" : "Start of line"), row(["tui.editor.cursorLineEnd"], profile === "a1" ? "End of prompt line" : "End of line"), ...(profile === "a1" ? ["| `Ctrl+Home` | Start of content |", "| `Ctrl+End` | End of content / follow output |"] : []), row(["tui.editor.jumpForward"], "Jump forward to character"), row(["tui.editor.jumpBackward"], "Jump backward to character"), row(["tui.editor.pageUp", "tui.editor.pageDown"], "Scroll by page"), "", "**Editing**", "| Key | Action |", "|-----|--------|", row(["tui.input.submit"], "Send message"), row(["tui.input.newLine"], `New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""}`), row(["tui.editor.deleteWordBackward"], "Delete word backwards"), row(["tui.editor.deleteWordForward"], "Delete word forwards"), row(["tui.editor.deleteToLineStart"], "Delete to start of line"), row(["tui.editor.deleteToLineEnd"], "Delete to end of line"), row(["tui.editor.yank"], "Paste the most-recently-deleted text"), row(["tui.editor.yankPop"], "Cycle through the deleted text after pasting"), row(["tui.editor.undo"], "Undo"), "", "**Other**", "| Key | Action |", "|-----|--------|", row(["tui.input.tab"], "Path completion / accept autocomplete"), row(["app.interrupt"], "Cancel autocomplete / abort streaming"), row(["app.clear"], "Clear editor (first) / exit (second)"), row(["app.exit"], "Exit (when editor is empty)"), row(["app.suspend"], "Suspend to background"), row(["app.thinking.cycle"], "Cycle thinking level"), row(["app.model.cycleForward", "app.model.cycleBackward"], "Cycle models"), row(["app.model.select"], profile === "a1" ? "Open the Models dialog" : "Open model selector"), row(["app.tools.expand"], "Toggle tool output expansion"), row(["app.thinking.toggle"], "Toggle thinking block visibility"), row(["app.editor.external"], "Edit message in external editor"), row(["app.message.copy"], "Copy selection or last assistant message"), row(["app.message.followUp"], "Queue follow-up message"), row(["app.message.dequeue"], "Restore queued messages"), row(["app.clipboard.pasteImage"], "Paste image or text from clipboard"), "| `/` | Slash commands |", "| `!` | Run bash command |", "| `!!` | Run bash command (excluded from context) |", ...(profile === "a1" ? ["", "**Models dialog**", "| Key | Action |", "|-----|--------|", "| `Space` | Toggle the selected model in the cycling scope |", "| `Tab` | Switch the all/scoped filter |", row(["app.models.save"], "Save the scope to settings"), row(["app.models.enableAll"], "Scope every listed model"), row(["app.models.clearAll"], "Clear the listed models from the scope"), row(["app.models.toggleProvider"], "Toggle the selected model's provider"), row(["app.models.reorderUp", "app.models.reorderDown"], "Reorder the cycling scope")] : [])].join("\n");
  const shortcuts = getShortcuts(bindings ?? keys.getEffectiveConfig());
  if (shortcuts.length > 0) {
    markdown += "\n\n**Extensions**\n| Key | Action |\n|-----|--------|\n";
    markdown += shortcuts.map(shortcut => `| \`${shortcutDisplay(shortcut.key)}\` | ${shortcut.description} |`).join("\n");
  }
  return markdown;
}
