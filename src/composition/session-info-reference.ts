import type { ReferenceDocumentProvider } from "../features/owned-ui/reference-screen-app.js";
import type { PiEngineAdapter } from "../integrations/pi/engine/adapter.js";
import { renderPiShellSessionInfoReferenceDocument } from "../integrations/pi/components/shell-session-info-reference.js";

/** Captures one current session snapshot and adapts it to the neutral reference document. */
export async function loadSessionInfoReference(adapter: PiEngineAdapter): Promise<ReferenceDocumentProvider> {
  const result = await adapter.executeWorkflow({ command: "session", argument: "" });
  if (result.outcome !== "completed") throw new Error(result.message);
  if (result.presentation?.kind !== "session-info") throw new Error("Session workflow returned no structured information");
  const presentation = result.presentation;
  let cached: { readonly width: number; readonly document: ReturnType<typeof renderPiShellSessionInfoReferenceDocument> } | null = null;
  const document = (width: number) => {
    if (cached?.width !== width) cached = { width, document: renderPiShellSessionInfoReferenceDocument(presentation, width) };
    return cached.document;
  };
  return {
    preamble: width => document(width).preamble,
    sections: width => document(width).sections,
  };
}
