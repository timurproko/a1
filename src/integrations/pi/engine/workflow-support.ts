/** Pure helpers behind pinned Pi's workflows: result wording, session-info presentation, model matching, and option shaping. */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readPinnedCommandChangelog } from "./changelog.js";
import { dynamicObject, finiteNumber, isRecord, stringProperty, stringValue } from "./message-values.js";
import { copyToClipboard, type AgentSessionServices } from "../startup-public.js";
import type {
  PiScopedModelDescriptor,
  PiSessionInfoPresentation,
  PiWorkflowHost,
  PiWorkflowLoginNotification,
  PiWorkflowMessage,
  PiWorkflowOption,
  PiWorkflowRequest,
  PiWorkflowResult,
} from "./workflows.js";

type PiServicesApi = AgentSessionServices;

const execFileAsync = promisify(execFile);

export const AUTH_REFRESH_TIMEOUT_MS = 15_000;

// Provenance: Pi 0.84.2 core/model-resolver.ts defaultModelPerProvider.
export const PINNED_DEFAULT_MODEL_BY_PROVIDER: Readonly<Record<string, string>> = Object.freeze({
  "amazon-bedrock": "us.anthropic.claude-opus-4-6-v1",
  "ant-ling": "Ring-2.6-1T",
  anthropic: "claude-opus-4-8",
  openai: "gpt-5.5",
  "azure-openai-responses": "gpt-5.4",
  "openai-codex": "gpt-5.5",
  radius: "auto",
  nvidia: "nvidia/nemotron-3-super-120b-a12b",
  deepseek: "deepseek-v4-pro",
  google: "gemini-3.1-pro-preview",
  "google-vertex": "gemini-3.1-pro-preview",
  "github-copilot": "gpt-5.4",
  openrouter: "moonshotai/kimi-k2.6",
  "vercel-ai-gateway": "zai/glm-5.1",
  xai: "grok-4.5",
  groq: "openai/gpt-oss-120b",
  cerebras: "zai-glm-4.7",
  zai: "glm-5.1",
  "zai-coding-cn": "glm-5.1",
  mistral: "devstral-medium-latest",
  minimax: "MiniMax-M2.7",
  "minimax-cn": "MiniMax-M2.7",
  moonshotai: "kimi-k2.6",
  "moonshotai-cn": "kimi-k2.6",
  huggingface: "moonshotai/Kimi-K2.6",
  fireworks: "accounts/fireworks/models/kimi-k2p6",
  together: "moonshotai/Kimi-K2.6",
  baseten: "zai-org/GLM-5.2",
  opencode: "kimi-k2.6",
  "opencode-go": "kimi-k2.6",
  "kimi-coding": "kimi-for-coding",
  "cloudflare-workers-ai": "@cf/moonshotai/kimi-k2.6",
  "cloudflare-ai-gateway": "workers-ai/@cf/moonshotai/kimi-k2.6",
  "qwen-token-plan": "qwen3.7-max",
  "qwen-token-plan-cn": "qwen3.7-max",
  "qwen-token-plan-individual": "qwen3.8-max",
  xiaomi: "mimo-v2.5-pro",
  "xiaomi-token-plan-cn": "mimo-v2.5-pro",
  "xiaomi-token-plan-ams": "mimo-v2.5-pro",
  "xiaomi-token-plan-sgp": "mimo-v2.5-pro",
});

export function pinnedSessionInfoPresentation(
  value: unknown,
  sessionName: string | undefined,
  entries: readonly unknown[],
  modelRuntime: PiServicesApi["modelRuntime"],
): PiSessionInfoPresentation {
  const stats = isRecord(value) ? value : {};
  const tokens = dynamicObject(stats, "tokens");
  return {
    kind: "session-info",
    ...(sessionName === undefined ? {} : { sessionName }),
    stats: {
      ...(stringProperty(stats, "sessionFile") === undefined ? {} : { sessionFile: stringProperty(stats, "sessionFile")! }),
      sessionId: stringProperty(stats, "sessionId") ?? "unknown",
      userMessages: finiteNumber(stats.userMessages),
      assistantMessages: finiteNumber(stats.assistantMessages),
      toolCalls: finiteNumber(stats.toolCalls),
      toolResults: finiteNumber(stats.toolResults),
      totalMessages: finiteNumber(stats.totalMessages),
      tokens: {
        input: finiteNumber(tokens.input),
        output: finiteNumber(tokens.output),
        cacheRead: finiteNumber(tokens.cacheRead),
        cacheWrite: finiteNumber(tokens.cacheWrite),
        total: finiteNumber(tokens.total),
      },
      cost: finiteNumber(stats.cost),
    },
    cacheWaste: pinnedCacheWaste(entries, modelRuntime),
    usageBreakdown: pinnedUsageCostBreakdown(entries),
  };
}

