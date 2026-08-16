import { AssistantMessageComponent, getMarkdownTheme, initTheme } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../src/foundation/owned-ui-contracts/index.js";
import { applyPiTheme, createPiShellTranscriptComponent } from "../../../src/foundation/pi-component-adapter/index.js";

const usage = { input: 7, output: 11, cacheRead: 2, cacheWrite: 1, totalTokens: 21, cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 } };

type Content = Array<Record<string, unknown>>;

function message(content: Content, stopReason: string, errorMessage?: string) {
  return {
    role: "assistant",
    content,
    api: "openai-responses",
    provider: "openai",
    model: "gpt-5",
    usage,
    stopReason,
    ...(errorMessage === undefined ? {} : { errorMessage }),
    timestamp: 42,
  };
}

function owned(id: string, content: Content, status: "live" | "finalized", revision: number, stopReason: string, errorMessage?: string): OwnedUiTranscriptBlock {
  return {
    id,
    kind: "assistant",
    status,
    revision,
    title: "Assistant",
    text: content.filter(item => item.type === "text").map(item => item.text).join("\n"),
    payload: {
      role: "assistant",
      content,
      api: "openai-responses",
      provider: "openai",
      model: "gpt-5",
      usage,
      stopReason,
      ...(errorMessage === undefined ? {} : { errorMessage }),
      timestamp: 42,
    },
  };
}

function producer(content: Content, streaming: boolean, stopReason: string, errorMessage?: string) {
  const component = new AssistantMessageComponent(undefined, false, getMarkdownTheme(), undefined, 1);
  component.updateContent(message(content, stopReason, errorMessage) as never, streaming);
  return component;
}

describe("pinned ordered assistant content parity", () => {
  it.each([17, 31, 48, 72])("matches consecutive Markdown rows, paragraphs, links, code, wrapping, and Unicode at %i columns", width => {
    initTheme("dark", false);
    applyPiTheme("dark");
    const content = [{
      type: "text",
      text: "Intro café 界\n\n- alpha\n- beta\n- gamma\n\nParagraph with [link](https://example.com).\n\n```ts\nconst λ = '😀';\n```",
    }];
    const expected = producer(content, false, "stop").render(width);
    const actual = createPiShellTranscriptComponent(owned("markdown", content, "finalized", 1, "stop"), "D:/work").render(width);
    expect(actual).toEqual(expected);
  });

  it.each(["stop", "length", "error", "aborted"])("preserves mixed thinking/text/tool order and %s terminal status", stopReason => {
    initTheme("dark", false);
    applyPiTheme("dark");
    const content = [
      { type: "thinking", thinking: "First thought" },
      { type: "thinking", thinking: "Second thought 日本語" },
      { type: "text", text: "Before tool" },
      { type: "toolCall", id: "call-1", name: "read", arguments: { path: "初.txt" } },
      { type: "thinking", thinking: "After tool thought" },
      { type: "text", text: "After tool text" },
    ];
    const error = stopReason === "error" ? "deterministic failure" : stopReason === "aborted" ? "custom abort" : undefined;
    for (const width of [24, 40, 72]) {
      const expected = producer(content, false, stopReason, error).render(width);
      const actual = createPiShellTranscriptComponent(owned("mixed", content, "finalized", 1, stopReason, error), "D:/work").render(width);
      expect(actual).toEqual(expected);
    }
  });

  it("retains component identity across streaming, settlement replacement, theme, and resize", () => {
    initTheme("light", false);
    applyPiTheme("light");
    const initial = [
      { type: "thinking", thinking: "Plan" },
      { type: "text", text: "Streaming **one**" },
    ];
    const replacement = [
      { type: "thinking", thinking: "Plan complete" },
      { type: "text", text: "Streaming **one two**\n\n- x\n- y" },
      { type: "toolCall", id: "call-2", name: "write", arguments: { path: "λ.txt", content: "界" } },
    ];
    const expected = producer(initial, true, "pending");
    const actual = createPiShellTranscriptComponent(owned("stable", initial, "live", 1, "pending"), "D:/work");
    expect(actual.render(31)).toEqual(expected.render(31));

    expected.updateContent(message(replacement, "stop") as never, false);
    actual.update(owned("stable", replacement, "finalized", 2, "stop"));
    expect(actual.id).toBe("stable");
    expect(actual.revision).toBe(2);
    expect(actual.render(31)).toEqual(expected.render(31));
    expect(actual.render(19)).toEqual(expected.render(19));
  });
});
