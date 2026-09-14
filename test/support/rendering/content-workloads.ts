import type { RenderingWorkload, RenderingWorkloadStep } from "./streaming-workloads.js";

const usage = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };
const first = { role: "assistant", timestamp: 200, api: "openai-responses", provider: "openai", model: "gpt-5", usage,
  stopReason: "toolUse", content: [
    { type: "thinking", thinking: "THINKING_CONTENT" },
    { type: "text", text: "COMMENTARY_CONTENT\n\n```ts\nconst preserved = true;\n```" },
    { type: "toolCall", id: "shell", name: "bash", arguments: { command: "fixture" } },
    { type: "toolCall", id: "edit", name: "edit", arguments: { path: "content-fixture.ts", edits: [] } },
  ] };
const second = { ...first, timestamp: 300, stopReason: "stop", content: [{ type: "text", text: "POST_TOOLS_CONTENT" }] };
const event = (checkpoint: string, atMs: number, value: Record<string, unknown>): RenderingWorkloadStep => ({ checkpoint, atMs, action: { type: "event", value } });
const paint = (checkpoint: string, atMs: number): RenderingWorkloadStep => ({ checkpoint, atMs, action: { type: "input", data: "" } });

/** Synthetic production order: complete arguments, interleave tools, finish a second message, delay settlement. */
export const CONTENT_RENDERING_WORKLOADS: readonly RenderingWorkload[] = [40, 192].map(columns => ({
  id: `content-lifecycle-${columns}`, columns, rows: 54,
  description: "Multiple source messages and actual tool renderers with coalesced output and delayed settlement.",
  steps: [
    event("earlier-history", 0, { type: "message_start", message: { role: "user", timestamp: 1, content: "EARLIER_CONTENT" } }),
    event("agent-start", 10, { type: "agent_start" }),
    event("first-start", 11, { type: "message_start", message: { ...first, stopReason: "pending" } }),
    event("arguments-complete", 12, { type: "message_end", message: first }),
    event("shell-start", 15, { type: "tool_execution_start", toolCallId: "shell", toolName: "bash", args: { command: "fixture" } }),
    event("edit-start", 15, { type: "tool_execution_start", toolCallId: "edit", toolName: "edit", args: { path: "content-fixture.ts", edits: [] } }),
    ...Array.from({ length: 64 }, (_, n) => event(`burst-${n}`, 20, { type: "tool_execution_update", toolCallId: "shell", toolName: "bash",
      partialResult: { content: [{ type: "text", text: `LIVE_REQUIRED_${n}` }] } })),
    paint("live-paint", 100),
    event("shell-complete", 120, { type: "tool_execution_end", toolCallId: "shell", toolName: "bash", isError: false,
      result: { content: [{ type: "text", text: "FINAL_REQUIRED" }] } }),
    event("edit-complete", 120, { type: "tool_execution_end", toolCallId: "edit", toolName: "edit", isError: false,
      result: { content: [{ type: "text", text: "Successfully replaced text" }], details: { diff: "-1 previous\n+1 AUTHORITATIVE_DIFF", firstChangedLine: 1 } } }),
    event("restated-turn", 121, { type: "turn_end", message: first, toolResults: [] }),
    event("second-start", 130, { type: "message_start", message: { ...second, stopReason: "pending" } }),
    event("second-complete", 131, { type: "message_end", message: second }),
    event("run-end", 140, { type: "agent_end", messages: [first, second], willRetry: false }),
    paint("before-settlement", 180),
    event("settled", 240, { type: "agent_settled" }),
    { checkpoint: "keyboard", atMs: 280, action: { type: "input", data: "x" } },
    paint("after-settlement", 320),
  ],
}));