export function pinnedUsageCostBreakdown(entries: readonly unknown[]): PiSessionInfoPresentation["usageBreakdown"] {
  const totals = new Map<string, { cost: number; tokens: number }>();
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    let key: string | undefined;
    let usage: Record<string, unknown> | undefined;
    const message = dynamicObject(entry, "message");
    if (entry.type === "message" && message.role === "assistant") {
      const provider = stringProperty(message, "provider");
      const model = stringProperty(message, "responseModel") ?? stringProperty(message, "model");
      if (provider && model) key = `${provider}/${model}`;
      usage = dynamicObject(message, "usage");
    } else if (entry.type === "message" && message.role === "toolResult" && isRecord(message.usage)) {
      key = "Tools/summaries";
      usage = message.usage;
    } else if ((entry.type === "branch_summary" || entry.type === "compaction") && isRecord(entry.usage)) {
      key = "Tools/summaries";
      usage = entry.usage;
    }
    if (!key || !usage) continue;
    const cost = finiteNumber(dynamicObject(usage, "cost").total);
    const tokens = finiteNumber(usage.input) + finiteNumber(usage.output)
      + finiteNumber(usage.cacheRead) + finiteNumber(usage.cacheWrite);
    const current = totals.get(key) ?? { cost: 0, tokens: 0 };
    current.cost += cost;
    current.tokens += tokens;
    totals.set(key, current);
  }
  return [...totals].map(([key, total]) => ({ key, ...total }))
    .filter(entry => entry.cost > 0 || entry.tokens > 0)
    .sort((a, b) => b.cost - a.cost);
}

export function pinnedCacheWaste(
  entries: readonly unknown[],
  modelRuntime: PiServicesApi["modelRuntime"],
): PiSessionInfoPresentation["cacheWaste"] {
  let previous: { promptTokens: number; modelKey: string; timestamp: number; reportedCache: boolean } | undefined;
  const totals = { missedTokens: 0, missedCost: 0, missCount: 0 };
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    if (entry.type === "compaction" || entry.type === "branch_summary") {
      previous = undefined;
      continue;
    }
    const message = dynamicObject(entry, "message");
    if (entry.type !== "message" || message.role !== "assistant") continue;
    const usage = dynamicObject(message, "usage");
    const input = finiteNumber(usage.input);
    const cacheRead = finiteNumber(usage.cacheRead);
    const cacheWrite = finiteNumber(usage.cacheWrite);
    const promptTokens = input + cacheRead + cacheWrite;
    if (previous && promptTokens > 0 && (cacheRead + cacheWrite > 0 || previous.reportedCache)) {
      const missedTokens = Math.min(previous.promptTokens, promptTokens) - cacheRead;
      if (missedTokens > 1024) {
        const cost = dynamicObject(usage, "cost");
        const paidTokens = input + cacheWrite;
        const paidRate = paidTokens > 0 ? (finiteNumber(cost.input) + finiteNumber(cost.cacheWrite)) / paidTokens : 0;
        const provider = stringProperty(message, "provider") ?? "";
        const modelId = stringProperty(message, "model") ?? "";
        const model = modelRuntime.getModel(provider, modelId);
        const modelCost = dynamicObject(dynamicObject(model, "cost"));
        const readRate = cacheRead > 0
          ? finiteNumber(cost.cacheRead) / cacheRead
          : finiteNumber(modelCost.cacheRead) / 1_000_000;
        totals.missedTokens += missedTokens;
        totals.missedCost += missedTokens * Math.max(0, paidRate - readRate);
        totals.missCount += 1;
      }
    }
    if (promptTokens > 0) {
      const provider = stringProperty(message, "provider") ?? "";
      const model = stringProperty(message, "model") ?? "";
      previous = {
        promptTokens,
        modelKey: `${provider}/${model}`,
        timestamp: finiteNumber(message.timestamp),
        reportedCache: (previous?.reportedCache ?? false) || cacheRead + cacheWrite > 0,
      };
    }
  }
  return totals;
}

