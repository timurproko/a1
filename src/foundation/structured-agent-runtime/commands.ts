import {
  assertStructuredCapability,
  assertWorkspaceCommand,
  type StructuredCapabilityContract,
  type WorkspaceCommand,
} from "../../contracts/workspace/index.js";

export type StructuredCommandRequest = Extract<WorkspaceCommand, { readonly type: "structured-command" }>;
export type StructuredCancelRequest = Extract<WorkspaceCommand, { readonly type: "cancel-structured-command" }>;
export type StructuredCommandTerminalOutcome = "completed" | "failed" | "timed-out" | "cancelled";

export interface StructuredCommandRecord {
  readonly agentId: string;
  readonly correlationId: string;
  readonly command: string;
  readonly payload: unknown;
  readonly startedAt: number;
  readonly terminalAt: number | null;
  readonly outcome: "active" | StructuredCommandTerminalOutcome;
  readonly revision: number;
}

export type StructuredCommandStartResult =
  | { readonly kind: "accepted"; readonly record: StructuredCommandRecord; readonly activeCount: number }
  | { readonly kind: "outcome"; readonly record: StructuredCommandRecord; readonly idempotent: true }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

export type StructuredCommandOutcomeResult =
  | { readonly kind: "outcome"; readonly record: StructuredCommandRecord; readonly idempotent: boolean }
  | { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string };

interface MutableCommandRecord {
  agentId: string;
  correlationId: string;
  command: string;
  payload: unknown;
  startedAt: number;
  terminalAt: number | null;
  outcome: "active" | StructuredCommandTerminalOutcome;
  revision: number;
}

export class StructuredCommandTracker {
  readonly #capability: StructuredCapabilityContract;
  readonly #commandTimeoutMs: number;
  readonly #records = new Map<string, MutableCommandRecord>();
  readonly #terminalOrder: string[] = [];

  constructor(
    readonly agentId: string,
    capability: StructuredCapabilityContract,
    commandTimeoutMs = 30_000,
  ) {
    assertStructuredCapability(capability);
    if (!agentId || agentId.includes("\0")) throw new TypeError("structured command agent id is invalid");
    if (!Number.isSafeInteger(commandTimeoutMs) || commandTimeoutMs <= 0) throw new RangeError("structured command timeout must be positive");
    this.#capability = capability;
    this.#commandTimeoutMs = commandTimeoutMs;
  }

  start(command: StructuredCommandRequest, startedAt = 0): StructuredCommandStartResult {
    try {
      assertWorkspaceCommand(command);
    } catch (error) {
      return rejected("malformed-command", error);
    }
    if (command.agentId !== this.agentId) return rejected("agent-mismatch", new Error("structured command agent does not match the tracker identity"));
    if (!this.#capability.commands.includes(command.command)) {
      return rejected("unsupported-command", new Error(`structured command is not negotiated: ${command.command}`));
    }
    if (payloadBytes(command.payload) > this.#capability.flow.maxEventBytes) {
      return rejected("command-too-large", new Error(`structured command exceeds the negotiated ${this.#capability.flow.maxEventBytes} byte payload limit`));
    }
    try {
      assertTime(startedAt, "command start time");
    } catch (error) {
      return rejected("invalid-time", error);
    }

    const existing = this.#records.get(command.correlationId);
    if (existing) {
      if (existing.outcome !== "active" && existing.command === command.command && stableJson(existing.payload) === stableJson(command.payload)) {
        return { kind: "outcome", record: freezeRecord(existing), idempotent: true };
      }
      return rejected(existing.outcome === "active" ? "duplicate-correlation" : "correlation-conflict", new Error(`structured correlation id is already in use: ${command.correlationId}`));
    }
    if (this.activeCount() >= this.#capability.flow.maxConcurrentCommands) {
      return rejected("concurrency-limit", new Error(`structured command concurrency exceeds the negotiated ${this.#capability.flow.maxConcurrentCommands} command limit`));
    }

    const record: MutableCommandRecord = {
      agentId: command.agentId,
      correlationId: command.correlationId,
      command: command.command,
      payload: command.payload,
      startedAt,
      terminalAt: null,
      outcome: "active",
      revision: 1,
    };
    this.#records.set(record.correlationId, record);
    return { kind: "accepted", record: freezeRecord(record), activeCount: this.activeCount() };
  }

