import {
  AssistantMessageComponent,
  BashExecutionComponent,
  CompactionSummaryMessageComponent,
  CustomMessageComponent,
  DynamicBorder,
  getMarkdownTheme,
  parseSkillBlock,
  ToolExecutionComponent,
  UserMessageComponent,
} from "@earendil-works/pi-coding-agent";
import {
  SkillInvocationMessageComponent,
} from "./upstream/components/skill-invocation-message.js";
import {
  Container,
  Markdown,
  Spacer,
  Text,
  type Component,
} from "#pi-tui";
import type {
  OwnedUiTranscriptBlock,
} from "../../../contracts/owned-ui/index.js";
import { PRODUCT_TEXT } from "../../../product-identity.js";
import { composeTimestampedPromptRows } from "../../../ui/components/index.js";
import {
  KeybindingsManager,
} from "./upstream/adjacent/core/keybindings.js";
import {
  PINNED_PI_LAYOUT,
  piTheme,
} from "./theme.js";
import {
  componentPort,
  createTuiFacade,
  ensureTheme,
  formatSessionTokens,
  isRecord,
  type PiShellComponentPort,
  type PiShellExtensionRendererResolver,
  type PiShellTranscriptComponentPort,
} from "./shell-shared-facade.js";

export interface PiShellSessionInfoPresentation {
  readonly sessionName?: string;
  readonly stats: {
    readonly sessionFile?: string;
    readonly sessionId: string;
    readonly userMessages: number;
    readonly assistantMessages: number;
    readonly toolCalls: number;
    readonly toolResults: number;
    readonly totalMessages: number;
    readonly tokens: {
      readonly input: number;
      readonly output: number;
      readonly cacheRead: number;
      readonly cacheWrite: number;
      readonly total: number;
    };
    readonly cost: number;
  };
  readonly cacheWaste: { readonly missedTokens: number; readonly missedCost: number; readonly missCount: number };
  readonly usageBreakdown: readonly { readonly key: string; readonly cost: number; readonly tokens: number }[];
}

export function renderPiShellStatusText(message: string, width: number): readonly string[] {
  ensureTheme();
  return new Text(piTheme().fg("dim", message), PINNED_PI_LAYOUT.outputPad, 0).render(width);
}

export function createPiShellSessionInfo(presentation: PiShellSessionInfoPresentation): PiShellComponentPort {
  ensureTheme();
  const { stats, sessionName, cacheWaste, usageBreakdown } = presentation;
  let info = `${piTheme().bold("Session Info")}\n\n`;
  if (sessionName) info += `${piTheme().fg("dim", "Name:")} ${sessionName}\n`;
  info += `${piTheme().fg("dim", "File:")} ${stats.sessionFile ?? "In-memory"}\n`;
  info += `${piTheme().fg("dim", "ID:")} ${stats.sessionId}\n\n`;
  info += `${piTheme().bold("Messages")}\n`;
  info += `${piTheme().fg("dim", "Total:")} ${stats.totalMessages}\n`;
  info += `${piTheme().fg("dim", "User:")} ${stats.userMessages}\n`;
  info += `${piTheme().fg("dim", "Assistant:")} ${stats.assistantMessages}\n`;
  info += `${piTheme().fg("dim", "Tools:")} ${stats.toolCalls} calls, ${stats.toolResults} results\n\n`;
  info += `${piTheme().bold("Tokens")}\n`;
  const { input, cacheRead, cacheWrite } = stats.tokens;
  const promptTokens = input + cacheRead + cacheWrite;
  info += `${piTheme().fg("dim", "Input:")} ${promptTokens.toLocaleString()}\n`;
  if (promptTokens > 0 && (cacheRead > 0 || cacheWrite > 0)) {
    const hitRate = piTheme().fg("dim", `(${((cacheRead / promptTokens) * 100).toFixed(1)}%)`);
    info += `  ${piTheme().fg("dim", "Cached:")} ${cacheRead.toLocaleString()} ${hitRate}\n`;
    const written = cacheWrite > 0 ? ` ${piTheme().fg("dim", `(${cacheWrite.toLocaleString()} written to cache)`)}` : "";
    info += `  ${piTheme().fg("dim", "Uncached:")} ${(input + cacheWrite).toLocaleString()}${written}\n`;
  }
  info += `${piTheme().fg("dim", "Output:")} ${stats.tokens.output.toLocaleString()}\n`;
  info += `${piTheme().fg("dim", "Total:")} ${stats.tokens.total.toLocaleString()}\n`;
  if (stats.cost > 0 || cacheWaste.missedTokens > 0) {
    info += `\n${piTheme().bold("Cost")}\n`;
    info += `${piTheme().fg("dim", "Total:")} $${stats.cost.toFixed(3)}`;
    if (usageBreakdown.length > 1) {
      for (const entry of usageBreakdown) {
        info += `\n  ${piTheme().fg("dim", `${entry.key}:`)} $${entry.cost.toFixed(3)} ${piTheme().fg("dim", `(${formatSessionTokens(entry.tokens)} tokens)`)}`;
      }
    }
    if (cacheWaste.missedTokens > 0) {
      const missLabel = cacheWaste.missCount === 1 ? "1 miss" : `${cacheWaste.missCount} misses`;
      const detail = `${cacheWaste.missedTokens.toLocaleString()} tokens, ${missLabel}`;
      info += cacheWaste.missedCost >= 0.0001
        ? `\n${piTheme().fg("dim", "Cache Re-billed:")} $${cacheWaste.missedCost.toFixed(3)} ${piTheme().fg("dim", `(${detail})`)}`
        : `\n${piTheme().fg("dim", "Cache Re-billed:")} ${detail}`;
    }
  }
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(new Text(info, 1, 0));
  return componentPort(container);
}

