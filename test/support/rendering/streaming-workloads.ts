export type RenderingWorkloadAction =
  | { readonly type: "event"; readonly value: Readonly<Record<string, unknown>> }
  | { readonly type: "resize"; readonly columns: number; readonly rows: number }
  | { readonly type: "input"; readonly data: string };

export interface RenderingWorkloadStep {
  readonly checkpoint: string;
  readonly atMs: number;
  readonly action: RenderingWorkloadAction;
}

export interface RenderingWorkload {
  readonly id: string;
  readonly description: string;
  readonly columns: number;
  readonly rows: number;
  readonly steps: readonly RenderingWorkloadStep[];
}

const usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
} as const;

function assistant(text: string, stopReason: "pending" | "stop" = "pending", contentType: "text" | "thinking" = "text") {
  return {
    role: "assistant",
    content: contentType === "text" ? [{ type: "text", text }] : [{ type: "thinking", thinking: text }],
    api: "openai-responses",
    provider: "openai",
    model: "gpt-5",
    usage,
    stopReason,
    timestamp: 200,
  };
}

function event(checkpoint: string, atMs: number, value: Readonly<Record<string, unknown>>): RenderingWorkloadStep {
  return { checkpoint, atMs, action: { type: "event", value } };
}

function assistantStream(id: string, values: readonly string[], startAt = 0): RenderingWorkloadStep[] {
  const steps: RenderingWorkloadStep[] = [
    event(`${id}-start`, startAt, { type: "agent_start" }),
    event(`${id}-message-start`, startAt + 1, { type: "message_start", message: assistant(values[0] ?? "") }),
  ];
  for (let index = 1; index < values.length; index += 1) {
    const previous = values[index - 1] ?? "";
    const text = values[index] ?? previous;
    steps.push(event(`${id}-chunk-${index}`, startAt + index * 5, {
      type: "message_update",
      message: assistant(text),
      assistantMessageEvent: { type: "text_delta", delta: text.slice(previous.length) },
    }));
  }
  const finalText = values.at(-1) ?? "";
  steps.push(event(`${id}-complete`, startAt + values.length * 5, { type: "message_end", message: assistant(finalText, "stop") }));
  steps.push(event(`${id}-settled`, startAt + values.length * 5 + 1, { type: "agent_settled" }));
  return steps;
}

const proseValues = [
  "Stable",
  "Stable prose grows",
  "Stable prose grows across",
  "Stable prose grows across one wrapped viewport row without repainting settled rows.",
];

/** Grows one value at a time so each entry is the complete accumulated message text. */
function accumulate(first: string, additions: readonly string[]): string[] {
  const values = [first];
  for (const addition of additions) values.push(`${values.at(-1)}${addition}`);
  return values;
}

// Rationale: a host underlines link-looking text from its own heuristic, so these fixtures
// deliberately contain dotted identifiers and relative paths without any OSC 8 sequence.
const codeBlockValues = accumulate("Here is the loader:", [
  "\n\n```ts",
  "\nimport { readFile } from \"node:fs/promises\";",
  "\nconst raw = await readFile(\"./lib/config.json\", \"utf8\");",
  "\nconst parsed = JSON.parse(raw);",
  "\n```",
  "\n\nThat reads config.json once.",
]);

const linkBearingProseValues = accumulate("The loader reads", [
  " ./lib/config.json",
  " ./lib/config.json before it resolves",
  " ./lib/config.json before it resolves parsed.value and continues past one wrapped row.",
]);

const tallLiveTailValues = accumulate("step one", [
  "\nstep two",
  "\nstep three",
  "\nstep four",
  "\nstep five",
  "\nstep six",
]);

/** Settled prompts that fill the viewport so a following stream must shift. */
function settledPrompts(id: string, count: number): RenderingWorkloadStep[] {
  return Array.from({ length: count }, (_unused, index) => event(`${id}-user-${index}`, index, {
    type: "message_start",
    message: { role: "user", content: [{ type: "text", text: `historical prompt ${index}` }], timestamp: index },
  }));
}

