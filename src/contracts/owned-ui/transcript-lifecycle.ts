import type { OwnedUiToolState, OwnedUiTranscriptBlock } from "./model.js";

/** Compatibility for existing owned components/fixtures without explicit execution state. */
export function transcriptToolState(block: OwnedUiTranscriptBlock): OwnedUiToolState | undefined {
  if (block.kind !== "tool-call" && block.kind !== "tool-result") return undefined;
  if (block.toolState !== undefined) return block.toolState;
  const payload = typeof block.payload === "object" && block.payload !== null ? block.payload : {};
  const isError = "isError" in payload && payload.isError === true;
  const partial = "partialResult" in payload && payload.partialResult === true;
  return {
    argsComplete: block.status === "finalized" || "argsComplete" in payload && payload.argsComplete === true,
    execution: block.kind === "tool-result"
      ? block.status === "live" ? "running" : isError ? "failed" : "succeeded"
      : partial ? "running" : "pending",
  };
}

/** Within a session generation, reject obsolete phases as well as obsolete revisions. */
export function acceptsTranscriptUpdate(current: OwnedUiTranscriptBlock, next: OwnedUiTranscriptBlock): boolean {
  if (current.id !== next.id || current.revision > next.revision) return false;
  const before = transcriptToolState(current);
  const after = transcriptToolState(next);
  if (before !== undefined && after !== undefined) {
    const rank = (state: OwnedUiToolState) => state.execution === "pending" ? 0 : state.execution === "running" ? 1 : 2;
    if (rank(after) < rank(before)) return false;
    if (before.argsComplete && !after.argsComplete && rank(after) < 2) return false;
    // A legacy finalized call declaration only closed arguments. Actual result finality is a barrier.
    return !(current.status === "finalized" && next.status === "live" && before.execution !== "pending");
  }
  return !(current.status === "finalized" && next.status === "live");
}
