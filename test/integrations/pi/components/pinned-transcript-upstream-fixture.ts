import {
  AssistantMessageComponent,
  BashExecutionComponent,
  CompactionSummaryMessageComponent,
  CustomMessageComponent,
  ToolExecutionComponent,
  UserMessageComponent,
  getMarkdownTheme,
  initTheme,
} from "@earendil-works/pi-coding-agent";

export interface PinnedTranscriptFrames {
  readonly initial: Record<string, readonly string[]>;
  readonly partial: Record<string, readonly string[]>;
  readonly updated: Record<string, readonly string[]>;
  readonly resized: Record<string, readonly string[]>;
}

export function capturePinnedTranscriptFrames(width: number, resizedWidth: number): PinnedTranscriptFrames {
  initTheme("dark", false);
  const ui = tuiFacade();
  const assistant = new AssistantMessageComponent(undefined, false, getMarkdownTheme(), undefined, 1);
  assistant.updateContent(assistantMessage("Hello 🌍", "pending"), true);
  const thinking = new AssistantMessageComponent(undefined, false, getMarkdownTheme(), undefined, 1);
  thinking.updateContent(thinkingMessage("Plan 日本語", "pending"), true);
  const tool = new ToolExecutionComponent("read", "tool-1", { path: "初.txt" }, undefined, undefined, ui, "D:/work");
  tool.markExecutionStarted();
  const bash = new BashExecutionComponent("printf 'λ'", ui, false);
  bash.appendOutput("λ\n");
  const user = new UserMessageComponent("User 😀 message", getMarkdownTheme(), 1);
  const custom = new CustomMessageComponent({
    role: "custom", customType: "probe", content: "Custom café", display: true, timestamp: 0,
  }, undefined, getMarkdownTheme(), 1);
  const compaction = new CompactionSummaryMessageComponent({
    role: "compactionSummary", summary: "Summary résumé", tokensBefore: 123, timestamp: 0,
  }, getMarkdownTheme());
  const components = { assistant, thinking, tool, bash, user, custom, compaction };
  const initial = renderAll(components, width);
  tool.updateResult({ content: [{ type: "text", text: "partial …" }], isError: false }, true);
  const partial = renderAll(components, width);

  assistant.updateContent(assistantMessage("Hello 🌍 done", "stop"), false);
  thinking.updateContent(thinkingMessage("Plan 日本語 done", "stop"), false);
  tool.updateArgs({ path: "初.txt", line: 2 });
  tool.setArgsComplete();
  tool.updateResult({ content: [{ type: "text", text: "result ✓" }], isError: false });
  tool.setExpanded(true);
  bash.appendOutput("done ✓");
  bash.setComplete(0, false);
  bash.setExpanded(true);
  custom.setExpanded(true);
  compaction.setExpanded(true);
  const updated = renderAll(components, width);
  const resized = renderAll(components, resizedWidth);
  return { initial, partial, updated, resized };
}

function renderAll(components: Record<string, { render(width: number): readonly string[] }>, width: number) {
  return Object.fromEntries(Object.entries(components).map(([name, component]) => [name, component.render(width)]));
}

function assistantMessage(text: string, stopReason: string): never {
  return {
    role: "assistant", content: [{ type: "text", text }], api: "openai-responses", provider: "openai", model: "gpt-5",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason, timestamp: 0,
  } as never;
}

function thinkingMessage(text: string, stopReason: string): never {
  return {
    role: "assistant", content: [{ type: "thinking", thinking: text }], api: "openai-responses", provider: "openai", model: "gpt-5",
    usage: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } },
    stopReason, timestamp: 0,
  } as never;
}

function tuiFacade(): never {
  return {
    terminal: { kittyProtocolActive: false },
    requestRender() {}, invalidate() {}, get columns() { return 80; }, get rows() { return 24; },
  } as never;
}
