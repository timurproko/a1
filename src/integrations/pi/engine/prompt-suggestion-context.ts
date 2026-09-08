import { isDeepStrictEqual } from "node:util";
import { convertToLlm, type AgentSession, type AgentSessionServices, type LoadExtensionsResult, type ModelRuntime } from "@earendil-works/pi-coding-agent";
import { CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, type OwnedUiPromptSuggestionOutcome, type OwnedUiPromptSuggestionUsage } from "../../../contracts/owned-ui/index.js";

type Model = Parameters<ModelRuntime["completeSimple"]>[0];
type Context = Parameters<ModelRuntime["completeSimple"]>[1];
type Options = NonNullable<Parameters<ModelRuntime["completeSimple"]>[2]>;
type Message = AgentSession["messages"][number];

const MUTATING_HOOKS = ["context", "before_provider_request", "before_provider_headers"] as const;
const SUPPORTED_APIS = new Set(["anthropic-messages", "openai-responses", "openai-codex-responses", "openai-completions", "azure-openai-responses", "mistral-conversations", "bedrock-converse-stream", "google-generative-ai", "google-vertex", "pi-messages"]);

interface Configuration {
  readonly model: Model;
  readonly options: Options;
  readonly blockImages: boolean;
  readonly extensions: LoadExtensionsResult;
  readonly handlers: readonly (readonly [string, readonly unknown[]])[][];
  readonly providerRegistration: object | undefined;
}

export interface PiSuggestionInputs {
  readonly model: Model;
  readonly context: Context;
  readonly options: Options;
  readonly primaryUsage: OwnedUiPromptSuggestionUsage;
}

type ConfigurationResult = { readonly value: Configuration } | { readonly reason: OwnedUiPromptSuggestionOutcome };

/** Classifies only public metadata; never executes or attempts to interpret an extension handler. */
function configuration(session: AgentSession, services: AgentSessionServices): ConfigurationResult {
  const model = session.model;
  const runtime = services.modelRuntime;
  if (!model || !SUPPORTED_APIS.has(model.api)
    || runtime.getRegisteredNativeProvider(model.provider) !== undefined
    || runtime.getRegisteredProviderConfig(model.provider)?.streamSimple !== undefined) {
    return { reason: "unsupported-provider" };
  }
  let extensions: LoadExtensionsResult;
  try {
    extensions = services.resourceLoader.getExtensions();
    if (!extensions || !Array.isArray(extensions.extensions) || !Array.isArray(extensions.errors)
      || extensions.errors.length > 0 || extensions.extensions.some(extension => !(extension.handlers instanceof Map)
        || [...extension.handlers].some(([name, handlers]) => typeof name !== "string" || !Array.isArray(handlers)
          || handlers.some(handler => typeof handler !== "function")))) {
      return { reason: "unknown-extension-metadata" };
    }
  } catch {
    return { reason: "unknown-extension-metadata" };
  }
  if (extensions.extensions.some(extension => MUTATING_HOOKS.some(hook => (extension.handlers.get(hook)?.length ?? 0) > 0))) {
    return { reason: "unsupported-transformation" };
  }
  const settings = services.settingsManager;
  const retry = settings.getProviderRetrySettings();
  const idle = settings.getHttpIdleTimeoutMs();
  const thinking = session.thinkingLevel;
  const budgets = settings.getThinkingBudgets();
  const websocketConnectTimeoutMs = settings.getWebSocketConnectTimeoutMs();
  // Compatibility: Pi snapshots budgets on its Agent at construction. A later settings edit must not
  // be mistaken for the policy that produced this response.
  if (!isDeepStrictEqual(budgets, session.agent.thinkingBudgets)) return { reason: "configuration-changed" };
  return { value: {
    model: structuredClone(model),
    options: {
      sessionId: session.sessionId,
      transport: session.agent.transport,
      ...(thinking === "off" ? {} : { reasoning: thinking }),
      ...(budgets === undefined ? {} : { thinkingBudgets: structuredClone(budgets) }),
      timeoutMs: retry.timeoutMs ?? (idle === 0 ? 2147483647 : idle),
      ...(websocketConnectTimeoutMs === undefined ? {} : { websocketConnectTimeoutMs }),
      ...(retry.maxRetries === undefined ? {} : { maxRetries: retry.maxRetries }),
      maxRetryDelayMs: session.agent.maxRetryDelayMs ?? retry.maxRetryDelayMs,
    },
    blockImages: settings.getBlockImages(),
    extensions,
    handlers: extensions.extensions.map(extension => [...extension.handlers].map(([name, handlers]) => [name, [...handlers]] as const)),
    providerRegistration: runtime.getRegisteredProviderConfig(model.provider),
  } };
}

function sameConfiguration(left: Configuration, right: Configuration): boolean {
  return left.extensions === right.extensions
    && left.providerRegistration === right.providerRegistration
    && isDeepStrictEqual(left.handlers, right.handlers)
    && left.blockImages === right.blockImages
    && isDeepStrictEqual(left.model, right.model)
    && isDeepStrictEqual(left.options, right.options);
}

