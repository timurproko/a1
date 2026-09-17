import type { AgentSession, AgentSessionEvent, PromptOptions } from "../startup-public.js";
import {
  AGENT_ENGINE_CONTRACT_VERSION,
  type AgentCommandOutcome,
  type AgentEvent,
  type AgentMessage,
} from "../../../contracts/agent-engine/index.js";

type PiPromptImages = NonNullable<PromptOptions["images"]>;

export interface PiDocumentedSessionCommands {
  readonly isStreaming: AgentSession["isStreaming"];
  readonly isRetrying: AgentSession["isRetrying"];
  readonly isCompacting: AgentSession["isCompacting"];
  prompt(text: string, options?: Parameters<AgentSession["prompt"]>[1]): Promise<void>;
  steer(text: string, images?: PiPromptImages): Promise<void>;
  followUp(text: string, images?: PiPromptImages): Promise<void>;
  abort(): Promise<void>;
  abortRetry(): void;
  abortCompaction(): void;
  compact(customInstructions?: Parameters<AgentSession["compact"]>[0]): Promise<unknown>;
  clearQueue(): { readonly steering: readonly string[]; readonly followUp: readonly string[] };
  executeBash?(command: string, onChunk: unknown, options: { readonly excludeFromContext: boolean }): Promise<unknown>;
  /** Optional: extension commands cannot be queued, so they run immediately during compaction as in pinned Pi. */
  readonly extensionRunner?: { getCommand(name: string): unknown } | undefined;
}

export type PiSessionCommand =
  | {
    readonly type: "prompt" | "steer" | "follow-up";
    readonly text: string;
    readonly images?: PiPromptImages;
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
  // Rationale: Pi's queue restore returns text only, so the attachments of messages queued
  // during compaction are kept here until the queue is delivered or cleared.
  #queuedImages: Array<{ readonly text: string; readonly images: PiPromptImages }> = [];
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
      case "follow-up": {
        this.#lastPrompt = command.text;
        const mode = command.type === "steer" ? "steer" : "followUp";
        if (this.session.isCompacting && !this.#isExtensionCommand(command.text)) {
          // Compatibility: match interactive Pi: prompt() refuses input during manual compaction,
          // while the engine queue accepts it at any time and delivers it when compaction ends.
          await this.#queue(mode, command.text, command.images);
          return { outcome: "completed" };
        }
        // Compatibility: match interactive Pi: prompt() owns template/extension expansion and
        // turns the accepted steering message into the visible user row while
        // later messages remain in the pending queue.
        await this.session.prompt(command.text, {
          streamingBehavior: mode,
          ...(command.images === undefined ? {} : { images: [...command.images] }),
        });
        return { outcome: "completed" };
      }
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

  /**
   * Delivers the messages queued during a manual compaction. The session is idle when a manual
   * compaction ends, so nothing would consume the queue: the first message starts one run
   * through the ordinary prompt path with its mode, and the rest are re-queued for that run,
   * whose initial poll injects them in order. Automatic compaction needs no delivery: its
   * continuing run or pending prompt consumes the queue itself. The run is not awaited; when
   * the start is refused before the message is accepted, the queue is restored and the error
   * reported through `onFailure`.
   */
  async deliverQueuedAfterCompaction(onFailure: (error: unknown) => void): Promise<void> {
    if (this.session.isStreaming || this.session.isCompacting) return;
    const { steering, followUp } = this.session.clearQueue();
    const queued = [
      ...steering.map(text => ({ mode: "steer" as const, text, images: this.#takeImages(text) })),
      ...followUp.map(text => ({ mode: "followUp" as const, text, images: this.#takeImages(text) })),
    ];
    this.#queuedImages = [];
    const [first, ...rest] = queued;
    if (first === undefined) return;
    this.#lastPrompt = first.text;
    let accepted = false;
    const started = this.session.prompt(first.text, {
      streamingBehavior: first.mode,
      preflightResult: success => { accepted = success; },
      ...(first.images === undefined ? {} : { images: [...first.images] }),
    });
    for (const item of rest) await this.#queue(item.mode, item.text, item.images);
    started.catch(async error => {
      // Security: a run that reached the provider is never resent; only a refused start restores.
      try {
        if (!accepted) await this.#restoreQueue(queued);
      } finally {
        onFailure(error);
      }
    }).catch(() => undefined);
  }

  /** Forgets the attachments kept for queued messages; the queue itself was cleared by the caller. */
  forgetQueuedImages(): void {
    this.#queuedImages = [];
  }

  // Rationale: the rest were re-queued before the refused start surfaced, so the queue is rebuilt
  // in the original order; anything queued in between keeps its place after it.
  async #restoreQueue(queued: ReadonlyArray<{ mode: "steer" | "followUp"; text: string; images: PiPromptImages | undefined }>): Promise<void> {
    const { steering, followUp } = this.session.clearQueue();
    const restored = new Set(queued.map(item => item.text));
    const extra = [
      ...steering.filter(text => !restored.has(text)).map(text => ({ mode: "steer" as const, text, images: this.#takeImages(text) })),
      ...followUp.filter(text => !restored.has(text)).map(text => ({ mode: "followUp" as const, text, images: this.#takeImages(text) })),
    ];
    this.#queuedImages = [];
    for (const item of [...queued, ...extra]) await this.#queue(item.mode, item.text, item.images);
  }

  async #queue(mode: "steer" | "followUp", text: string, images: PiPromptImages | undefined): Promise<void> {
    if (images !== undefined && images.length > 0) this.#queuedImages.push({ text, images: [...images] });
    if (mode === "steer") await this.session.steer(text, images === undefined ? undefined : [...images]);
    else await this.session.followUp(text, images === undefined ? undefined : [...images]);
  }

  #takeImages(text: string): PiPromptImages | undefined {
    const index = this.#queuedImages.findIndex(item => item.text === text);
    if (index === -1) return undefined;
    const [item] = this.#queuedImages.splice(index, 1);
    return item?.images;
  }

  #isExtensionCommand(text: string): boolean {
    if (!text.startsWith("/")) return false;
    const spaceIndex = text.indexOf(" ");
    const name = spaceIndex === -1 ? text.slice(1) : text.slice(1, spaceIndex);
    return this.session.extensionRunner?.getCommand(name) !== undefined;
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
