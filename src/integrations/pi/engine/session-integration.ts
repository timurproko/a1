import type { AgentSession, AgentSessionEvent, PromptOptions } from "@earendil-works/pi-coding-agent";
import {
  AGENT_ENGINE_CONTRACT_VERSION,
  type AgentCommandOutcome,
  type AgentEvent,
  type AgentMessage,
} from "../../../contracts/agent-engine/index.js";

export interface PiDocumentedSessionCommands {
  readonly isStreaming: AgentSession["isStreaming"];
  readonly isRetrying: AgentSession["isRetrying"];
  readonly isCompacting: AgentSession["isCompacting"];
  prompt(text: string, options?: Parameters<AgentSession["prompt"]>[1]): Promise<void>;
  steer(text: string): Promise<void>;
  followUp(text: string): Promise<void>;
  abort(): Promise<void>;
  abortRetry(): void;
  abortCompaction(): void;
  compact(customInstructions?: Parameters<AgentSession["compact"]>[0]): Promise<unknown>;
  executeBash?(command: string, onChunk: unknown, options: { readonly excludeFromContext: boolean }): Promise<unknown>;
}

export type PiSessionCommand =
  | {
    readonly type: "prompt" | "steer" | "follow-up";
    readonly text: string;
    readonly images?: NonNullable<PromptOptions["images"]>;
  }
  | { readonly type: "abort" | "retry" | "compact" }
  | { readonly type: "bash"; readonly command: string; readonly excludeFromContext: boolean; readonly onChunk?: (chunk: string) => void };

export interface PiSessionCommandResult {
  readonly outcome: AgentCommandOutcome;
  readonly value?: unknown;
}

/** Routes neutral session commands to Pi while preserving Pi streaming and retry semantics. */
export class PiSessionCommandIntegration {
  #lastPrompt: string | null = null;
  constructor(private readonly session: PiDocumentedSessionCommands) {}

  async execute(command: PiSessionCommand): Promise<PiSessionCommandResult> {
    switch (command.type) {
      case "prompt":
        this.#lastPrompt = command.text;
        await this.session.prompt(command.text, command.images === undefined
          ? this.session.isStreaming ? { streamingBehavior: "followUp" } : undefined
          : {
              ...(this.session.isStreaming ? { streamingBehavior: "followUp" as const } : {}),
              images: [...command.images],
            });
        return { outcome: "completed" };
      case "steer":
        this.#lastPrompt = command.text;
        // Compatibility: match interactive Pi: prompt() owns template/extension expansion and
        // turns the accepted steering message into the visible user row while
        // later messages remain in the pending queue.
        await this.session.prompt(command.text, {
          streamingBehavior: "steer",
          ...(command.images === undefined ? {} : { images: [...command.images] }),
        });
        return { outcome: "completed" };
      case "follow-up":
        this.#lastPrompt = command.text;
        await this.session.prompt(command.text, {
          streamingBehavior: "followUp",
          ...(command.images === undefined ? {} : { images: [...command.images] }),
        });
        return { outcome: "completed" };
      case "abort":
        if (this.session.isRetrying) this.session.abortRetry();
        if (this.session.isCompacting) this.session.abortCompaction();
        await this.session.abort();
        return { outcome: "cancelled" };
      case "retry":
        if (this.#lastPrompt === null) return { outcome: "rejected" };
        await this.session.prompt(this.#lastPrompt, this.session.isStreaming ? { streamingBehavior: "followUp" } : undefined);
        return { outcome: "completed" };
      case "compact":
        return { outcome: "completed", value: await this.session.compact() };
      case "bash": {
        if (!this.session.executeBash) return { outcome: "rejected" };
        const value = await this.session.executeBash(command.command, command.onChunk, { excludeFromContext: command.excludeFromContext });
        if (!value || typeof value !== "object") throw new TypeError("Pi bash result is malformed");
        const result = value as { readonly cancelled?: unknown; readonly exitCode?: unknown };
        if (typeof result.cancelled !== "boolean" || (result.exitCode !== undefined && typeof result.exitCode !== "number")) throw new TypeError("Pi bash result is malformed");
        return { outcome: result.cancelled ? "cancelled" : result.exitCode === 0 ? "completed" : "failed", value };
      }
    }
  }
}

export interface PiOrderedEventIntegration {
  dispose(): void;
}

export function subscribeToPiSessionEvents(
  session: Pick<AgentSession, "subscribe">,
  sessionId: string,
  emit: (event: AgentEvent) => void,
  malformed: (diagnostic: string) => void,
): PiOrderedEventIntegration {
  let sequence = 0;
  let disposed = false;
  const unsubscribe = session.subscribe(event => {
    if (disposed) return;
    sequence += 1;
    try {
      const converted = convertPiSessionEvent(event, sessionId, sequence);
      if (converted) emit(converted);
    } catch (error) {
      malformed(`Pi session event ${sequence} is malformed: ${error instanceof Error ? error.message : String(error)}`);
    }
  });
  return { dispose() { if (disposed) return; disposed = true; unsubscribe(); } };
}

export function convertPiSessionEvent(event: AgentSessionEvent, sessionId: string, sequence: number): AgentEvent | null {
  const base = { contractVersion: AGENT_ENGINE_CONTRACT_VERSION, sessionId, sequence } as const;
  switch (event.type) {
    case "agent_start": return { ...base, type: "lifecycle", lifecycle: "busy", reason: null };
    case "agent_settled": return { ...base, type: "lifecycle", lifecycle: "ready", reason: null };
    case "agent_end": return event.willRetry ? null : { ...base, type: "lifecycle", lifecycle: "ready", reason: null };
    case "message_start":
    case "message_update":
    case "message_end":
      return { ...base, type: "content", content: toAgentMessage(event.message, event.type === "message_end" ? "final" : "streaming", sequence) };
    default: return null;
  }
}

function toAgentMessage(value: unknown, status: "streaming" | "final", sequence: number): AgentMessage {
  if (!value || typeof value !== "object") throw new TypeError("message payload is not an object");
  const message = value as Record<string, unknown>;
  const role = message.role === "user" || message.role === "assistant" || message.role === "tool" || message.role === "system" ? message.role : "assistant";
  const source = Array.isArray(message.content) ? message.content : [];
  const text = source.flatMap(part => part && typeof part === "object" && typeof (part as Record<string, unknown>).text === "string" ? [(part as Record<string, unknown>).text as string] : []).join("");
  return {
    id: typeof message.id === "string" ? message.id : `message-${sequence}`,
    role,
    status,
    content: text.length > 0
      ? [{ kind: "text", text }]
      : [{ kind: "unknown", sourceType: "pi-message", payload: { role: String(message.role ?? "unknown") } }],
  };
}
