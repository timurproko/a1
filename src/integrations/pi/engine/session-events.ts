import { isRecord, readStringArray, readThinkingLevel, stringValue, textFromContent } from "./message-values.js";
import { transcriptToolState, type OwnedUiModelInfo, type OwnedUiThinkingLevel, type OwnedUiTranscriptBlock } from "../../../contracts/owned-ui/index.js";
import type { PiEmittedEvent } from "./event-delivery.js";
import type { PiTranscriptProjection } from "./transcript-projection.js";

export interface PiSessionEventPorts {
  sessionGeneration(): number;
  /** The session-authoritative messages, read at settlement. */
  sessionMessages(): readonly unknown[];
  activeModel(): OwnedUiModelInfo | null;
  /** Replace the projected transcript behind the delivery seal. */
  replaceTranscript(blocks: OwnedUiTranscriptBlock[]): void;
  emit(value: PiEmittedEvent): void;
  emitView(): void;
  /** The session became busy with the named work; the adapter publishes lifecycle and status. */
  enterWork(message: string): void;
  /** Every work state ended; the adapter publishes the ready lifecycle and a cleared status. */
  leaveWork(): void;
  /** Compaction progress for the status view, in whole percent. */
  workProgress(percent: number): void;
  /** The engine's queued steering and follow-up submissions changed. */
  queueChanged(queuedSubmissions: readonly string[]): void;
  thinkingLevelChanged(level: OwnedUiThinkingLevel): void;
  /** Usage moved at a message or lifecycle boundary; the memoized usage view is stale. */
  usageInvalidated(): void;
  compactionStarted(): void;
  compactionEnded(): void;
  deliverQueuedAfterCompaction(): void;
}

/**
 * Translates pinned Pi's session events into transcript projection updates, run and response
 * sequencing, work-state transitions, and the semantic owned UI events (run started, message
 * completed, run settled). It owns the run counters and the current work-state kind; the adapter
 * owns the lifecycle, status, editor, and model state the ports write.
 */
export class PiSessionEvents {
  readonly #projection: PiTranscriptProjection;
  readonly #ports: PiSessionEventPorts;
  #agentRunActive = false;
  #agentRunSequence = 0;
  #assistantResponseSequence = 0;
  #statusKind: "working" | "retry" | "compaction" | null = null;

  constructor(projection: PiTranscriptProjection, ports: PiSessionEventPorts) {
    this.#projection = projection;
    this.#ports = ports;
  }

  /** Increments at each agent start within the bound session. */
  get runSequence(): number {
    return this.#agentRunSequence;
  }

  /** Increments at each completed assistant message within the bound session. */
  get responseSequence(): number {
    return this.#assistantResponseSequence;
  }

  /** A new session was bound: no run is active and the counters restart. */
  reset(): void {
    this.#agentRunActive = false;
    this.#agentRunSequence = 0;
    this.#assistantResponseSequence = 0;
    this.#statusKind = null;
  }

  /** The run was abandoned by overload recovery; the counters keep their values so stale suggestions stay stale. */
  abandonRun(): void {
    this.#agentRunActive = false;
    this.#statusKind = null;
  }

