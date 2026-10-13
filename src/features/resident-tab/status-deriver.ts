export type ResidentTabDerivedStatus = "starting" | "working" | "needs-input" | "done-unseen" | "idle" | "failed";

export interface ResidentTabFacts {
  readonly lifecycle: string;
  readonly pendingRequests: number;
  readonly queuedInput: number;
  readonly stopReason?: string;
  readonly settledUnseen?: boolean;
}

export function deriveResidentTabStatus(facts: ResidentTabFacts): ResidentTabDerivedStatus {
  if (facts.lifecycle === "failed") return "failed";
  if (facts.pendingRequests > 0) return "needs-input";
  if (facts.lifecycle === "busy" || facts.queuedInput > 0) return "working";
  if (facts.lifecycle === "starting") return "starting";
  if (facts.stopReason === "error") return "failed";
  if (facts.settledUnseen === true) return "done-unseen";
  return "idle";
}
