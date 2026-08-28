import { DynamicBorder, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Markdown, Spacer, Text } from "#pi-tui";
import { KeybindingsManager } from "./upstream/adjacent/core/keybindings.js";
import { PINNED_PI_LAYOUT, piTheme } from "./theme.js";
import { componentPort, ensureTheme, formatSessionTokens, type PiShellComponentPort } from "./shell-shared-facade.js";

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
}

export function renderPiShellStatusText(message: string, width: number, outputPad: 0 | 1 = PINNED_PI_LAYOUT.outputPad): readonly string[] {
  ensureTheme();
  return new Text(piTheme().fg("dim", message), outputPad, 0).render(width);
}

export function createPiShellSessionInfo(presentation: PiShellSessionInfoPresentation): PiShellComponentPort {
  ensureTheme();
  const { stats, sessionName, cacheWaste, usageBreakdown } = presentation;
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
  container.addChild(new Markdown(markdown.trim() || "No changelog entries found.", 1, 1, getMarkdownTheme())); container.addChild(new DynamicBorder());
  return componentPort(container);
}

export function createPiShellHotkeys(): PiShellComponentPort {
  ensureTheme();
  const keys = new KeybindingsManager();
  const display = (action: Parameters<typeof keys.getKeys>[0]) => keys.getKeys(action).map(key => key.split("+").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("+")).join("/");
  const row = (actions: readonly Parameters<typeof keys.getKeys>[0][], description: string) => `| ${actions.map(action => `\`${display(action)}\``).join(" / ")} | ${description} |`;
  const markdown = ["**Navigation**", "| Key | Action |", "|-----|--------|", row(["tui.editor.cursorUp", "tui.editor.cursorDown", "tui.editor.cursorLeft", "tui.editor.cursorRight"], "Move cursor / browse history"), row(["tui.editor.cursorWordLeft", "tui.editor.cursorWordRight"], "Move by word"), row(["tui.editor.cursorLineStart"], "Start of line"), row(["tui.editor.cursorLineEnd"], "End of line"), row(["tui.editor.jumpForward"], "Jump forward to character"), row(["tui.editor.jumpBackward"], "Jump backward to character"), row(["tui.editor.pageUp", "tui.editor.pageDown"], "Scroll by page"), "", "**Editing**", "| Key | Action |", "|-----|--------|", row(["tui.input.submit"], "Send message"), row(["tui.input.newLine"], `New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""}`), row(["tui.editor.deleteWordBackward"], "Delete word backwards"), row(["tui.editor.deleteWordForward"], "Delete word forwards"), row(["tui.editor.deleteToLineStart"], "Delete to start of line"), row(["tui.editor.deleteToLineEnd"], "Delete to end of line"), row(["tui.editor.yank"], "Paste the most-recently-deleted text"), row(["tui.editor.yankPop"], "Cycle through the deleted text after pasting"), row(["tui.editor.undo"], "Undo"), "", "**Other**", "| Key | Action |", "|-----|--------|", row(["tui.input.tab"], "Path completion / accept autocomplete"), row(["app.interrupt"], "Cancel autocomplete / abort streaming"), row(["app.clear"], "Clear editor (first) / exit (second)"), row(["app.exit"], "Exit (when editor is empty)"), row(["app.suspend"], "Suspend to background"), row(["app.thinking.cycle"], "Cycle thinking level"), row(["app.model.cycleForward", "app.model.cycleBackward"], "Cycle models"), row(["app.model.select"], "Open model selector"), row(["app.tools.expand"], "Toggle tool output expansion"), row(["app.thinking.toggle"], "Toggle thinking block visibility"), row(["app.editor.external"], "Edit message in external editor"), row(["app.message.copy"], "Copy last assistant message"), row(["app.message.followUp"], "Queue follow-up message"), row(["app.message.dequeue"], "Restore queued messages"), row(["app.clipboard.pasteImage"], "Paste image or text from clipboard"), "| `/` | Slash commands |", "| `!` | Run bash command |", "| `!!` | Run bash command (excluded from context) |"].join("\n");
  const container = new Container(); container.addChild(new Spacer(1)); container.addChild(new DynamicBorder()); container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "Keyboard Shortcuts")), 1, 0)); container.addChild(new Spacer(1)); container.addChild(new Markdown(markdown, 1, 1, getMarkdownTheme())); container.addChild(new DynamicBorder());
  return componentPort(container);
}
