import { describe, expect, it } from "vitest";
import type { OwnedUiTranscriptBlock } from "../../../src/foundation/owned-ui-contracts/index.js";
import {
  adaptPiAssistantMessage,
  adaptPiToolExecution,
  adaptPiUserMessage,
} from "../../../src/foundation/pi-component-adapter/index.js";

function block(kind: OwnedUiTranscriptBlock["kind"], text: string, payload: unknown = {}): OwnedUiTranscriptBlock {
  return {
    id: `${kind}-1`,
    kind,
    status: kind === "tool-call" ? "live" : "finalized",
    revision: 1,
    title: kind.startsWith("tool") ? "read" : null,
    text,
    payload,
  };
}

describe("Pi public component adapters", () => {
  it("adapts owned user, assistant, and tool blocks to public Pi components without exposing Pi types", () => {
    const user = adaptPiUserMessage(block("user", "hello user"), 60);
    const assistant = adaptPiAssistantMessage(block("assistant", "hello assistant", { provider: "openai", model: "gpt-5" }), 60);
    const tool = adaptPiToolExecution(block("tool-result", "read completed", {
      toolCallId: "tool-1",
      toolName: "read",
      arguments: { summary: "{}", json: { path: "README.md" } },
      isError: false,
    }), 60, process.cwd());

    expect(user.join("\n")).toContain("hello user");
    expect(assistant.join("\n")).toContain("hello assistant");
    expect(tool.join("\n")).toContain("README.md");
    for (const rows of [user, assistant, tool]) expect(rows.length).toBeGreaterThan(0);
  });

  it("rejects mismatched block kinds inside the adapter", () => {
    expect(() => adaptPiUserMessage(block("assistant", "wrong"), 40)).toThrow(/requires user/);
    expect(() => adaptPiAssistantMessage(block("user", "wrong"), 40)).toThrow(/requires assistant/);
    expect(() => adaptPiToolExecution(block("system", "wrong"), 40, process.cwd())).toThrow(/tool block/);
  });
});
