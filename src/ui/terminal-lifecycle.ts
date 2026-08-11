import type { TerminalAgentProfile, TerminalSurface } from "../domain/index.js";

export type TerminalExitDisposition = "exit-foreground-ui" | "retain-shell-session";

export function terminalExitDisposition(profile: TerminalAgentProfile, foregroundCommandOnly: boolean): TerminalExitDisposition {
  return profile.kind === "shell" && foregroundCommandOnly ? "retain-shell-session" : "exit-foreground-ui";
}

export interface TerminalOwnershipActions {
  stopInput(): void | Promise<void>;
  commitFinalSurface(): TerminalSurface | null | Promise<TerminalSurface | null>;
  discardChildModes(surface: TerminalSurface | null): void | Promise<void>;
  drainInput(): void | Promise<void>;
  restoreHost(): void | Promise<void>;
}

/** Serializes terminal release and guarantees physical restoration at most once. */
export class TerminalOwnershipTransaction {
  #closing: Promise<TerminalSurface | null> | null = null;

  constructor(private readonly actions: TerminalOwnershipActions) {}

  close(): Promise<TerminalSurface | null> {
    if (this.#closing) return this.#closing;
    this.#closing = this.#run();
    return this.#closing;
  }

  async #run(): Promise<TerminalSurface | null> {
    await this.actions.stopInput();
    const finalSurface = await this.actions.commitFinalSurface();
    await this.actions.discardChildModes(finalSurface);
    await this.actions.drainInput();
    await this.actions.restoreHost();
    return finalSurface;
  }
}