  // Invariant: the named work state is the only state a matching end may clear.
  #enterWorkState(kind: "working" | "retry" | "compaction", message: string): void {
    this.#statusKind = kind;
    this.#ports.enterWork(message);
  }

  // Invariant: ending retry or compaction cannot clear a different active work state.
  #endWorkState(kind: "retry" | "compaction"): void {
    if (this.#statusKind !== kind) return;
    if (this.#agentRunActive) {
      this.#enterWorkState("working", "Working");
      return;
    }
    this.#leaveWorkStates();
  }

  #leaveWorkStates(): void {
    this.#statusKind = null;
    this.#ports.leaveWork();
  }

  // Invariant: progress belongs to the compaction state only and is published when the integer changes.
  compactionProgress(percent: number): void {
    if (this.#statusKind !== "compaction") return;
    this.#ports.workProgress(percent);
  }

  /** Apply one pinned Pi session event; image assets no block references any more are released afterwards. */
  handle(event: unknown): void {
    try { this.#applyPiEvent(event); }
    finally { this.#projection.assets.discardUnowned(); }
  }

  #applyPiEvent(event: unknown): void {
    if (!isRecord(event) || typeof event.type !== "string") return;
    // Invariant: usage moves at message and lifecycle boundaries, not with stream chunks, so the
    // two streaming event kinds keep the memo and everything else drops it.
    if (event.type !== "message_update" && event.type !== "tool_execution_update") this.#ports.usageInvalidated();
    switch (event.type) {
      case "agent_start":
        this.#agentRunActive = true;
        this.#agentRunSequence += 1;
        this.#ports.emit({ type: "agent-run-started" });
        this.#enterWorkState("working", "Working");
        return;
      case "message_start":
        this.#projection.upsertMessage(event.message, "live");
        return;
      case "message_update": {
        const delta = isRecord(event.assistantMessageEvent) && typeof event.assistantMessageEvent.delta === "string"
          ? event.assistantMessageEvent.delta
          : undefined;
        // Invariant: the delta is folded in before the block is stored, so a chunk is one update to
        // one block rather than a store without the delta followed by a store with it.
        const blocks = this.#projection.messageBlocks(event.message, "live", this.#projection.blocks.length);
        for (const [index, block] of blocks.entries()) {
          this.#projection.upsert(index === 0 && delta !== undefined && !block.text.endsWith(delta)
            ? { ...block, text: `${block.text}${delta}` }
            : block);
        }
        return;
      }
      case "message_end":
        this.#projection.upsertMessage(event.message, "finalized");
        this.#projection.settleFailedDeclarations(event.message);
        // Compatibility: preserve the same semantic boundary v2 counted. Transcript block
        // finalization is intentionally not a substitute: rebuilds, retries,
        // thinking parts, and tool rows can all finalize independently.
        if (isRecord(event.message) && event.message.role === "assistant") {
          this.#assistantResponseSequence += 1;
          const content = Array.isArray(event.message.content) ? event.message.content : [];
          const stopReason = stringValue(event.message.stopReason) ?? null;
          const toolContinuation = stopReason === "toolUse"
            || content.some(item => isRecord(item) && item.type === "toolCall");
          const successful = stringValue(event.message.errorMessage) === undefined
            && stopReason !== "error"
            && stopReason !== "aborted"
            && textFromContent(content).trim().length > 0;
          this.#ports.emit({
            type: "assistant-message-completed",
            sessionGeneration: this.#ports.sessionGeneration(),
            runSequence: this.#agentRunSequence,
            responseSequence: this.#assistantResponseSequence,
            model: this.#ports.activeModel(),
            assistantMessageCount: this.#projection.blocks.filter(block => block.kind === "assistant").length,
            successful,
            stopReason,
            toolContinuation,
          });
        }
        return;
      case "turn_end":
        this.#projection.upsertMessage(event.message, "finalized");
        if (Array.isArray(event.toolResults)) {
          for (const result of event.toolResults) this.#projection.upsertMessage(result, "finalized");
        }
        return;
      case "tool_execution_start":
      case "tool_execution_end": {
        this.#projection.upsertToolExecution(event);
        return;
      }
      case "tool_execution_update":
        this.#projection.upsertToolExecution(event);
        return;
      case "agent_settled":
      case "agent_end": {
        if (event.type === "agent_end" && event.willRetry === true) return;
        // Protocol: agent_end is run-local; only settlement reads the complete session scope.
        const finalMessages = event.type === "agent_settled"
          ? this.#ports.sessionMessages()
          : Array.isArray(event.messages) ? event.messages : [];
        if (event.type === "agent_end") this.#projection.mergeRun(finalMessages, this.#ports.sessionMessages());
        else if (finalMessages.length > 0) this.#ports.replaceTranscript(this.#projection.rebuild(finalMessages, "finalized"));
        // Invariant: missing final messages must not erase accumulated content or invent tool outcomes.
        if (finalMessages.length === 0) this.#ports.replaceTranscript(this.#projection.blocks.map(block =>
          block.status === "live" && transcriptToolState(block) === undefined
            ? { ...block, status: "finalized", revision: block.revision + 1 } : block));
        // Compatibility: ending a turn leaves the working state, as the recorded pinned baseline does, but
        // it leaves only that state: a compaction or retry being shown outlives the turn
        // that ended under it. Settlement ends the run, and with it every state — the
        // engine ends a turn for each continuation it makes and settles once.
        if (event.type === "agent_settled") {
          this.#agentRunActive = false;
          this.#leaveWorkStates();
        } else if (this.#statusKind === null || this.#statusKind === "working") {
          this.#leaveWorkStates();
        }
        this.#ports.emitView();
        if (event.type === "agent_settled") {
          const assistants = finalMessages.filter(message => isRecord(message) && message.role === "assistant");
          const lastAssistant = assistants.at(-1);
          const successful = lastAssistant !== undefined
            && stringValue(lastAssistant.errorMessage) === undefined
            && stringValue(lastAssistant.stopReason) !== "error"
            && stringValue(lastAssistant.stopReason) !== "aborted";
          this.#ports.emit({
            type: "agent-run-settled",
            sessionGeneration: this.#ports.sessionGeneration(),
            runSequence: this.#agentRunSequence,
            responseSequence: this.#assistantResponseSequence,
            model: this.#ports.activeModel(),
            assistantMessageCount: assistants.length,
            successful,
          });
        }
        return;
      }
      case "queue_update": {
        this.#ports.queueChanged([...readStringArray(event.steering), ...readStringArray(event.followUp)]);
        return;
      }
      case "auto_retry_start":
        this.#enterWorkState("retry", "Retrying");
        return;
      case "auto_retry_end":
        this.#endWorkState("retry");
        return;
      case "compaction_start":
        this.#enterWorkState("compaction", "Compacting");
        this.#ports.compactionStarted();
        return;
      case "compaction_end":
        this.#ports.compactionEnded();
        this.#endWorkState("compaction");
        if (event.reason === "manual") this.#ports.deliverQueuedAfterCompaction();
        return;
      case "thinking_level_changed":
        this.#ports.thinkingLevelChanged(readThinkingLevel(event.level));
        return;
      default:
        return;
    }
  }
}