export function defaultWorkflowHost(): PiWorkflowHost {
  return {
    copyText: copyToClipboard,
    async runCommand(command, arguments_, options) {
      const result = await execFileAsync(command, [...arguments_], { encoding: "utf8", signal: options?.signal });
      return { stdout: result.stdout, stderr: result.stderr };
    },
    readChangelog: readPinnedCommandChangelog,
  };
}

export function workflowLoginNotification(event: unknown): PiWorkflowLoginNotification | undefined {
  if (!isRecord(event)) return undefined;
  if (event.type === "auth_url") {
    const url = stringProperty(event, "url");
    if (!url) return undefined;
    const instructions = stringProperty(event, "instructions");
    return { type: "auth_url", url, ...(instructions === undefined ? {} : { instructions }) };
  }
  if (event.type === "device_code") {
    const verificationUri = stringProperty(event, "verificationUri");
    const userCode = stringProperty(event, "userCode");
    return verificationUri && userCode ? { type: "device_code", verificationUri, userCode } : undefined;
  }
  const message = stringProperty(event, "message");
  if (!message) return undefined;
  if (event.type === "info") {
    const links = Array.isArray(event.links) ? event.links.filter(isRecord).flatMap(link => {
      const url = stringProperty(link, "url");
      if (!url) return [];
      const label = stringProperty(link, "label");
      return [{ ...(label === undefined ? {} : { label }), url }];
    }) : [];
    return { type: "info", message, ...(links.length === 0 ? {} : { links }) };
  }
  return { type: event.type === "waiting" ? "waiting" : "progress", message };
}

export function workflowResult(
  command: PiWorkflowRequest["command"],
  outcome: PiWorkflowResult["outcome"],
  message: string,
  detail?: string,
  messageKind?: PiWorkflowResult["messageKind"],
  messages?: readonly PiWorkflowMessage[],
): PiWorkflowResult {
  return {
    command,
    outcome,
    message,
    ...(detail === undefined ? {} : { detail }),
    ...(messageKind === undefined ? {} : { messageKind }),
    ...(messages === undefined ? {} : { messages: Object.freeze([...messages]) }),
  };
}

export function workflowConfirmation(command: PiWorkflowRequest["command"], message: string, detail?: string): PiWorkflowResult {
  return {
    command,
    outcome: "requires-confirmation",
    message,
    ...(detail === undefined ? {} : { detail }),
    selectorTitle: "Confirm",
    options: [
      { id: "yes", label: "Yes" },
      { id: "no", label: "No" },
    ],
  };
}

export function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function shareCommandFailureDetail(error: unknown): string {
  // Compatibility: Pi reports a failed child's stderr, not execFile's command wrapper.
  if (isRecord(error) && (typeof error.code === "number" || typeof error.signal === "string") && typeof error.stderr === "string") {
    return error.stderr.trim() || "Unknown error";
  }
  return errorMessage(error, "Unknown error");
}

export function commandMissing(error: unknown): boolean {
  return isRecord(error) && error.code === "ENOENT";
}

export function isAbortError(error: unknown): boolean {
  return isRecord(error) && (error.name === "AbortError" || error.code === "ABORT_ERR");
}

export function shareViewerUrl(gistId: string): string {
  const baseUrl = process.env.PI_SHARE_VIEWER_URL || "https://pi.dev/session/";
  return `${baseUrl}#${gistId}`;
}

export function workflowOptions(value: unknown, idKey: string, labelKey: string): readonly PiWorkflowOption[] {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).flatMap(item => {
    const id = stringProperty(item, idKey);
    if (!id) return [];
    return [{ id, label: stringProperty(item, labelKey) ?? id }];
  });
}

