/**
 * Provenance: @earendil-works/pi-coding-agent 1.1.0 (MIT), commit abe508e1b89912adde45528136c3221eb69acdd7,
 * packages/coding-agent/src/modes/interactive/program-status-reporter.ts.
 * Modifications: Remap Pi session events to A1's neutral run events, inject the terminal reporter, use
 * A1's application identity, and clear dialog state when the owned session changes.
 * Deviations: none.
 */
import type { ProgramStatus } from "@earendil-works/pi-tui";
import type { OwnedUiEvent } from "../../../../contracts/owned-ui/index.js";

export type ProgramStatusBlocked = {
  readonly kind: NonNullable<ProgramStatus["kind"]>;
  readonly message: string;
};

type ProgramStatusRunEvent = Extract<OwnedUiEvent, {
  type: "agent-run-started" | "assistant-message-completed" | "agent-run-settled";
}>;

function firstLine(text: string | undefined): string {
  return text?.split(/\r?\n/, 1)[0]?.trim() || "Error";
}

/** Reports A1's owned session lifecycle through Pi TUI's OSC 7501 terminal contract. */
export class ProgramStatusReporter {
  readonly #reportStatus: (status: ProgramStatus) => void;
  readonly #getSessionName: () => string | undefined;
  readonly #app: string;
  #runActive = false;
  #runResult: ProgramStatus = { state: "done" };
  #restingStatus: ProgramStatus = { state: "idle" };
  readonly #blocked = new Map<string, ProgramStatusBlocked>();
  #lastReport: string | undefined;

  constructor(
    reportStatus: (status: ProgramStatus) => void,
    getSessionName: () => string | undefined,
    app = "a1",
  ) {
    this.#reportStatus = reportStatus;
    this.#getSessionName = getSessionName;
    this.#app = app;
  }

  handleEvent(event: ProgramStatusRunEvent): void {
    switch (event.type) {
      case "agent-run-started":
        this.#runActive = true;
        this.#runResult = { state: "done" };
        break;
      case "assistant-message-completed":
        this.#runResult = event.successful
          ? { state: "done" }
          : this.#runResult.state === "error" ? this.#runResult : { state: "error" };
        break;
      case "agent-run-settled":
        this.#runActive = false;
        this.#restingStatus = event.aborted
          ? { state: "idle" }
          : event.successful
            ? this.#runResult
            : this.#runResult.state === "error" ? this.#runResult : { state: "error" };
        break;
    }
    this.report();
  }

  /** Report `blocked` for a dialog until it is cleared with `undefined`. Reopening a source replaces it. */
  setBlocked(source: string, status: ProgramStatusBlocked | undefined): void {
    this.#blocked.delete(source);
    if (status !== undefined) this.#blocked.set(source, status);
    this.report();
  }

  /** Preserve the first visible error line without exposing transcript or prompt content. */
  setErrorMessage(message: string | undefined): void {
    const status: ProgramStatus = { state: "error", message: firstLine(message) };
    if (this.#runActive) this.#runResult = status;
    else this.#restingStatus = status;
    this.report();
  }

  /** Forget the previous session's run and transient dialogs. */
  reset(): void {
    this.#runActive = false;
    this.#runResult = { state: "done" };
    this.#restingStatus = { state: "idle" };
    this.#blocked.clear();
    this.report();
  }

  clear(): void {
    this.#emit({ state: "clear", app: this.#app });
  }

  report(): void {
    this.#emit({ ...this.#currentStatus(), app: this.#app });
  }

  #emit(status: ProgramStatus): void {
    const key = JSON.stringify(status);
    if (key === this.#lastReport) return;
    this.#lastReport = key;
    this.#reportStatus(status);
  }

  #currentStatus(): ProgramStatus {
    const blocked = [...this.#blocked.values()].at(-1);
    if (blocked !== undefined) return { state: "blocked", ...blocked };
    const status = this.#runActive ? { state: "working" as const } : this.#restingStatus;
    if (status.state === "working" || status.state === "done") {
      const message = this.#getSessionName();
      return { ...status, ...(message === undefined ? {} : { message }) };
    }
    return status;
  }
}