export const STREAM_RENDERING_WORKLOADS: readonly RenderingWorkload[] = Object.freeze([
  {
    id: "streamed-prose",
    description: "Sustained assistant prose crosses a wrap while follow-tail is active.",
    columns: 48,
    rows: 12,
    steps: assistantStream("prose", proseValues),
  },
  {
    id: "incomplete-markdown",
    description: "An incomplete Markdown construct legitimately reflows a bounded suffix.",
    columns: 44,
    rows: 12,
    steps: assistantStream("markdown", ["- first", "- first\n- sec", "- first\n- second item", "- first\n- second item\n\nDone."]),
  },
  {
    id: "streamed-code-block",
    description: "A fenced code block with path-like tokens opens, grows, closes, and settles while following.",
    columns: 48,
    rows: 14,
    steps: assistantStream("code", codeBlockValues),
  },
  {
    id: "link-bearing-prose",
    description: "Followed prose containing a relative path and a dotted identifier crosses a wrapped row.",
    columns: 50,
    rows: 14,
    steps: [
      ...settledPrompts("link", 40),
      ...assistantStream("link-tail", linkBearingProseValues, 50),
    ],
  },
  {
    id: "tall-live-tail",
    description: "A live tail taller than the stable-row slack reflows every one of its rows while following.",
    columns: 50,
    rows: 14,
    steps: [
      ...settledPrompts("tall", 40),
      ...assistantStream("tall-tail", tallLiveTailValues, 50),
    ],
  },
  {
    id: "streamed-thinking",
    description: "Thinking content grows through the same semantic assistant message path.",
    columns: 46,
    rows: 12,
    steps: [
      event("thinking-start", 0, { type: "agent_start" }),
      event("thinking-message-start", 1, { type: "message_start", message: assistant("consider", "pending", "thinking") }),
      event("thinking-chunk", 6, {
        type: "message_update",
        message: assistant("consider stable paint", "pending", "thinking"),
        assistantMessageEvent: { type: "thinking_delta", delta: " stable paint" },
      }),
      event("thinking-complete", 11, { type: "message_end", message: assistant("consider stable paint", "stop", "thinking") }),
      event("thinking-settled", 12, { type: "agent_settled" }),
    ],
  },
  {
    id: "streamed-tool-output",
    description: "Accumulated tool output arrives faster than presentation cadence and then completes.",
    columns: 52,
    rows: 14,
    steps: [
      event("tool-agent-start", 0, { type: "agent_start" }),
      event("tool-start", 1, { type: "tool_execution_start", toolCallId: "paint-tool", toolName: "bash", args: { command: "fixture" } }),
      event("tool-partial-1", 4, { type: "tool_execution_update", toolCallId: "paint-tool", toolName: "bash", args: { command: "fixture" }, partialResult: { content: [{ type: "text", text: "line 1" }] } }),
      event("tool-partial-2", 8, { type: "tool_execution_update", toolCallId: "paint-tool", toolName: "bash", args: { command: "fixture" }, partialResult: { content: [{ type: "text", text: "line 1\nline 2" }] } }),
      event("tool-complete", 12, { type: "tool_execution_end", toolCallId: "paint-tool", toolName: "bash", args: { command: "fixture" }, result: { content: [{ type: "text", text: "line 1\nline 2\ncomplete" }] }, isError: false }),
      event("tool-settled", 13, { type: "agent_settled" }),
    ],
  },
  {
    id: "fit-overflow-boundary",
    description: "Working stays bottom-aligned while fitting, then Working and pending Steering scroll after real overflow.",
    columns: 42,
    rows: 10,
    steps: [
      event("fit-working", 0, { type: "agent_start" }),
      event("fit-user", 1, { type: "message_start", message: { role: "user", content: [{ type: "text", text: "boundary" }], timestamp: 100 } }),
      event("fit-queued", 2, { type: "queue_update", steering: ["keep stable"], followUp: [] }),
      ...assistantStream("fit", ["one", "one\ntwo", "one\ntwo\nthree", "one\ntwo\nthree\nfour", "one\ntwo\nthree\nfour\nfive"], 3),
    ],
  },
  {
    id: "long-transcript-follow",
    description: "A settled long transcript precedes a small followed stream update.",
    columns: 50,
    rows: 14,
    steps: [
      ...Array.from({ length: 40 }, (_, index) => event(`long-user-${index}`, index, {
        type: "message_start",
        message: { role: "user", content: [{ type: "text", text: `historical prompt ${index}` }], timestamp: index },
      })),
      ...assistantStream("long-tail", [
        "tail output begins",
        "tail output begins and continues until it crosses the first wrapped viewport row",
        "tail output begins and continues until it crosses the first wrapped viewport row, then adds enough stable prose to cross a second row",
        "tail output begins and continues until it crosses the first wrapped viewport row, then adds enough stable prose to cross a second row and expose one final followed line",
      ], 50),
    ],
  },
  {
    id: "resize-during-stream",
    description: "A structural resize is separated from ordinary stream damage.",
    columns: 54,
    rows: 14,
    steps: [
      event("resize-start", 0, { type: "agent_start" }),
      event("resize-message-start", 1, { type: "message_start", message: assistant("before") }),
      event("resize-before", 6, {
        type: "message_update",
        message: assistant("before resize"),
        assistantMessageEvent: { type: "text_delta", delta: " resize" },
      }),
      { checkpoint: "resize-structural", atMs: 10, action: { type: "resize", columns: 38, rows: 10 } },
      event("resize-after", 15, {
        type: "message_update",
        message: assistant("before resize and after"),
        assistantMessageEvent: { type: "text_delta", delta: " and after" },
      }),
      event("resize-complete", 20, { type: "message_end", message: assistant("before resize and after", "stop") }),
      event("resize-settled", 21, { type: "agent_settled" }),
    ],
  },
  {
    id: "detached-scroll",
    description: "Wheel input detaches the viewport before additional content arrives.",
    columns: 48,
    rows: 12,
    steps: [
      event("detached-start", 0, { type: "agent_start" }),
      event("detached-message-start", 1, { type: "message_start", message: assistant(proseValues[0]!) }),
      ...proseValues.slice(1).map((text, index) => event(`detached-chunk-${index + 1}`, 5 + index * 5, {
        type: "message_update",
        message: assistant(text),
        assistantMessageEvent: { type: "text_delta", delta: text.slice(proseValues[index]!.length) },
      })),
      { checkpoint: "detached-wheel-up", atMs: 25, action: { type: "input", data: "\u001b[<64;5;4M" } },
      event("detached-new-output", 30, {
        type: "message_update",
        message: assistant(`${proseValues.at(-1)} Hidden tail.`),
        assistantMessageEvent: { type: "text_delta", delta: " Hidden tail." },
      }),
      event("detached-complete", 35, {
        type: "message_end",
        message: assistant(`${proseValues.at(-1)} Hidden tail.`, "stop"),
      }),
      event("detached-settled", 36, { type: "agent_settled" }),
    ],
  },
]);
