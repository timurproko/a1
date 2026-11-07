import { isRecord, stringValue } from "./message-values.js";
import type { AgentSession, AgentSessionRuntime } from "../startup-public.js";
import {
  CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION,
  assertOwnedUiPromptSuggestionRequest,
  assertOwnedUiPromptSuggestionResult,
  normalizePromptSuggestionCandidate,
  type OwnedUiModelInfo,
  type OwnedUiPromptSuggestionGeneratorPort,
  type OwnedUiPromptSuggestionReasoning,
  type OwnedUiPromptSuggestionRequest,
  type OwnedUiPromptSuggestionResult,
} from "../../../contracts/owned-ui/index.js";

/** The run position a suggestion request must still match to be answered. */
export interface PiPromptSuggestionIdentity {
  readonly sessionId: string;
  readonly sessionGeneration: number;
  readonly runSequence: number;
  readonly responseSequence: number;
}

export interface PiPromptSuggestionPorts {
  session(): AgentSession | undefined;
  runtime(): AgentSessionRuntime | undefined;
  activeModel(): OwnedUiModelInfo | null;
  /** The adapter's current position; a request for an earlier position is answered "unavailable". */
  identity(): PiPromptSuggestionIdentity;
  /** True while the adapter cannot serve: disposed, overloaded, or admission stopped. */
  unavailable(): boolean;
}

/**
 * Contextual prompt suggestions generated against the bound session's own conversation prefix
 * through pinned Pi's model runtime, so the provider serves the suggestion from the run's prompt
 * cache. The adapter supplies the session, runtime, model, and run position through ports and
 * remains the port the owned UI calls.
 */
export class PiPromptSuggestions implements OwnedUiPromptSuggestionGeneratorPort {
  readonly #ports: PiPromptSuggestionPorts;

  constructor(ports: PiPromptSuggestionPorts) {
    this.#ports = ports;
  }

  reasoningPolicy(): OwnedUiPromptSuggestionReasoning {
    const session = this.#ports.session();
    if (!session?.model) return "unavailable";
    if (!session.model.reasoning) return "ordinary";
    // Performance: the run's own level keeps the provider's thinking parameters, and the cached prefix, identical.
    return readSuggestionReasoning(session.thinkingLevel);
  }

  async generate(request: OwnedUiPromptSuggestionRequest): Promise<OwnedUiPromptSuggestionResult> {
    assertOwnedUiPromptSuggestionRequest(request);
    const identity = request.identity;
    const session = this.#ports.session();
    const runtime = this.#ports.runtime();
    const activeModel = this.#ports.activeModel();
    const current = this.#ports.identity();
    if (this.#ports.unavailable() || session === undefined || runtime === undefined || request.signal.aborted
      || identity.sessionId !== current.sessionId
      || identity.sessionGeneration !== current.sessionGeneration
      || identity.runSequence !== current.runSequence
      || identity.responseSequence !== current.responseSequence
      || activeModel === null
      || identity.model.providerId !== activeModel.providerId
      || identity.model.modelId !== activeModel.modelId) {
      return { identity, outcome: request.signal.aborted ? "cancelled" : "unavailable", text: null };
    }

    const model = session.model;
    const agent = session.agent;
    const agentState = agent.state;
    const policy = this.reasoningPolicy();
    if (model === undefined || policy === "unavailable" || typeof runtime.services.modelRuntime.completeSimple !== "function") {
      return { identity, outcome: "unavailable", text: null };
    }
    // Performance: mirror the primary loop's request shape so the provider serves the conversation prefix
    // from the run's prompt cache. `onResponse` stays out: extensions must not see a suggestion as a response.
    const reasoning = policy === "ordinary" || policy === "off" ? undefined : policy;
    let response: unknown;
    try {
      const transformed = typeof agent.transformContext === "function"
        ? await agent.transformContext(agentState.messages, request.signal)
        : agentState.messages;
      const messages = typeof agent.convertToLlm === "function"
        ? await agent.convertToLlm(transformed)
        : transformed.filter(message => message.role === "user" || message.role === "assistant" || message.role === "toolResult");
      response = await runtime.services.modelRuntime.completeSimple(model, {
        systemPrompt: agentState.systemPrompt,
        messages: [
          ...messages,
          { role: "user", content: CONTEXTUAL_PROMPT_SUGGESTION_INSTRUCTION, timestamp: Date.now() },
        ],
        tools: agentState.tools,
      }, {
        signal: request.signal,
        ...(reasoning === undefined ? {} : { reasoning }),
        ...(agent.sessionId === undefined ? {} : { sessionId: agent.sessionId }),
        ...(agent.thinkingBudgets === undefined ? {} : { thinkingBudgets: agent.thinkingBudgets }),
        ...(agent.transport === undefined ? {} : { transport: agent.transport }),
        ...(agent.onPayload === undefined ? {} : { onPayload: agent.onPayload }),
      });
    } catch {
      return { identity, outcome: request.signal.aborted ? "cancelled" : "provider-failure", text: null };
    }
    if (request.signal.aborted || (isRecord(response) && response.stopReason === "aborted")) {
      return { identity, outcome: "cancelled", text: null };
    }
    if (!isRecord(response) || stringValue(response.errorMessage) !== undefined || response.stopReason === "error") {
      return { identity, outcome: "provider-failure", text: null };
    }
    const content = Array.isArray(response.content) ? response.content : [];
    if (response.stopReason === "length" || content.some(block => isRecord(block) && block.type === "toolCall")) {
      return { identity, outcome: "rejected", text: null };
    }
    // Security: validate all text, not just the first block of a multi-part response.
    const rawText = content.filter(block => isRecord(block) && block.type === "text")
      .map(block => stringValue(block.text) ?? "").join("\n");
    const text = normalizePromptSuggestionCandidate(rawText);
    const result: OwnedUiPromptSuggestionResult = text === null
      ? { identity, outcome: rawText.trim() ? "rejected" : "empty", text: null }
      : { identity, outcome: "candidate", text };
    assertOwnedUiPromptSuggestionResult(result);
    return result;
  }
}

function readSuggestionReasoning(value: unknown): OwnedUiPromptSuggestionReasoning {
  return value === "minimal" || value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max"
    ? value
    : "off";
}
