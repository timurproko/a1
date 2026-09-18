import { assertOwnedUiCommand, type OwnedUiCommand, type OwnedUiCommandOutcome, type OwnedUiDiagnostics } from "../../../contracts/owned-ui/index.js";
import type { PiEmittedEvent } from "./event-delivery.js";

export interface AdapterCommandResult {
  readonly outcome: OwnedUiCommandOutcome;
  readonly diagnostic: string | null;
}

/** How many commands and workflows may be admitted together before new work is rejected. */
const MAX_PENDING_WORK = 32;
/** Completed results remembered so a retried correlation id gets its original outcome. */
const MAX_COMPLETED_COMMANDS = 256;

export interface PiCommandDispatchPorts {
  sessionId(): string;
  /** True before the runtime and session exist or after disposal: commands are rejected, not queued. */
  notRunning(): boolean;
  /** True while delivery is overloaded or admission is stopped. */
  admissionStopped(): boolean;
  /** Workflows currently admitted; they share the admission budget with commands. */
  pendingWorkflowCount(): number;
  sessionGeneration(): number;
  beginRunning(): void;
  endRunning(): void;
  /** Carry out one admitted command against the engine; a throw becomes a failed outcome. */
  perform(command: OwnedUiCommand): Promise<void>;
  emit(value: PiEmittedEvent): void;
  emitView(): void;
  diagnostic(severity: OwnedUiDiagnostics["severity"], code: string, message: string, recoverable: boolean): void;
}

/**
 * Admission and settlement of owned UI commands: the accepted/completed/failed/rejected outcome
 * events, the bounded pending set with its out-of-band cancellation slot per command, the active
 * ids the view reports, and the remembered results that make a retried correlation id idempotent.
 * What a command does to the engine is the adapter's `perform` port.
 */
export class PiCommandDispatch {
  readonly #ports: PiCommandDispatchPorts;
  #activeCommandIds: string[] = [];
  readonly #completedCommands = new Map<string, AdapterCommandResult>();
  readonly #pendingCommands = new Map<string, { type: OwnedUiCommand["type"]; cancel(): void }>();

  constructor(ports: PiCommandDispatchPorts) {
    this.#ports = ports;
  }

  get activeCommandIds(): readonly string[] {
    return this.#activeCommandIds;
  }

  get pendingCount(): number {
    return this.#pendingCommands.size;
  }

  isPending(correlationId: string): boolean {
    return this.#pendingCommands.has(correlationId);
  }

  /** Resolve every admitted command as failed, except the listed types. */
  cancelPending(except: readonly OwnedUiCommand["type"][] = []): void {
    for (const pending of this.#pendingCommands.values()) if (!except.includes(pending.type)) pending.cancel();
  }

  /** Forget active ids and remembered results; a new session binding cannot inherit them. */
  reset(): void {
    this.#activeCommandIds = [];
    this.#completedCommands.clear();
  }

  async execute(command: OwnedUiCommand): Promise<AdapterCommandResult> {
    assertOwnedUiCommand(command);
    if (command.sessionId !== this.#ports.sessionId()) {
      return this.#finishCommand(command, "rejected", "command targets a different owned session");
    }
    if (this.#ports.notRunning()) {
      return this.#finishCommand(command, "rejected", "engine adapter is not running");
    }
    // Invariant: the bounded out-of-band cancellation path has one slot per admitted command.
    if (this.#ports.admissionStopped() || this.#pendingCommands.size + this.#ports.pendingWorkflowCount() >= MAX_PENDING_WORK) return { outcome: "rejected", diagnostic: null };
    const existing = this.#completedCommands.get(command.correlationId);
    if (existing) return existing;
    if (this.#activeCommandIds.includes(command.correlationId)) {
      return this.#finishCommand(command, "rejected", "duplicate engine command correlation id");
    }

    this.#activeCommandIds.push(command.correlationId);
    const generation = this.#ports.sessionGeneration();
    let cancelled = false;
    const cancellation = new Promise<AdapterCommandResult>(resolve => {
      this.#pendingCommands.set(command.correlationId, { type: command.type, cancel: () => {
        if (cancelled) return;
        cancelled = true;
        resolve(this.#recordCommand(command, "failed", null));
      } });
    });
    this.#ports.emit({ type: "command-outcome", correlationId: command.correlationId, outcome: "accepted", diagnostic: null });
    const operation = async (): Promise<AdapterCommandResult> => {
      try {
        if (cancelled) return { outcome: "failed", diagnostic: null };
        this.#ports.beginRunning();
        try { await this.#ports.perform(command); } finally { this.#ports.endRunning(); }
        if (cancelled) return { outcome: "failed", diagnostic: null };
        if (generation === this.#ports.sessionGeneration()) this.#ports.emitView();
        if (cancelled) return { outcome: "failed", diagnostic: null };
        return this.#recordCommand(command, "completed", null);
      } catch (error) {
        if (cancelled) return { outcome: "failed", diagnostic: null };
        const diagnostic = error instanceof Error ? error.message : String(error);
        this.#ports.diagnostic("error", "engine-command", diagnostic, true);
        if (generation === this.#ports.sessionGeneration()) this.#ports.emitView();
        return this.#recordCommand(command, "failed", diagnostic);
      }
    };
    try { return await Promise.race([operation(), cancellation]); }
    finally { this.#pendingCommands.delete(command.correlationId); }
  }

  #recordCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    const result = this.#finishCommand(command, outcome, diagnostic);
    this.#completedCommands.set(command.correlationId, result);
    if (this.#completedCommands.size > MAX_COMPLETED_COMMANDS) {
      const oldest = this.#completedCommands.keys().next().value;
      if (oldest) this.#completedCommands.delete(oldest);
    }
    return result;
  }

  #finishCommand(
    command: OwnedUiCommand,
    outcome: OwnedUiCommandOutcome,
    diagnostic: string | null,
  ): AdapterCommandResult {
    this.#activeCommandIds = this.#activeCommandIds.filter(id => id !== command.correlationId);
    this.#ports.emit({
      type: "command-outcome",
      correlationId: command.correlationId,
      outcome,
      diagnostic,
    });
    return { outcome, diagnostic };
  }
}
