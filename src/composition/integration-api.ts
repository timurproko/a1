import type { OwnedUiSessionBackend, OwnedUiSessionLifecyclePort, OwnedUiSessionNamingPort } from "../contracts/owned-ui/index.js";
import { serveSessionControl } from "../foundation/lifecycle/session-control.js";
import { ReadySessionBinding } from "../features/owned-ui/ready-session-binding.js";
import { createOwnedRuntimeContext, type OwnedRuntimeContext } from "../features/owned-ui/runtime-context.js";
import type { HerdrBindingReservation } from "../features/owned-ui/herdr-binding.js";
import type { ApplicationSettings } from "../app/settings/index.js";
import { applyIntegrationSettings, applySessionLifecycle, integrationFailure, parseIntegrationRequest } from "../features/integration-api/index.js";

/**
 * Binds the shared public protocol to the existing fenced private runtime transport. The shell that answers
 * lifecycle operations is constructed after this control starts, so it arrives through a late-bound provider;
 * until it exists, and after disposal, lifecycle operations report session-unavailable.
 */
export async function startIntegrationControl(backend: OwnedUiSessionBackend & { readonly naming?: OwnedUiSessionNamingPort }, settings: ApplicationSettings, runtimeDir: string, runtime: string | OwnedRuntimeContext = createOwnedRuntimeContext(), herdrBinding?: HerdrBindingReservation, lifecycle: () => OwnedUiSessionLifecyclePort | null = () => null) {
  const { applySessionName } = await import("../features/integration-api/session-names.js");
  const { applySessionAutoName } = await import("../features/integration-api/session-auto-name.js");
  const context = typeof runtime === "string" ? createOwnedRuntimeContext(runtime, herdrBinding) : runtime;
  const publishedBinding = backend.identity.sessionBindingGeneration;
  const identity = () => ({ sessionId: backend.identity.currentHistorySessionId() ?? backend.identity.sessionId, binding: backend.identity.sessionBindingGeneration });
  const control = await serveSessionControl({ runtimeDir, runtimeId: context.runtimeId, identity, handle: async payload => {
    if (backend.identity.disposed) throw integrationFailure("session-unavailable", "The session is stopped.");
    const request = parseIntegrationRequest(payload);
    if (request.target?.scope !== "session" || request.target.sessionId !== identity().sessionId || request.target.runtimeId !== context.runtimeId) {
      throw integrationFailure("session-unavailable", "The exact requested runtime/session is not active.");
    }
    // Invariant: lifecycle work stays synchronous inside this serialized handler (readiness and admission share one turn).
    if (request.type === "session.lifecycle" || request.type === "session.exit") return applySessionLifecycle(request, lifecycle());
    if (request.type === "session.get" || request.type === "session.rename") return applySessionName(request, backend.naming);
    if (request.setting === "sessionAutoName") {
      settings.refresh();
      return applySessionAutoName(request, backend.naming, settings.value("sessionAutoName"));
    }
    return await applyIntegrationSettings(request, settings);
  } });
  return new ReadySessionBinding(backend, control, context, publishedBinding);
}
