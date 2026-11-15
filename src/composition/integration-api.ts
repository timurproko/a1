import type { OwnedUiSessionBackend } from "../contracts/owned-ui/index.js";
import { serveSessionControl } from "../foundation/lifecycle/session-control.js";
import { ReadySessionBinding } from "../features/owned-ui/ready-session-binding.js";
import { createOwnedRuntimeContext, type OwnedRuntimeContext } from "../features/owned-ui/runtime-context.js";
import type { HerdrBindingReservation } from "../features/owned-ui/herdr-binding.js";
import type { ApplicationSettings } from "../app/settings/index.js";
import { applyIntegrationSettings, integrationFailure, parseIntegrationRequest } from "../features/integration-api/index.js";

/** Binds the shared public protocol to the existing fenced private runtime transport. */
export async function startIntegrationControl(backend: OwnedUiSessionBackend, settings: ApplicationSettings, runtimeDir: string, runtime: string | OwnedRuntimeContext = createOwnedRuntimeContext(), herdrBinding?: HerdrBindingReservation) {
  const context = typeof runtime === "string" ? createOwnedRuntimeContext(runtime, herdrBinding) : runtime;
  const publishedBinding = backend.identity.sessionBindingGeneration;
  const identity = () => ({ sessionId: backend.identity.currentHistorySessionId() ?? backend.identity.sessionId, binding: backend.identity.sessionBindingGeneration });
  const control = await serveSessionControl({ runtimeDir, runtimeId: context.runtimeId, identity, handle: async payload => {
    if (backend.identity.disposed) throw integrationFailure("session-unavailable", "The session is stopped.");
    const request = parseIntegrationRequest(payload);
    if (request.target?.scope !== "session" || request.target.sessionId !== identity().sessionId || request.target.runtimeId !== context.runtimeId) {
      throw integrationFailure("session-unavailable", "The exact requested runtime/session is not active.");
    }
    return await applyIntegrationSettings(request, settings);
  } });
  return new ReadySessionBinding(backend, control, context, publishedBinding);
}
