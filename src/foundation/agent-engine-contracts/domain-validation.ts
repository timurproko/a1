import type {
  AgentDomainCapabilities,
  AgentFailure,
  AgentMessage,
  AgentMessageContent,
  AgentModelDescriptor,
  AgentResourceDescriptor,
  AgentSettingDescriptor,
  AgentThemeDescriptor,
  AgentToolDescriptor,
  AgentUiContribution,
  AgentUsage,
} from "./domain.js";

const CONTENT = new Set(["text", "thinking", "image", "tool-call", "tool-result", "unknown"]);
const CAPABILITIES = {
  tools: new Set(["discovery", "invocation", "streaming-results"]),
  usage: new Set(["tokens", "cache", "cost"]),
  models: new Set(["discovery", "selection", "thinking-level"]),
  settings: new Set(["read", "write"]),
  resources: new Set(["commands", "prompts", "skills", "extensions", "themes"]),
  uiContributions: new Set(["transcript", "tool", "editor", "status", "dialog", "overlay", "unknown"]),
};
const FAILURES = new Set(["configuration", "authentication", "authorization", "network", "rate-limit", "context-limit", "tool", "cancelled", "engine", "unknown"]);

export function assertAgentDomainCapabilities(value: AgentDomainCapabilities): void {
  unique(value.messageContent, CONTENT, "message content capability");
  for (const [key, allowed] of Object.entries(CAPABILITIES)) unique(value[key as keyof typeof CAPABILITIES], allowed, `${key} capability`);
}

export function assertAgentMessage(message: AgentMessage): void {
  id(message.id, "message id");
  if (!["user", "assistant", "tool", "system"].includes(message.role) || !["streaming", "final"].includes(message.status)) throw new TypeError("message metadata is invalid");
  if (!Array.isArray(message.content) || message.content.length === 0) throw new TypeError("message content is empty");
  for (const content of message.content) assertAgentMessageContent(content);
}

export function assertAgentMessageContent(content: AgentMessageContent): void {
  if (!CONTENT.has(content.kind)) throw new TypeError("message content kind is unknown and must use the unknown envelope");
  if (content.kind === "text" || content.kind === "thinking") text(content.text, "message text", true);
  if (content.kind === "image") { text(content.mediaType, "image media type"); text(content.data, "image data"); }
  if (content.kind === "tool-call") { id(content.invocationId, "tool invocation id"); id(content.toolName, "tool name"); json(content.input, "tool input"); }
  if (content.kind === "tool-result") { id(content.invocationId, "tool result invocation id"); json(content.output, "tool output"); if (typeof content.failed !== "boolean") throw new TypeError("tool result failure flag is invalid"); }
  if (content.kind === "unknown") { text(content.sourceType, "unknown content source type"); json(content.payload, "unknown content payload"); }
}

export function assertAgentToolDescriptor(value: AgentToolDescriptor): void { id(value.name, "tool name"); text(value.description, "tool description", true); json(value.inputSchema, "tool input schema"); }
export function assertAgentUsage(value: AgentUsage): void { for (const amount of [value.inputTokens, value.outputTokens, value.cacheReadTokens, value.cacheWriteTokens]) nonNegative(amount, "usage token count"); if (value.cost !== null && (!(typeof value.cost === "number") || !Number.isFinite(value.cost) || value.cost < 0)) throw new TypeError("usage cost is invalid"); }
export function assertAgentModelDescriptor(value: AgentModelDescriptor): void { id(value.providerId, "model provider id"); id(value.modelId, "model id"); text(value.displayName, "model display name"); nonNegative(value.contextWindow, "model context window"); unique(value.thinkingLevels, undefined, "model thinking levels"); }
export function assertAgentSettingDescriptor(value: AgentSettingDescriptor): void { id(value.key, "setting key"); if (!["boolean", "number", "string", "enum", "json"].includes(value.valueType) || typeof value.writable !== "boolean") throw new TypeError("setting descriptor is invalid"); if (value.choices) for (const choice of value.choices) json(choice, "setting choice"); }
export function assertAgentResourceDescriptor(value: AgentResourceDescriptor): void { id(value.id, "resource id"); if (!["command", "prompt", "skill", "extension", "other"].includes(value.kind)) throw new TypeError("resource kind is invalid"); text(value.label, "resource label"); json(value.metadata, "resource metadata"); }
export function assertAgentThemeDescriptor(value: AgentThemeDescriptor): void { id(value.id, "theme id"); text(value.label, "theme label"); if (!value.tokens || typeof value.tokens !== "object" || Object.values(value.tokens).some(token => typeof token !== "string")) throw new TypeError("theme tokens are invalid"); }
export function assertAgentUiContribution(value: AgentUiContribution): void { id(value.id, "UI contribution id"); if (!CAPABILITIES.uiContributions.has(value.slot) || !Number.isSafeInteger(value.version) || value.version < 1) throw new TypeError("UI contribution metadata is invalid"); json(value.payload, "UI contribution payload"); }
export function assertAgentFailure(value: AgentFailure): void { if (!FAILURES.has(value.category)) throw new TypeError("failure category is invalid"); id(value.code, "failure code"); text(value.message, "failure message"); if (typeof value.retryable !== "boolean") throw new TypeError("failure retryability is invalid"); json(value.details, "failure details"); }

function unique(values: readonly unknown[], allowed: ReadonlySet<unknown> | undefined, label: string): void { if (!Array.isArray(values)) throw new TypeError(`${label} must be an array`); const found = new Set(); for (const value of values) { if ((allowed && !allowed.has(value)) || typeof value !== "string") throw new TypeError(`${label} is invalid: ${String(value)}`); if (found.has(value)) throw new TypeError(`${label} is duplicated: ${String(value)}`); found.add(value); } }
function id(value: unknown, label: string): asserts value is string { if (typeof value !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value)) throw new TypeError(`${label} is invalid`); }
function text(value: unknown, label: string, empty = false): asserts value is string { if (typeof value !== "string" || (!empty && value.length === 0) || Buffer.byteLength(value) > 256 * 1024) throw new TypeError(`${label} is invalid`); }
function nonNegative(value: unknown, label: string): void { if (!Number.isSafeInteger(value) || (value as number) < 0) throw new TypeError(`${label} is invalid`); }
function json(value: unknown, label: string): void { try { const encoded = JSON.stringify(value); if (encoded === undefined || Buffer.byteLength(encoded) > 256 * 1024) throw new Error(); } catch { throw new TypeError(`${label} must be bounded JSON`); } }