/** Pi 0.84.2 SDK image policy, applied to owned converted messages, never to live state. */
export function suggestionMessages(messages: Message[], blockImages: boolean): Context["messages"] {
  const converted = structuredClone(convertToLlm(messages).map(message => message.role === "toolResult" ? {
    role: message.role, toolCallId: message.toolCallId, toolName: message.toolName, content: message.content,
    isError: message.isError, timestamp: message.timestamp,
    ...(message.addedToolNames === undefined ? {} : { addedToolNames: message.addedToolNames }),
  } : message));
  if (!blockImages) return converted;
  return converted.map(message => {
    if ((message.role !== "user" && message.role !== "toolResult") || !Array.isArray(message.content)
      || !message.content.some(block => block.type === "image")) return message;
    const replaced = message.content.map(block => block.type === "image"
      ? { type: "text" as const, text: "Image reading is disabled." } : block);
    return { ...message, content: replaced.filter((block, index) => !(block.type === "text"
      && block.text === "Image reading is disabled." && index > 0
      && replaced[index - 1]?.type === "text" && "text" in replaced[index - 1]!
      && replaced[index - 1]!.text === block.text)) };
  });
}

/** The library normalizes absent counters to zero; only positive counts establish availability. */
export function suggestionUsage(message: unknown): OwnedUiPromptSuggestionUsage {
  const usage = typeof message === "object" && message !== null && "usage" in message ? message.usage : undefined;
  const count = (key: string): number | null => {
    if (typeof usage !== "object" || usage === null || !(key in usage)) return null;
    const value: unknown = (usage as Record<string, unknown>)[key];
    return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
  };
  return { input: count("input"), output: count("output"), cacheRead: count("cacheRead"), cacheWrite: count("cacheWrite") };
}

/** Transfers one conversation copy for dispatch; response/configuration guards last until release. */
export class PiPromptSuggestionContext {
  #run: ConfigurationResult | undefined;
  #inputs: PiSuggestionInputs | undefined;
  #guard: Configuration | undefined;
  #response: WeakRef<Message> | undefined;
  #responseValue: Message | undefined;
  #reason: OwnedUiPromptSuggestionOutcome = "stale";

  start(session: AgentSession, services: AgentSessionServices): void {
    this.clear();
    try { this.#run = configuration(session, services); }
    catch { this.#run = { reason: "unsupported-provider" }; }
  }

  invalidate(reason: OwnedUiPromptSuggestionOutcome = "stale"): void {
    this.#inputs = undefined;
    this.#guard = undefined;
    this.#response = undefined;
    this.#responseValue = undefined;
    this.#reason = reason;
  }

  configurationChanged(): void {
    this.invalidate("configuration-changed");
    this.#run = { reason: "configuration-changed" };
  }

  clear(): void {
    this.invalidate();
    this.#run = undefined;
  }

  capture(session: AgentSession, services: AgentSessionServices, response: unknown): void {
    try { this.#capture(session, services, response); }
    catch { this.invalidate("unsupported-provider"); }
  }

  #capture(session: AgentSession, services: AgentSessionServices, response: unknown): void {
    this.invalidate();
    const current = configuration(session, services);
    if ("reason" in current) { this.#reason = current.reason; return; }
    if (!this.#run || "reason" in this.#run) {
      this.#reason = this.#run && "reason" in this.#run ? this.#run.reason : "stale";
      return;
    }
    if (!sameConfiguration(this.#run.value, current.value)) { this.#reason = "configuration-changed"; return; }
    const messages = session.agent.state.messages;
    const last = messages.at(-1);
    if (last !== response || last?.role !== "assistant" || last.stopReason !== "stop" || last.errorMessage !== undefined
      || last.content.some(block => block.type === "toolCall") || messages.filter(message => message === last).length !== 1) return;
    const tools = session.agent.state.tools.map(tool => ({
      name: tool.name, description: tool.description, parameters: structuredClone(tool.parameters),
      ...(tool.constrainedSampling === undefined ? {} : { constrainedSampling: structuredClone(tool.constrainedSampling) }),
    }));
    this.#guard = current.value;
    this.#response = new WeakRef(last);
    this.#responseValue = structuredClone(last);
    this.#inputs = {
      model: current.value.model,
      context: {
        systemPrompt: session.agent.state.systemPrompt,
        tools,
        messages: [...suggestionMessages(messages, current.value.blockImages),
          { role: "user", content: CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, timestamp: Date.now() }],
      },
      options: { ...current.value.options, ...(current.value.model.api === "openai-codex-responses" ? { transport: "sse" as const } : {}) },
      primaryUsage: suggestionUsage(last),
    };
    this.#reason = "candidate";
  }

  check(session: AgentSession, services: AgentSessionServices): OwnedUiPromptSuggestionOutcome {
    try { return this.#check(session, services); }
    catch { this.invalidate("unsupported-provider"); return "unsupported-provider"; }
  }

  #check(session: AgentSession, services: AgentSessionServices): OwnedUiPromptSuggestionOutcome {
    if (!this.#guard) return this.#reason;
    const current = configuration(session, services);
    if ("reason" in current) { this.invalidate(current.reason); return current.reason; }
    if (!sameConfiguration(this.#guard, current.value)) { this.invalidate("configuration-changed"); return "configuration-changed"; }
    if (session.agent.state.messages.at(-1) !== this.#response?.deref()
      || !isDeepStrictEqual(this.#response?.deref(), this.#responseValue)) { this.invalidate(); return "stale"; }
    return "candidate";
  }

  take(): PiSuggestionInputs | undefined {
    const inputs = this.#inputs;
    this.#inputs = undefined;
    return inputs;
  }
}
