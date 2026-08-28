import { describe, expect, it } from "vitest";
import {
  AGENT_ENGINE_CONTRACT_VERSION,
  assertAgentDomainCapabilities,
  assertAgentFailure,
  assertAgentMessage,
  assertAgentModelDescriptor,
  assertAgentResourceDescriptor,
  assertAgentSettingDescriptor,
  assertAgentThemeDescriptor,
  assertAgentToolDescriptor,
  assertAgentUiContribution,
  assertAgentUsage,
  decodeAgentEvent,
  encodeAgentEvent,
  type AgentDomainCapabilities,
  type AgentEvent,
} from "../../../src/contracts/agent-engine/index.js";

const domains: AgentDomainCapabilities = {
  messageContent: ["text", "thinking", "image", "tool-call", "tool-result", "unknown"],
  tools: ["discovery", "invocation"],
  usage: ["tokens", "cache"],
  models: ["discovery", "selection", "thinking-level"],
  settings: ["read", "write"],
  resources: ["commands", "prompts", "skills", "extensions", "themes"],
  uiContributions: ["transcript", "tool", "status", "unknown"],
};

describe("normalized agent domain contracts", () => {
  it("advertises each capability independently and rejects coarse or duplicate values", () => {
    expect(() => assertAgentDomainCapabilities(domains)).not.toThrow();
    expect(() => assertAgentDomainCapabilities({ ...domains, tools: ["all" as never] })).toThrow(/tools capability/);
    expect(() => assertAgentDomainCapabilities({ ...domains, usage: ["tokens", "tokens"] })).toThrow(/duplicated/);
  });

  it("preserves forward-compatible unknown content through serialization", () => {
    const event: AgentEvent = {
      contractVersion: AGENT_ENGINE_CONTRACT_VERSION,
      type: "content",
      sessionId: "session-1",
      sequence: 1,
      content: {
        id: "message-1",
        role: "assistant",
        status: "final",
        content: [{ kind: "unknown", sourceType: "future-reasoning-chart", payload: { points: [1, 2, 3] } }],
      },
    };
    assertAgentMessage(event.content);
    expect(decodeAgentEvent(encodeAgentEvent(event))).toEqual(event);
  });

  it("requires unrecognized content to use the bounded unknown envelope", () => {
    expect(() => assertAgentMessage({ id: "message-1", role: "assistant", status: "final", content: [{ kind: "future" } as never] })).toThrow(/unknown envelope/);
    const cyclic: Record<string, unknown> = {}; cyclic.self = cyclic;
    expect(() => assertAgentMessage({ id: "message-1", role: "assistant", status: "final", content: [{ kind: "unknown", sourceType: "future", payload: cyclic as never }] })).toThrow(/bounded JSON/);
  });

  it("validates tool, usage, model, settings, resource, theme, UI, and failure contracts", () => {
    expect(() => assertAgentToolDescriptor({ name: "read", description: "Read a file", inputSchema: { type: "object" } })).not.toThrow();
    expect(() => assertAgentUsage({ inputTokens: 1, outputTokens: 2, cacheReadTokens: 3, cacheWriteTokens: 4, cost: null })).not.toThrow();
    expect(() => assertAgentModelDescriptor({ providerId: "provider", modelId: "model", displayName: "Model", contextWindow: 1000, thinkingLevels: ["low", "high"] })).not.toThrow();
    expect(() => assertAgentSettingDescriptor({
      key: "thinking",
      valueType: "enum",
      writable: true,
      choices: ["low", "high"],
      application: "live",
      owner: "agent",
      available: true,
      limitationReason: null,
      storedValue: "low",
      effectiveValue: "low",
    })).not.toThrow();
    expect(() => assertAgentSettingDescriptor({ key: "incomplete", valueType: "boolean", writable: true } as never)).toThrow(/invalid/);
    expect(() => assertAgentSettingDescriptor({
      key: "contradictory",
      valueType: "boolean",
      writable: true,
      application: "live",
      owner: "agent",
      available: false,
      limitationReason: null,
      storedValue: true,
      effectiveValue: true,
    })).toThrow(/contradictory/);
    expect(() => assertAgentResourceDescriptor({ id: "skill-1", kind: "skill", label: "Skill", metadata: {} })).not.toThrow();
    expect(() => assertAgentThemeDescriptor({ id: "dark", label: "Dark", tokens: { accent: "#fff" } })).not.toThrow();
    expect(() => assertAgentUiContribution({ id: "status-1", slot: "status", version: 1, payload: {} })).not.toThrow();
    expect(() => assertAgentFailure({ category: "network", code: "offline", message: "Offline", retryable: true, details: {} })).not.toThrow();
  });
});
