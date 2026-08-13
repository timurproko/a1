import type { AgentId, GenerationId, TerminalAgentProfile } from "./model.js";

export type TerminalDriverEvent =
  | { readonly type: "exit"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly exitCode: number | null; readonly signal: number | null }
  | { readonly type: "error"; readonly agentId: AgentId; readonly generationId: GenerationId; readonly message: string };

export interface TerminalDriverHandle {
  readonly agentId: AgentId;
  readonly generationId: GenerationId;
  stop(): Promise<void>;
}

/** Temporary lifecycle-only port until the transparent foreground broker replaces it. */
export interface TerminalDriver {
  start(
    agentId: AgentId,
    generationId: GenerationId,
    profile: TerminalAgentProfile,
    emit: (event: TerminalDriverEvent) => void,
  ): Promise<TerminalDriverHandle>;
}