  complete(correlationId: string, outcome: "completed" | "failed", completedAt = 0): StructuredCommandOutcomeResult {
    if (outcome !== "completed" && outcome !== "failed") return rejected("malformed-outcome", new Error("structured completion outcome is invalid"));
    try {
      assertTime(completedAt, "command completion time");
    } catch (error) {
      return rejected("invalid-time", error);
    }
    const record = this.#records.get(correlationId);
    if (!record) return rejected("unknown-correlation", new Error(`structured correlation id is unknown: ${correlationId}`));
    return this.#settle(record, outcome, completedAt);
  }

  cancel(request: StructuredCancelRequest, cancelledAt = 0): StructuredCommandOutcomeResult {
    try {
      assertWorkspaceCommand(request);
    } catch (error) {
      return rejected("malformed-cancellation", error);
    }
    if (request.agentId !== this.agentId) return rejected("agent-mismatch", new Error("structured cancellation agent does not match the tracker identity"));
    if (this.#capability.cancellation !== "correlated") return rejected("cancellation-unsupported", new Error("the negotiated adapter capability does not support correlated cancellation"));
    try {
      assertTime(cancelledAt, "command cancellation time");
    } catch (error) {
      return rejected("invalid-time", error);
    }
    const record = this.#records.get(request.targetCorrelationId);
    if (!record) return rejected("unknown-correlation", new Error(`structured correlation id is unknown: ${request.targetCorrelationId}`));
    return this.#settle(record, "cancelled", cancelledAt);
  }

  expire(now: number): readonly StructuredCommandRecord[] {
    assertTime(now, "command timeout clock");
    const expired: StructuredCommandRecord[] = [];
    for (const record of this.#records.values()) {
      if (record.outcome === "active" && now - record.startedAt >= this.#commandTimeoutMs) {
        const result = this.#settle(record, "timed-out", record.startedAt + this.#commandTimeoutMs);
        if (result.kind === "outcome") expired.push(result.record);
      }
    }
    return Object.freeze(expired);
  }

  outcomeFor(correlationId: string): StructuredCommandRecord | null {
    const record = this.#records.get(correlationId);
    return record ? freezeRecord(record) : null;
  }

  activeCount(): number {
    let count = 0;
    for (const record of this.#records.values()) if (record.outcome === "active") count += 1;
    return count;
  }

  terminalCount(): number {
    return this.#terminalOrder.length;
  }

  #settle(record: MutableCommandRecord, outcome: StructuredCommandTerminalOutcome, at: number): StructuredCommandOutcomeResult {
    if (record.outcome !== "active") return { kind: "outcome", record: freezeRecord(record), idempotent: true };
    if (at < record.startedAt) return rejected("invalid-time", new Error("structured command outcome cannot precede its start"));
    record.outcome = outcome;
    record.terminalAt = at;
    record.revision += 1;
    this.#terminalOrder.push(record.correlationId);
    this.#boundTerminalOutcomes();
    return { kind: "outcome", record: freezeRecord(record), idempotent: false };
  }

  #boundTerminalOutcomes(): void {
    const retention = this.#capability.flow.maxQueuedEvents;
    while (this.#terminalOrder.length > retention) {
      const oldest = this.#terminalOrder.shift();
      if (oldest === undefined) return;
      this.#records.delete(oldest);
    }
  }
}

function rejected(code: string, error: unknown): { readonly kind: "rejected"; readonly code: string; readonly diagnostic: string } {
  return { kind: "rejected", code, diagnostic: error instanceof Error ? error.message : String(error) };
}

function freezeRecord(record: MutableCommandRecord): StructuredCommandRecord {
  return Object.freeze({ ...record });
}

function assertTime(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${name} must be a non-negative safe integer`);
}

function payloadBytes(payload: unknown): number {
  return new TextEncoder().encode(stableJson(payload)).byteLength;
}

function stableJson(value: unknown): string {
  const encoded = JSON.stringify(value);
  if (encoded === undefined) throw new TypeError("structured payload must be JSON serializable");
  return encoded;
}
