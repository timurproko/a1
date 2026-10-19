/** How the tab's last agent turn settled; it persists until the next turn starts. */
export type ResidentTabTurnSettlement = "done" | "aborted" | "error";

export type ResidentTabDerivedStatus = "starting" | "working" | "needs-input" | "idle" | "failed" | ResidentTabTurnSettlement;

export interface ResidentTabFacts {
  readonly lifecycle: string;
  readonly pendingRequests: number;
  readonly queuedInput: number;
  readonly lastTurn?: ResidentTabTurnSettlement;
}

// Invariant: `failed` is reserved for a failed tab lifecycle; a turn that errored reports `error`.
export function deriveResidentTabStatus(facts: ResidentTabFacts): ResidentTabDerivedStatus {
  if (facts.lifecycle === "failed") return "failed";
  if (facts.pendingRequests > 0) return "needs-input";
  if (facts.lifecycle === "busy" || facts.queuedInput > 0) return "working";
  if (facts.lifecycle === "starting") return "starting";
  return facts.lastTurn ?? "idle";
}
