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
import { SkillInvocationMessageComponent } from "./upstream/components/skill-invocation-message.js";
import { createMermaidMarkdownTransformer, type MermaidRenderingMode } from "./upstream/components/mermaid.js";
import {
  Container,
  Image,
  Spacer,
  Text,
  type Component,
} from "#pi-tui";
import type { OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import { PRODUCT_TEXT } from "../../../product-identity.js";
import {
  createPiSubmittedPromptComponent,
  type PiShellSubmittedPromptComposer,
} from "./submitted-prompt-adapter.js";
export type { PiShellSubmittedPromptComposer } from "./submitted-prompt-adapter.js";
import {
  PINNED_PI_LAYOUT,
  piTheme,
} from "./theme.js";
import {
  componentPort,
  createTuiFacade,
  ensureTheme,
  isRecord,
  type PiShellComponentPort,
  type PiShellExtensionRendererResolver,
  type PiShellImageAssetResolver,
  type PiShellTranscriptComponentPort,
} from "./shell-shared-facade.js";

export function createPiShellTranscriptComponent(
  initial: OwnedUiTranscriptBlock,
  cwd: string,
  extensions?: PiShellExtensionRendererResolver,
  submittedPrompt?: PiShellSubmittedPromptComposer,
  initialOutputPad: 0 | 1 = PINNED_PI_LAYOUT.outputPad,
  initialHideThinkingBlock = false,
  initialMermaidRenderingMode: MermaidRenderingMode = "off",
  initialShowImages = true,
  initialImageWidthCells = 80,
  imageAssets?: PiShellImageAssetResolver,
): PiShellTranscriptComponentPort {
  ensureTheme();
  let block = initial;
  let expanded = false;
  let outputPad = initialOutputPad;
  let hideThinkingBlock = initialHideThinkingBlock;
  let mermaidRenderingMode = initialMermaidRenderingMode;
  let showImages = initialShowImages;
  let imageWidthCells = initialImageWidthCells;
  const rebuild = () => withTranscriptImages(
    transcriptComponent(
      block, cwd, expanded, extensions, submittedPrompt, outputPad, hideThinkingBlock, mermaidRenderingMode,
      showImages, imageWidthCells,
    ),
    block, imageAssets, showImages, imageWidthCells,
  );
  let component = rebuild();
  return {
    get id() { return block.id; },
    get revision() { return block.revision; },
    render: width => renderWithOutputPad(component, block.kind, width, outputPad),
    invalidate: () => component.invalidate(),
    update(next) {
      if (next.id !== block.id) throw new TypeError("Pi transcript component identity cannot change");
      const previous = block;
      block = next;
      if (!updateTranscriptComponent(component, previous, next, expanded)) component = rebuild();
    },
    setExpanded(next) {
      if (expanded === next) return;
      expanded = next;
      if ("setExpanded" in component && typeof component.setExpanded === "function") component.setExpanded(expanded);
      else component = rebuild();
    },
    setOutputPad(padding) {
      if (outputPad === padding) return;
      outputPad = padding;
      component = rebuild();
    },
    setHideThinkingBlock(hidden) {
      if (hideThinkingBlock === hidden) return;
      hideThinkingBlock = hidden;
      component = rebuild();
    },
    setMermaidRenderingMode(mode) {
      if (mermaidRenderingMode === mode) return;
      mermaidRenderingMode = mode;
      component = rebuild();
    },
    setImagePresentation(show, width) {
      showImages = show;
      imageWidthCells = width;
      if (component instanceof ToolExecutionComponent) {
        component.setShowImages(show);
        component.setImageWidthCells(width);
      } else component = rebuild();
    },
  };
}

function withTranscriptImages(
  component: Component,
  block: OwnedUiTranscriptBlock,
  assets: PiShellImageAssetResolver | undefined,
  showImages: boolean,
  imageWidthCells: number,
): Component {
  const references = block.imageReferences ?? [];
  if (references.length === 0) return component;
  const container = new Container();
  container.addChild(component);
  for (const reference of references) {
    container.addChild(new Spacer(1));
    const asset = assets?.resolve(reference.assetId) ?? null;
    if (!showImages) {
      container.addChild(new Text(piTheme().fg("muted", `[Image hidden: ${reference.mimeType}, ${reference.byteLength} bytes]`), 1, 0));
    } else if (asset === null) {
      container.addChild(new Text(piTheme().fg("warning", `[Image unavailable: ${reference.mimeType}]`), 1, 0));
    } else {
      container.addChild(new Image(asset.data, asset.mimeType, {
        fallbackColor: text => piTheme().fg("muted", text),
      }, { maxWidthCells: imageWidthCells, filename: reference.assetId }));
    }
  }
  return container;
}

function renderWithOutputPad(
  component: Component,
  kind: OwnedUiTranscriptBlock["kind"],
  width: number,
  outputPad: 0 | 1,
): readonly string[] {
  const rows = component.render(width);
  if (outputPad !== 0 || (kind !== "tool-call" && kind !== "tool-result" && kind !== "bash")) return rows;
  return rows.map(row => row.startsWith(" ") ? row.slice(1) : row);
}

export function renderPiShellTranscriptBlock(
  block: OwnedUiTranscriptBlock,
  width: number,
  cwd: string,
): readonly string[] {
  ensureTheme();
  return transcriptComponent(block, cwd, true, undefined, undefined, PINNED_PI_LAYOUT.outputPad, false, "off", true, 80).render(width);
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
  extensions: PiShellExtensionRendererResolver | undefined,
  submittedPrompt: PiShellSubmittedPromptComposer | undefined,
  outputPad: 0 | 1,
  hideThinkingBlock: boolean,
  mermaidRenderingMode: MermaidRenderingMode,
  showImages: boolean,
  imageWidthCells: number,
): Component {
  switch (block.kind) {
    case "user": {
      const skill = parseSkillBlock(block.text);
      if (!skill) return submittedPrompt ? createPiSubmittedPromptComponent(block, submittedPrompt) : new UserMessageComponent(block.text);
      const invocation = new SkillInvocationMessageComponent(skill, getMarkdownTheme());
      invocation.setExpanded(expanded);
      if (!skill.userMessage) return invocation;
      const container = new Container();
      container.addChild(invocation);
      container.addChild(new Spacer(1));
      container.addChild(new UserMessageComponent(skill.userMessage));
      return container;
    }
    case "assistant":
    case "thinking":
      return assistantComponent(block, outputPad, hideThinkingBlock, mermaidRenderingMode);
    case "tool-call":
    case "tool-result": {
      const component = toolComponent(block, cwd, extensions, showImages, imageWidthCells);
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
      return new Text(piTheme().fg("warning", `Retry: ${block.text}`), outputPad, 0);
    case "error":
      return new Text(piTheme().fg("error", `Error: ${block.text}`), outputPad, 0);
    case "system":
      return new Text(piTheme().fg("dim", block.text), outputPad, 0);
    case "custom":
      return customMessageComponent(block, expanded, extensions, outputPad);
    case "bash":
      return bashExecutionComponent(block, cwd, expanded);
  }
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

function assistantComponent(
  block: OwnedUiTranscriptBlock,
  outputPad: 0 | 1,
  hideThinkingBlock: boolean,
  mermaidRenderingMode: MermaidRenderingMode,
): AssistantMessageComponent {
  const transformer = createMermaidMarkdownTransformer({ getMode: () => mermaidRenderingMode, theme: piTheme() });
  const component = new AssistantMessageComponent(
    undefined, hideThinkingBlock, getMarkdownTheme(), undefined, outputPad, [transformer],
  );
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
  extensions: PiShellExtensionRendererResolver | undefined,
  showImages: boolean,
  imageWidthCells: number,
): ToolExecutionComponent {
  const payload = blockPayload(block);
  const toolCallId = stringPayload(payload, "toolCallId") ?? block.id;
  const toolName = stringPayload(payload, "toolName") ?? block.title ?? "tool";
  const argumentsPayload = toolArguments(payload);
  const component = new ToolExecutionComponent(
    toolName,
    toolCallId,
    argumentsPayload,
    { showImages, imageWidthCells },
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
  extensions: PiShellExtensionRendererResolver | undefined,
  outputPad: 0 | 1,
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
  const component = new CustomMessageComponent(message, renderer, getMarkdownTheme(), outputPad);
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

