import { createHash } from "node:crypto";
import type { OwnedUiSessionNameState, OwnedUiSessionNamingPort } from "../../contracts/owned-ui/index.js";
import { integrationFailure, integrationResponse, parseIntegrationRequest, type IntegrationResponse } from "./protocol.js";

/** A name-specific compare token exposes neither history paths nor engine provenance. */
function revision(state: OwnedUiSessionNameState): string {
  return createHash("sha256").update(JSON.stringify([state.binding, state.nameEntryId, state.name])).digest("hex");
}

/** Runs synchronously inside the exact-target runtime fence; manual edits never use automatic naming's apply. */
export function applySessionName(input: unknown, naming: OwnedUiSessionNamingPort | undefined): IntegrationResponse {
  try {
    const request = parseIntegrationRequest(input);
    if (request.type !== "session.get" && request.type !== "session.rename") throw integrationFailure("unsupported-operation", "Not a name operation.");
    const before = naming?.state();
    if (!before) throw integrationFailure("session-unavailable", "The persistent session name is unavailable.");
    if (request.type === "session.rename") {
      if (revision(before) !== request.expectedNameRevision) throw integrationFailure("name-conflict", "The name changed. Read it again before renaming.");
      if (!naming?.rename) throw integrationFailure("session-unavailable", "Manual naming is unavailable.");
      if (!naming.rename(before, request.name!)) throw integrationFailure("name-conflict", "The captured session name could not be changed.");
    }
    const state = naming!.state();
    if (!state || state.binding !== before.binding || state.sessionFile !== before.sessionFile) throw integrationFailure("session-unavailable", "The session was replaced.");
    if (request.type === "session.rename" && state.name !== request.name) throw integrationFailure("name-conflict", "The name changed during application.");
    return integrationResponse(request, { target: request.target, name: state.name, nameRevision: revision(state),
      ...(request.type === "session.rename" ? { status: "applied" } : {}) });
  } catch (error) { return integrationResponse(input, undefined, error); }
}
