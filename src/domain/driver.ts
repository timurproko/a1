import type {
  AgentId,
  GenerationId,
  NativePiProfile,
  TerminalDimensions,
  TerminalSurface,
} from "./model.js";

export type TerminalDriverEvent =
  | { readonly type: "surface"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly surface: TerminalSurface }
  | { readonly type: "exit"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly exitCode: number | null; readonly signal: number | null; readonly surface: TerminalSurface | null }
  | { readonly type: "error"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly message: string };

export interface TerminalDriverHandle {
  readonly agentId: AgentId;
  readonly generationId: GenerationId;
  input(data: string): void;
  resize(dimensions: TerminalDimensions): void;
  stop(): Promise<void>;
  snapshot(): TerminalSurface | null;
}

export interface TerminalDriver {
  start(
    agentId: AgentId,
    generationId: GenerationId,
    profile: NativePiProfile,
    emit: (event: TerminalDriverEvent) => void,
  ): Promise<TerminalDriverHandle>;
}
