import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import {
  AssistantMessageComponent,
  UserMessageComponent,
  getSelectListTheme,
} from "@earendil-works/pi-coding-agent";
import { SelectList } from "@earendil-works/pi-tui";

const FOREGROUNDS = [
  "accent", "border", "borderAccent", "borderMuted", "success", "error", "warning", "muted", "dim", "text",
  "thinkingText", "userMessageText", "customMessageText", "customMessageLabel", "toolTitle", "toolOutput",
  "mdHeading", "mdLink", "mdLinkUrl", "mdCode", "mdCodeBlock", "mdCodeBlockBorder", "mdQuote", "mdQuoteBorder",
  "mdHr", "mdListBullet", "toolDiffAdded", "toolDiffRemoved", "toolDiffContext", "syntaxComment", "syntaxKeyword",
  "syntaxFunction", "syntaxVariable", "syntaxString", "syntaxNumber", "syntaxType", "syntaxOperator", "syntaxPunctuation",
  "thinkingOff", "thinkingMinimal", "thinkingLow", "thinkingMedium", "thinkingHigh", "thinkingXhigh", "thinkingMax", "bashMode",
] as const;
const BACKGROUNDS = ["selectedBg", "scrollbarThumb", "userMessageBg", "customMessageBg", "toolPendingBg", "toolSuccessBg", "toolErrorBg"] as const;

export async function capturePinnedTheme(themeName: "dark" | "light", width: number) {
  const path = resolve("node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js");
  const upstream = await import(pathToFileURL(path).href) as {
    initTheme(name: string, watcher: boolean): void;
    theme: {
      fg(color: string, text: string): string;
      bg(color: string, text: string): string;
      bold(text: string): string;
      italic(text: string): string;
      getColorMode(): string;
    };
  };
  upstream.initTheme(themeName, false);
  const message = {
    role: "assistant",
    content: [{ type: "text", text: "Assistant **theme** probe" }],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-5",
    usage: {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
    },
    stopReason: "stop",
    timestamp: 0,
  };
  const selector = new SelectList([
    { value: "one", label: "One", description: "First option" },
    { value: "two", label: "Two", description: "Second option" },
  ], 2, getSelectListTheme());
  return {
    foregrounds: Object.fromEntries(FOREGROUNDS.map(color => [color, upstream.theme.fg(color, "probe")])),
    backgrounds: Object.fromEntries(BACKGROUNDS.map(color => [color, upstream.theme.bg(color, "probe")])),
    styles: {
      bold: upstream.theme.bold("probe"),
      italic: upstream.theme.italic("probe"),
      colorMode: upstream.theme.getColorMode(),
    },
    rows: {
      user: new UserMessageComponent("User theme probe").render(width),
      assistant: new AssistantMessageComponent(message as never, false).render(width),
      selector: selector.render(width),
    },
  };
}
