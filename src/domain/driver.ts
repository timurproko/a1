import type {
  AgentId,
  GenerationId,
  TerminalAgentProfile,
  TerminalDimensions,
  TerminalSurface,
} from "./model.js";
import type { HostTerminalInputEvent, TerminalRenderTransaction } from "./terminal.js";

export type TerminalDriverEvent =
  | { readonly type: "surface"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly surface: TerminalSurface }
  | { readonly type: "transaction"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly surface: TerminalSurface; readonly transaction: TerminalRenderTransaction }
  | { readonly type: "exit"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly exitCode: number | null; readonly signal: number | null; readonly surface: TerminalSurface | null }
  | { readonly type: "error"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly message: string };

export interface TerminalDriverHandle {
  readonly agentId: AgentId;
  readonly generationId: GenerationId;
  input(event: HostTerminalInputEvent): void;
  inputBatch(events: readonly HostTerminalInputEvent[]): void;
  resize(dimensions: TerminalDimensions): void;
  stop(): Promise<void>;
  snapshot(): TerminalSurface | null;
}

export interface TerminalDriver {
  start(
    agentId: AgentId,
    generationId: GenerationId,
    profile: TerminalAgentProfile,
    emit: (event: TerminalDriverEvent) => void,
  ): Promise<TerminalDriverHandle>;
}
