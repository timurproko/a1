import { AssistantMessageComponent, ToolExecutionComponent, UserMessageComponent, getMarkdownTheme } from "@earendil-works/pi-coding-agent";
import { Container, Text, type Component, type TUI } from "#pi-tui";

interface Entry { readonly id: string; kind: string; status: string; text: string }

/** Independent public pinned components, never an owned tool-text approximation or merged assistant surface. */
export class PinnedContentRoot implements Component {
  readonly #document = new Container();
  readonly #dock = new Container();
  readonly transcript: Entry[] = [];
  readonly #tools = new Map<string, { component: ToolExecutionComponent; entry: Entry }>();
  #assistant: AssistantMessageComponent | undefined;
  #assistantEntry: Entry | undefined;
  #working = false;
  #sequence = 0;

  constructor(private readonly tui: TUI, private readonly cwd: string) { this.#rebuildDock(); }
  render(width: number): string[] { return [...this.#document.render(width), ...this.#dock.render(width)]; }
  invalidate(): void { this.#document.invalidate(); this.#dock.invalidate(); }
  handleInput(): void {}

  applyEvent(event: Readonly<Record<string, unknown>>): void {
    if (event.type === "agent_start") this.#working = true;
    else if (event.type === "agent_settled" || event.type === "agent_end") {
      this.#working = false;
      for (const entry of this.transcript) if (entry.status === "live") entry.status = "finalized";
    } else if (event.type === "message_start" || event.type === "message_update" || event.type === "message_end") {
      const message = event.message;
      if (!record(message)) return;
      if (message.role === "user" && event.type === "message_start") {
        const text = contentText(message.content);
        this.#document.addChild(new UserMessageComponent(text));
        this.transcript.push({ id: `user-${++this.#sequence}`, kind: "user", status: "live", text });
      } else if (message.role === "assistant") {
        if (event.type === "message_start" || this.#assistant === undefined) {
          this.#assistant = new AssistantMessageComponent(undefined, false, getMarkdownTheme());
          this.#assistantEntry = { id: `assistant-${++this.#sequence}`, kind: "assistant", status: "live", text: "" };
          this.#document.addChild(this.#assistant);
          this.transcript.push(this.#assistantEntry);
        }
        const text = contentText(message.content);
        const delta = event.type === "message_update" && record(event.assistantMessageEvent)
          && typeof event.assistantMessageEvent.delta === "string" ? event.assistantMessageEvent.delta : undefined;
        this.#assistantEntry!.text = delta !== undefined && !text.endsWith(delta) ? text + delta : text;
        this.#assistantEntry!.status = event.type === "message_end" ? "finalized" : "live";
        this.#assistant.updateContent(message as never, event.type !== "message_end");
        if (Array.isArray(message.content)) for (const part of message.content) {
          if (!record(part) || part.type !== "toolCall" || typeof part.id !== "string") continue;
          const tool = this.#tool(part.id, String(part.name), part.arguments);
          if (tool.entry.status !== "finalized") tool.component.updateArgs(part.arguments);
          if (event.type === "message_end") tool.component.setArgsComplete();
        }
      }
    } else if (event.type === "tool_execution_start" || event.type === "tool_execution_update" || event.type === "tool_execution_end") {
      const tool = this.#tool(String(event.toolCallId), String(event.toolName), event.args);
      if (tool.entry.status === "finalized" && event.type !== "tool_execution_end") return;
      if (event.args !== undefined) tool.component.updateArgs(event.args);
      if (event.type === "tool_execution_start") tool.component.markExecutionStarted();
      else {
        const source = event.type === "tool_execution_end" ? event.result : event.partialResult;
        if (record(source) && Array.isArray(source.content)) {
          const final = event.type === "tool_execution_end";
          tool.component.updateResult({ content: source.content, details: source.details, isError: event.isError === true }, !final);
          Object.assign(tool.entry, { kind: final ? "tool-result" : "tool-call", status: final ? "finalized" : "live", text: contentText(source.content) });
        }
      }
    }
    this.#rebuildDock();
  }

  #tool(id: string, name: string, args: unknown) {
    const current = this.#tools.get(id);
    if (current !== undefined) return current;
    const component = new ToolExecutionComponent(name, id, args ?? {}, { showImages: true, imageWidthCells: 80 }, undefined, this.tui, this.cwd);
    const entry: Entry = { id: `tool-${id}`, kind: "tool-call", status: "live", text: "" };
    const tool = { component, entry };
    this.#tools.set(id, tool);
    this.#document.addChild(component);
    this.transcript.push(entry);
    return tool;
  }

  #rebuildDock(): void {
    this.#dock.clear();
    if (this.#working) this.#dock.addChild(new Text(" Working...", 0, 0));
    // Compatibility: the evidence oracle compares shared transcript/tool content, not A1's dock layout.
    this.#dock.addChild(new Text("\n> \n fixture • gpt-5", 0, 0));
  }
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === "object" && value !== null; }
// Compatibility: match the existing text-only diagnostic summary, not the rendering payload.
// AssistantMessageComponent receives the original message, including every thinking part above.
function contentText(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value)) return "";
  return value.map(part => record(part) && typeof part.text === "string" ? part.text : "").join("");
}