export function sessionInfoOptions(value: readonly unknown[]): readonly PiWorkflowOption[] {
  return value.filter(isRecord).flatMap(info => {
    const path = stringProperty(info, "path");
    if (!path) return [];
    const modified = info.modified instanceof Date ? info.modified.toISOString() : stringProperty(info, "modified") ?? "unknown time";
    const messageCount = typeof info.messageCount === "number" ? info.messageCount : 0;
    return [{
      id: path,
      label: stringProperty(info, "name") ?? stringProperty(info, "firstMessage") ?? stringProperty(info, "id") ?? path,
      description: `${messageCount} messages · ${modified}`,
    }];
  });
}

export function pathArgument(value: string): string | undefined {
  if (!value) return undefined;
  const quote = value[0];
  if (quote === '"' || quote === "'") {
    const closing = value.indexOf(quote, 1);
    return closing < 0 ? undefined : value.slice(1, closing);
  }
  return value.split(/\s/, 1)[0] || undefined;
}

export function pinnedHotkeySummary(): string {
  return [
    "Enter: send message · Alt+Enter: queue follow-up",
    "Escape: cancel/abort · Ctrl+C: clear/exit · Ctrl+D: exit when empty",
    "Shift+Tab: cycle thinking · Ctrl+P/Shift+Ctrl+P: cycle models · Ctrl+L: select model",
    "Ctrl+O: expand tools · Ctrl+T: toggle thinking · Ctrl+X: copy message",
    "Alt+Up: restore queued messages · /: commands · !/!!: bash",
  ].join("\n");
}

export function scopedModelRecords(modelRuntime: PiServicesApi["modelRuntime"]): readonly {
  readonly descriptor: PiScopedModelDescriptor;
  readonly model: ReturnType<PiServicesApi["modelRuntime"]["getAvailableSnapshot"]>[number];
}[] {
  return modelRuntime.getAvailableSnapshot().map(model => ({
    descriptor: { provider: model.provider, id: model.id, name: model.name ?? model.id },
    model,
  }));
}

export function scopedModelReference(value: unknown): string | undefined {
  if (!isRecord(value) || !isRecord(value.model)) return undefined;
  const provider = stringValue(value.model.provider);
  const id = stringValue(value.model.id);
  return provider && id ? `${provider}/${id}` : undefined;
}

export function resolveConfiguredModelIds(
  patterns: readonly string[],
  models: readonly { readonly descriptor: PiScopedModelDescriptor }[],
): readonly string[] {
  const references = models.map(item => `${item.descriptor.provider}/${item.descriptor.id}`);
  const resolved: string[] = [];
  for (const pattern of patterns) {
    const thinkingSuffix = /:(?:off|minimal|low|medium|high|xhigh)$/.exec(pattern);
    const modelPattern = thinkingSuffix === null ? pattern : pattern.slice(0, -thinkingSuffix[0].length);
    const matcher = wildcardMatcher(modelPattern);
    const matches = references.filter((reference, index) => matcher.test(reference) || matcher.test(models[index]?.descriptor.id ?? ""));
    if (matches.length === 0) {
      resolved.push(pattern);
    } else {
      for (const match of matches) if (!resolved.includes(match)) resolved.push(match);
    }
  }
  return resolved;
}

export function wildcardMatcher(pattern: string): RegExp {
  let source = "";
  for (const character of pattern) {
    if (character === "*") source += ".*";
    else if (character === "?") source += ".";
    else source += character.replace(/[\\^$.*+?()[\]{}|]/g, "\\$&");
  }
  return new RegExp(`^${source}$`, "i");
}

export function isUnknownModel(value: unknown): boolean {
  return isRecord(value)
    && value.provider === "unknown"
    && value.id === "unknown"
    && value.api === "unknown";
}

export function findExactWorkflowModel<T>(reference: string, models: readonly T[]): T | undefined {
  const normalized = reference.trim().toLowerCase();
  const canonical = models.filter(model => {
    const provider = stringProperty(model, "provider");
    const id = stringProperty(model, "id");
    return provider !== undefined && id !== undefined && `${provider}/${id}`.toLowerCase() === normalized;
  });
  if (canonical.length === 1) return canonical[0];
  const bare = models.filter(model => stringProperty(model, "id")?.toLowerCase() === normalized);
  return bare.length === 1 ? bare[0] : undefined;
}
