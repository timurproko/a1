import type { OwnedUiSessionNamingPort } from "../../contracts/owned-ui/index.js";
import { integrationFailure, integrationResponse, parseIntegrationRequest, type IntegrationResponse } from "./protocol.js";

/** Synchronous durable policy control inside the existing exact-target serialized runtime handler. */
export function applySessionAutoName(input: unknown, naming: OwnedUiSessionNamingPort | undefined, profileEnabled: boolean): IntegrationResponse {
  try {
    const request = parseIntegrationRequest(input);
    if ((request.type !== "settings.get" && request.type !== "settings.update") || request.setting !== "sessionAutoName") {
      throw integrationFailure("unsupported-operation", "Not an automatic-name setting operation.");
    }
    const before = naming?.state();
    if (!before) throw integrationFailure("session-unavailable", "The persistent session naming owner is unavailable.");
    if (request.type === "settings.update" && !naming?.setAutoName?.(before, request.value as boolean)) {
      throw integrationFailure("session-unavailable", "The session cannot durably apply this naming policy.");
    }
    const state = naming!.state();
    if (!state || state.binding !== before.binding || state.sessionFile !== before.sessionFile) {
      throw integrationFailure("session-unavailable", "The session was replaced.");
    }
    const storedValue = state.autoName ?? null;
    if (request.type === "settings.update" && storedValue !== request.value) {
      throw integrationFailure("settings-failed", "The naming owner did not acknowledge this policy.");
    }
    return integrationResponse(request, { target: request.target, setting: "sessionAutoName", storedValue,
      effectiveValue: storedValue ?? profileEnabled, origin: storedValue === null ? "profile" : "session", application: "live",
      ...(request.type === "settings.update" ? { status: "applied" } : {}) });
  } catch (error) { return integrationResponse(input, undefined, error); }
}
