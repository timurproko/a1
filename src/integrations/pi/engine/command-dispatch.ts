import { assertOwnedUiCommand, type OwnedUiCommand, type OwnedUiCommandOutcome, type OwnedUiCommandResult, type OwnedUiDiagnostics } from "../../../contracts/owned-ui/index.js";
import type { PiEmittedEvent } from "./event-delivery.js";
import type { PiEngineRuntime } from "./session-runtime.js";
import type { EngineViewState } from "./view-state.js";

export type AdapterCommandResult = OwnedUiCommandResult;

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

/** What carrying out a command reaches: the running engine, the view state it updates, and disposal. */
export interface EngineCommandContext {
  readonly engine: Pick<PiEngineRuntime, "runtime" | "session" | "generation" | "sessionCommands">;
  readonly state: Pick<EngineViewState, "activeModel" | "thinkingLevel" | "setTerminal" | "terminal">;
  /** False while delivery is overloaded or admission is stopped; a late model change then stays unpublished. */
  admissionOpen(): boolean;
  emit(value: PiEmittedEvent): void;
  dispose(): Promise<void>;
}

type EngineRuntime = NonNullable<PiEngineRuntime["runtime"]>;
type EngineSession = NonNullable<PiEngineRuntime["session"]>;
// Invariant: several command types share one union member, so a type selects every member whose `type` overlaps it.
type CommandOf<T extends OwnedUiCommand["type"]> = OwnedUiCommand extends infer C
  ? C extends { readonly type: infer K } ? ([Extract<K, T>] extends [never] ? never : C) : never
  : never;
interface EngineCommandTarget { readonly runtime: EngineRuntime; readonly session: EngineSession; readonly generation: number }
type EngineCommandHandler<T extends OwnedUiCommand["type"]> =
  (command: CommandOf<T>, context: EngineCommandContext, target: EngineCommandTarget) => Promise<void> | void;

// Invariant: prompt input and session controls run through the engine's own session commands, which own queuing and images.
async function runSessionCommand(
  request: Parameters<NonNullable<PiEngineRuntime["sessionCommands"]>["execute"]>[0],
  context: EngineCommandContext,
): Promise<void> {
  const result = await context.engine.sessionCommands?.execute(request);
  if (!result || result.outcome === "rejected" || result.outcome === "failed") {
    throw new Error(request.type === "retry" ? "no previous prompt is available to retry" : `Pi session command failed: ${request.type}`);
  }
}

function runPromptCommand(command: CommandOf<"prompt" | "steer" | "follow-up">, context: EngineCommandContext): Promise<void> {
  return runSessionCommand({
    type: command.type,
    text: command.text,
    ...(command.images === undefined ? {} : { images: [...command.images] }),
  }, context);
}

const ownedUiStateCommand = (): never => {
  throw new Error("owned UI state commands belong to the owned UI layer, not the Pi engine adapter");
};

// Invariant: one handler per command type; the table is exhaustive, so a new command type cannot be silently ignored.
const ENGINE_COMMANDS: { readonly [T in OwnedUiCommand["type"]]: EngineCommandHandler<T> } = {
  "prompt": (command, context) => runPromptCommand(command, context),
  "steer": (command, context) => runPromptCommand(command, context),
  "follow-up": (command, context) => runPromptCommand(command, context),
  "abort": (_command, context) => runSessionCommand({ type: "abort" }, context),
  "retry": (_command, context) => runSessionCommand({ type: "retry" }, context),
  "compact": (_command, context) => runSessionCommand({ type: "compact" }, context),
  "set-model": async (command, context, { runtime, session, generation }) => {
    const model = runtime.services.modelRuntime.getModel(command.model.providerId, command.model.modelId);
    if (!model) throw new Error(`model is unavailable: ${command.model.providerId}/${command.model.modelId}`);
    await session.setModel(model);
    if (generation === context.engine.generation && context.admissionOpen()) context.state.activeModel = { ...command.model };
  },
  "set-thinking-level": (command, context, { session }) => {
    session.setThinkingLevel(command.thinkingLevel);
    context.state.thinkingLevel = command.thinkingLevel;
  },
  "new-session": async (_command, _context, { runtime }) => { await runtime.newSession(); },
  "resume-session": async (command, _context, { runtime }) => { await runtime.switchSession(command.sessionPath); },
  "resize-surface": (command, context) => {
    context.state.setTerminal(command.surface);
    context.emit({ type: "terminal-surface", surface: context.state.terminal });
  },
  "shutdown": (_command, context) => context.dispose(),
  "set-setting": ownedUiStateCommand,
  "apply-customization": ownedUiStateCommand,
  "remove-customization": ownedUiStateCommand,
};

/** Carries out one admitted command against the running engine; throws when no session runs or the command fails. */
export async function performEngineCommand(command: OwnedUiCommand, context: EngineCommandContext): Promise<void> {
  const { runtime, session, generation } = context.engine;
  if (!runtime || !session) throw new Error("engine session is unavailable");
  // Invariant: the table maps each type to the handler for exactly that command, so the command fits its own handler.
  const handler = ENGINE_COMMANDS[command.type] as (command: OwnedUiCommand, context: EngineCommandContext, target: EngineCommandTarget) => Promise<void> | void;
  await handler(command, context, { runtime, session, generation });
}
