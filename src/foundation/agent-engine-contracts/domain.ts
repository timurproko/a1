export type AgentJsonValue = null | boolean | number | string | readonly AgentJsonValue[] | { readonly [key: string]: AgentJsonValue };

export type AgentMessageContent =
  | { readonly kind: "text" | "thinking"; readonly text: string }
  | { readonly kind: "image"; readonly mediaType: string; readonly data: string }
  | { readonly kind: "tool-call"; readonly invocationId: string; readonly toolName: string; readonly input: AgentJsonValue }
  | { readonly kind: "tool-result"; readonly invocationId: string; readonly output: AgentJsonValue; readonly failed: boolean }
  | { readonly kind: "unknown"; readonly sourceType: string; readonly payload: AgentJsonValue };

export interface AgentMessage {
  readonly id: string;
  readonly role: "user" | "assistant" | "tool" | "system";
  readonly status: "streaming" | "final";
  readonly content: readonly AgentMessageContent[];
}

export interface AgentToolDescriptor {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: AgentJsonValue;
}

export interface AgentUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cacheReadTokens: number;
  readonly cacheWriteTokens: number;
  readonly cost: number | null;
}

export interface AgentModelDescriptor {
  readonly providerId: string;
  readonly modelId: string;
  readonly displayName: string;
  readonly contextWindow: number;
  readonly thinkingLevels: readonly string[];
}

export interface AgentSettingDescriptor {
  readonly key: string;
  readonly valueType: "boolean" | "number" | "string" | "enum" | "json";
  readonly writable: boolean;
  readonly choices?: readonly AgentJsonValue[];
  /** Label the engine shows for this setting, when it has one. */
  readonly label?: string;
  /** One-line explanation the engine shows for this setting. */
  readonly description?: string;
  /**
   * Flags a structured setting offers. Declared by the source rather than read
   * from the stored value, so an unset flag still has a row and a default.
   */
  readonly flags?: readonly AgentSettingFlag[];
}

export interface AgentSettingFlag {
  readonly key: string;
  readonly label: string;
  readonly description: string;
  /** Value to show when the stored object says nothing about this flag. */
  readonly fallback: boolean;
}

export interface AgentResourceDescriptor {
  readonly id: string;
  readonly kind: "command" | "prompt" | "skill" | "extension" | "other";
  readonly label: string;
  readonly metadata: AgentJsonValue;
}

export interface AgentThemeDescriptor {
  readonly id: string;
  readonly label: string;
  readonly tokens: Readonly<Record<string, string>>;
}

export interface AgentUiContribution {
  readonly id: string;
  readonly slot: "transcript" | "tool" | "editor" | "status" | "dialog" | "overlay" | "unknown";
  readonly version: number;
  readonly payload: AgentJsonValue;
}

export type AgentFailureCategory =
  | "configuration"
  | "authentication"
  | "authorization"
  | "network"
  | "rate-limit"
  | "context-limit"
  | "tool"
  | "cancelled"
  | "engine"
  | "unknown";

export interface AgentFailure {
  readonly category: AgentFailureCategory;
  readonly code: string;
  readonly message: string;
  readonly retryable: boolean;
  readonly details: AgentJsonValue;
}

export interface AgentDomainCapabilities {
  readonly messageContent: readonly AgentMessageContent["kind"][];
  readonly tools: readonly ("discovery" | "invocation" | "streaming-results")[];
  readonly usage: readonly ("tokens" | "cache" | "cost")[];
  readonly models: readonly ("discovery" | "selection" | "thinking-level")[];
  readonly settings: readonly ("read" | "write")[];
  readonly resources: readonly ("commands" | "prompts" | "skills" | "extensions" | "themes")[];
  readonly uiContributions: readonly AgentUiContribution["slot"][];
}