export function createPiShellChangelog(markdown: string): PiShellComponentPort {
  ensureTheme();
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(new DynamicBorder());
  container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "What's New")), 1, 0));
  container.addChild(new Spacer(1));
  container.addChild(new Markdown(markdown.trim() || "No changelog entries found.", 1, 1, getMarkdownTheme()));
  container.addChild(new DynamicBorder());
  return componentPort(container);
}

export function createPiShellHotkeys(): PiShellComponentPort {
  ensureTheme();
  const keys = new KeybindingsManager();
  const display = (action: Parameters<typeof keys.getKeys>[0]) => keys.getKeys(action)
    .map(key => key.split("+").map(part => part.charAt(0).toUpperCase() + part.slice(1)).join("+"))
    .join("/");
  const row = (actions: readonly Parameters<typeof keys.getKeys>[0][], description: string) =>
    `| ${actions.map(action => `\`${display(action)}\``).join(" / ")} | ${description} |`;
  const markdown = [
    "**Navigation**", "| Key | Action |", "|-----|--------|",
    row(["tui.editor.cursorUp", "tui.editor.cursorDown", "tui.editor.cursorLeft", "tui.editor.cursorRight"], "Move cursor / browse history"),
    row(["tui.editor.cursorWordLeft", "tui.editor.cursorWordRight"], "Move by word"),
    row(["tui.editor.cursorLineStart"], "Start of line"), row(["tui.editor.cursorLineEnd"], "End of line"),
    row(["tui.editor.jumpForward"], "Jump forward to character"), row(["tui.editor.jumpBackward"], "Jump backward to character"),
    row(["tui.editor.pageUp", "tui.editor.pageDown"], "Scroll by page"), "",
    "**Editing**", "| Key | Action |", "|-----|--------|",
    row(["tui.input.submit"], "Send message"),
    row(["tui.input.newLine"], `New line${process.platform === "win32" ? " (Ctrl+Enter on Windows Terminal)" : ""}`),
    row(["tui.editor.deleteWordBackward"], "Delete word backwards"), row(["tui.editor.deleteWordForward"], "Delete word forwards"),
    row(["tui.editor.deleteToLineStart"], "Delete to start of line"), row(["tui.editor.deleteToLineEnd"], "Delete to end of line"),
    row(["tui.editor.yank"], "Paste the most-recently-deleted text"), row(["tui.editor.yankPop"], "Cycle through the deleted text after pasting"),
    row(["tui.editor.undo"], "Undo"), "", "**Other**", "| Key | Action |", "|-----|--------|",
    row(["tui.input.tab"], "Path completion / accept autocomplete"), row(["app.interrupt"], "Cancel autocomplete / abort streaming"),
    row(["app.clear"], "Clear editor (first) / exit (second)"), row(["app.exit"], "Exit (when editor is empty)"),
    row(["app.suspend"], "Suspend to background"), row(["app.thinking.cycle"], "Cycle thinking level"),
    row(["app.model.cycleForward", "app.model.cycleBackward"], "Cycle models"), row(["app.model.select"], "Open model selector"),
    row(["app.tools.expand"], "Toggle tool output expansion"), row(["app.thinking.toggle"], "Toggle thinking block visibility"),
    row(["app.editor.external"], "Edit message in external editor"), row(["app.message.copy"], "Copy last assistant message"),
    row(["app.message.followUp"], "Queue follow-up message"), row(["app.message.dequeue"], "Restore queued messages"),
    row(["app.clipboard.pasteImage"], "Paste image or text from clipboard"),
    "| `/` | Slash commands |", "| `!` | Run bash command |", "| `!!` | Run bash command (excluded from context) |",
  ].join("\n");
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(new DynamicBorder());
  container.addChild(new Text(piTheme().bold(piTheme().fg("accent", "Keyboard Shortcuts")), 1, 0));
  container.addChild(new Spacer(1));
  container.addChild(new Markdown(markdown, 1, 1, getMarkdownTheme()));
  container.addChild(new DynamicBorder());
  return componentPort(container);
}


export function createPiShellTranscriptComponent(
  initial: OwnedUiTranscriptBlock,
  cwd: string,
  extensions?: PiShellExtensionRendererResolver,
  options: { readonly timestampUserPrompts?: boolean } = {},
): PiShellTranscriptComponentPort {
  ensureTheme();
  let block = initial;
  let expanded = false;
  const timestampUserPrompts = options.timestampUserPrompts === true;
  let component = transcriptComponent(block, cwd, expanded, extensions, timestampUserPrompts);
  return {
    get id() { return block.id; },
    get revision() { return block.revision; },
    render: width => component.render(width),
    invalidate: () => component.invalidate(),
    update(next) {
      if (next.id !== block.id) throw new TypeError("Pi transcript component identity cannot change");
      const previous = block;
      block = next;
      if (!updateTranscriptComponent(component, previous, next, expanded)) {
        component = transcriptComponent(block, cwd, expanded, extensions, timestampUserPrompts);
      }
    },
    setExpanded(next) {
      if (expanded === next) return;
      expanded = next;
      if ("setExpanded" in component && typeof component.setExpanded === "function") {
        component.setExpanded(expanded);
      } else {
        component = transcriptComponent(block, cwd, expanded, extensions, timestampUserPrompts);
      }
    },
  };
}

export function renderPiShellTranscriptBlock(
  block: OwnedUiTranscriptBlock,
  width: number,
  cwd: string,
): readonly string[] {
  ensureTheme();
  return transcriptComponent(block, cwd, true).render(width);
}

/**
 * Pinned Pi's CLI prints startup diagnostics with `reportDiagnostics` before
 * the banner: the whole line, prefix included, in chalk's basic ANSI severity
 * colour — not the theme's tokens — with info lines dim and unprefixed.
 */
export function renderPiShellStartupDiagnostic(
  diagnostic: { readonly severity: "info" | "warning" | "error"; readonly message: string },
  width: number,
): readonly string[] {
  ensureTheme();
  const escape = String.fromCharCode(27);
  const chalk = diagnostic.severity === "error"
    ? { open: `${escape}[31m`, close: `${escape}[39m`, prefix: "Error: " }
    : diagnostic.severity === "warning"
      ? { open: `${escape}[33m`, close: `${escape}[39m`, prefix: "Warning: " }
      : { open: `${escape}[2m`, close: `${escape}[22m`, prefix: "" };
  return new Text(`${chalk.open}${chalk.prefix}${diagnostic.message}${chalk.close}`, 0, 0).render(width);
}

/**
 * Pinned Pi's `showPackageUpdateNotification` banner: warning-coloured dynamic
 * borders around a bold warning title, the muted update instruction with the
 * accent command, and the package list.
 */
export function renderPiShellPackageUpdateNotice(packages: readonly string[], width: number): readonly string[] {
  ensureTheme();
  const theme = piTheme();
  const container = new Container();
  container.addChild(new Spacer(1));
  container.addChild(new DynamicBorder(text => theme.fg("warning", text)));
  container.addChild(new Text(
    `${theme.bold(theme.fg("warning", "Package Updates Available"))}\n`
    + `${theme.fg("muted", "Package updates are available. Run ")}${theme.fg("accent", `${PRODUCT_TEXT.commandName} pi update --extensions`)}\n`
    + `${theme.fg("muted", "Packages:")}\n`
    + packages.map(name => `- ${name}`).join("\n"),
    1, 0,
  ));
  container.addChild(new DynamicBorder(text => theme.fg("warning", text)));
  return container.render(width);
}

function transcriptComponent(
  block: OwnedUiTranscriptBlock,
  cwd: string,
  expanded: boolean,
  extensions?: PiShellExtensionRendererResolver,
  timestampUserPrompts = false,
): Component {
  switch (block.kind) {
    case "user": {
      const skill = parseSkillBlock(block.text);
      let user: Component;
      if (!skill) user = new UserMessageComponent(block.text);
      else {
        const invocation = new SkillInvocationMessageComponent(skill, getMarkdownTheme());
        invocation.setExpanded(expanded);
        if (!skill.userMessage) user = invocation;
        else {
          const container = new Container();
          container.addChild(invocation);
          container.addChild(new Spacer(1));
          container.addChild(new UserMessageComponent(skill.userMessage));
          user = container;
        }
      }
      return timestampUserPrompts ? timestampedUserComponent(user, numericPayload(block, "timestamp")) : user;
    }
    case "assistant":
    case "thinking":
      return assistantComponent(block);
    case "tool-call":
    case "tool-result": {
      const component = toolComponent(block, cwd, extensions);
      component.setExpanded(expanded);
      return component;
    }
    case "compaction": {
      const component = new CompactionSummaryMessageComponent({
        role: "compactionSummary",
        summary: block.text,
        tokensBefore: numericPayload(block, "tokensBefore"),
        timestamp: numericPayload(block, "timestamp") || 0,
      }, getMarkdownTheme());
      component.setExpanded(expanded);
      return component;
    }
    case "retry":
      return new Text(piTheme().fg("warning", `Retry: ${block.text}`), PINNED_PI_LAYOUT.outputPad, 0);
    case "error":
      return new Text(piTheme().fg("error", `Error: ${block.text}`), PINNED_PI_LAYOUT.outputPad, 0);
    case "system":
      return new Text(piTheme().fg("dim", block.text), PINNED_PI_LAYOUT.outputPad, 0);
    case "custom":
      return customMessageComponent(block, expanded, extensions);
    case "bash":
      return bashExecutionComponent(block, cwd, expanded);
  }
}

function timestampedUserComponent(component: Component, sourceTimestamp: number): Component {
  if (!Number.isFinite(sourceTimestamp) || sourceTimestamp <= 0) return component;
  return {
    render(width: number): string[] {
      const theme = piTheme();
      return [...composeTimestampedPromptRows({
        width,
        sourceTimestamp,
        render: contentWidth => component.render(contentWidth),
        decorateSuffix: (text, firstRow) => theme.bg("userMessageBg", firstRow
          ? `  ${theme.fg("dim", text.slice(2))}`
          : text),
      })];
    },
    invalidate: () => component.invalidate(),
  };
}

function updateTranscriptComponent(
  component: Component,
  previous: OwnedUiTranscriptBlock,
  next: OwnedUiTranscriptBlock,
  expanded: boolean,
): boolean {
  if (component instanceof AssistantMessageComponent && next.kind === previous.kind
    && (next.kind === "assistant" || next.kind === "thinking")) {
    component.updateContent(validatedAssistantMessage(next), next.status === "live");
    return true;
  }
  if (component instanceof ToolExecutionComponent
    && (next.kind === "tool-call" || next.kind === "tool-result")
    && (previous.kind === "tool-call" || previous.kind === "tool-result")) {
    const payload = blockPayload(next);
    component.updateArgs(toolArguments(payload));
    if (next.status === "live") component.markExecutionStarted();
    if (next.status === "finalized" || payload.argsComplete === true) component.setArgsComplete();
    if (payload.partialResult === true) {
      component.updateResult({ content: [{ type: "text", text: next.text }], isError: false }, true);
    } else if (next.kind === "tool-result") {
      component.updateResult({
        content: [{ type: "text", text: next.text }],
        isError: payload.isError === true,
      }, next.status === "live");
    }
    component.setExpanded(expanded);
    return true;
  }
  if (component instanceof BashExecutionComponent && next.kind === "bash" && previous.kind === "bash") {
    if (next.text.startsWith(previous.text)) component.appendOutput(next.text.slice(previous.text.length));
    else return false;
    if (next.status === "finalized") completeBashComponent(component, next);
    component.setExpanded(expanded);
    return true;
  }
  if (component instanceof Text && next.kind === previous.kind
    && (next.kind === "retry" || next.kind === "error" || next.kind === "system")) {
    component.setText(transcriptText(next));
    return true;
  }
  return false;
}

function assistantComponent(block: OwnedUiTranscriptBlock): AssistantMessageComponent {
  const component = new AssistantMessageComponent(undefined, false, getMarkdownTheme(), undefined, PINNED_PI_LAYOUT.outputPad);
  component.updateContent(validatedAssistantMessage(block), block.status === "live");
  return component;
}

type PiAssistantMessage = NonNullable<ConstructorParameters<typeof AssistantMessageComponent>[0]>;

export function validatedAssistantMessage(block: OwnedUiTranscriptBlock): PiAssistantMessage {
  const payload = blockPayload(block);
  const content = assistantPayloadContent(payload.content)
    ?? (block.kind === "thinking"
      ? [{ type: "thinking", thinking: block.text }]
      : [{ type: "text", text: block.text }]);
  const message: unknown = {
    role: "assistant",
    content,
    api: stringPayload(payload, "api") ?? "openai-responses",
    provider: stringPayload(payload, "provider") ?? "openai",
    model: stringPayload(payload, "model") ?? "gpt-5",
    usage: isRecord(payload.usage) ? payload.usage : emptyUsage(),
    stopReason: stringPayload(payload, "stopReason") ?? (block.status === "live" ? "pending" : "stop"),
    ...(stringPayload(payload, "errorMessage") === undefined ? {} : { errorMessage: stringPayload(payload, "errorMessage") }),
    timestamp: numericPayload(block, "timestamp") || 0,
  };
  if (!isPiAssistantMessage(message)) throw new TypeError("Pi assistant message façade rejected malformed content");
  return message;
}

function isPiAssistantMessage(value: unknown): value is PiAssistantMessage {
  return isRecord(value) && value.role === "assistant" && Array.isArray(value.content)
    && typeof value.api === "string" && typeof value.provider === "string" && typeof value.model === "string"
    && isRecord(value.usage) && typeof value.stopReason === "string" && typeof value.timestamp === "number";
}

function assistantPayloadContent(value: unknown): readonly Record<string, unknown>[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const content: Record<string, unknown>[] = [];
  for (const item of value) {
    if (!isRecord(item)) continue;
    if (item.type === "text" && typeof item.text === "string") content.push({ type: "text", text: item.text });
    else if (item.type === "thinking" && typeof item.thinking === "string") {
      content.push({ type: "thinking", thinking: item.thinking, ...(item.redacted === true ? { redacted: true } : {}) });
    } else if (item.type === "toolCall" && typeof item.id === "string" && typeof item.name === "string") {
      content.push({ type: "toolCall", id: item.id, name: item.name, arguments: item.arguments ?? {} });
    }
  }
  return content.length === 0 && value.length > 0 ? undefined : content;
}

type PiToolDefinition = ConstructorParameters<typeof ToolExecutionComponent>[4];
type PiMessageRenderer = ConstructorParameters<typeof CustomMessageComponent>[1];

function validatedToolDefinition(value: unknown): PiToolDefinition {
  if (value === undefined) return undefined;
  if (!isPiToolDefinition(value)) throw new TypeError("Pi tool-definition façade rejected malformed metadata");
  return value;
}

function isPiToolDefinition(value: unknown): value is NonNullable<PiToolDefinition> {
  return isRecord(value) && typeof value.name === "string";
}

function validatedMessageRenderer(value: unknown): PiMessageRenderer {
  if (value === undefined) return undefined;
  if (!isPiMessageRenderer(value)) throw new TypeError("Pi message-renderer façade rejected a non-function renderer");
  return value;
}

function isPiMessageRenderer(value: unknown): value is NonNullable<PiMessageRenderer> {
  return typeof value === "function";
}

function toolComponent(
  block: OwnedUiTranscriptBlock,
  cwd: string,
  extensions?: PiShellExtensionRendererResolver,
): ToolExecutionComponent {
  const payload = blockPayload(block);
  const toolCallId = stringPayload(payload, "toolCallId") ?? block.id;
  const toolName = stringPayload(payload, "toolName") ?? block.title ?? "tool";
  const argumentsPayload = toolArguments(payload);
  const component = new ToolExecutionComponent(
    toolName,
    toolCallId,
    argumentsPayload,
    undefined,
    validatedToolDefinition(extensions?.getToolDefinition(toolName)),
    createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {}, onSubmit() {} }),
    cwd,
  );
  if (block.status === "live") component.markExecutionStarted();
  if (block.status === "finalized" || payload.argsComplete === true) component.setArgsComplete();
  if (payload.partialResult === true) {
    component.updateResult({ content: [{ type: "text", text: block.text }], isError: false }, true);
  } else if (block.kind === "tool-result") {
    component.updateResult({
      content: [{ type: "text", text: block.text }],
      isError: payload.isError === true,
    });
  }
  return component;
}

function customMessageComponent(
  block: OwnedUiTranscriptBlock,
  expanded: boolean,
  extensions?: PiShellExtensionRendererResolver,
): CustomMessageComponent {
  const payload = blockPayload(block);
  const message = {
    role: "custom" as const,
    customType: stringPayload(payload, "customType") ?? block.title ?? "custom",
    content: block.text,
    display: payload.display !== false,
    details: payload.details,
    timestamp: numericPayload(block, "timestamp") || 0,
  };
  const renderer = validatedMessageRenderer(extensions?.getMessageRenderer(message.customType));
  const component = new CustomMessageComponent(message, renderer, getMarkdownTheme(), PINNED_PI_LAYOUT.outputPad);
  component.setExpanded(expanded);
  return component;
}

function bashExecutionComponent(block: OwnedUiTranscriptBlock, cwd: string, expanded: boolean): BashExecutionComponent {
  const payload = blockPayload(block);
  const component = new BashExecutionComponent(
    stringPayload(payload, "command") ?? block.title ?? "",
    createTuiFacade({ getColumns: () => 80, getRows: () => 24, requestRender() {} }),
    payload.excludeFromContext === true,
  );
  if (block.text) component.appendOutput(block.text);
  if (block.status === "finalized") completeBashComponent(component, block);
  component.setExpanded(expanded);
  return component;
}

function completeBashComponent(component: BashExecutionComponent, block: OwnedUiTranscriptBlock): void {
  const payload = blockPayload(block);
  component.setComplete(
    typeof payload.exitCode === "number" ? payload.exitCode : undefined,
    payload.cancelled === true,
    payload.truncated === true ? {
      content: block.text,
      truncated: true,
      truncatedBy: "bytes",
      totalLines: block.text.split("\n").length,
      totalBytes: Buffer.byteLength(block.text),
      outputLines: block.text.split("\n").length,
      outputBytes: Buffer.byteLength(block.text),
      lastLinePartial: false,
      firstLineExceedsLimit: false,
      maxLines: 2000,
      maxBytes: 50 * 1024,
    } : undefined,
    stringPayload(payload, "fullOutputPath"),
  );
}

function toolArguments(payload: Record<string, unknown>): unknown {
  return isRecord(payload.arguments) && "json" in payload.arguments ? payload.arguments.json : payload.arguments ?? {};
}

function transcriptText(block: OwnedUiTranscriptBlock): string {
  if (block.kind === "retry") return piTheme().fg("warning", `Retry: ${block.text}`);
  if (block.kind === "error") return piTheme().fg("error", `Error: ${block.text}`);
  return piTheme().fg("dim", block.text);
}


function blockPayload(block: OwnedUiTranscriptBlock): Record<string, unknown> {
  return isRecord(block.payload) ? block.payload : {};
}

function stringPayload(payload: Record<string, unknown>, key: string): string | undefined {
  const value = payload[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numericPayload(block: OwnedUiTranscriptBlock, key: string): number {
  const value = blockPayload(block)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function emptyUsage() {
  return {
    input: 0,
    output: 0,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens: 0,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

