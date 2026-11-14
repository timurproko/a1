import { randomUUID } from "node:crypto";
import { UI_ACCENT_COLORS, type OwnedUiSessionBackend, type UiAccentColor } from "../contracts/owned-ui/index.js";
import { serveSessionControl } from "../foundation/lifecycle/session-control.js";
import { ReadySessionBinding } from "../features/owned-ui/ready-session-binding.js";
import { createOwnedRuntimeContext, type OwnedRuntimeContext } from "../features/owned-ui/runtime-context.js";
import type { HerdrBindingReservation } from "../features/owned-ui/herdr-binding.js";
import type { OwnedSettingsManager } from "../ui/settings/manager.js";

export async function startSessionColorControl(backend: OwnedUiSessionBackend, settings: OwnedSettingsManager, runtimeDir: string, runtimeId: string = randomUUID(), herdrBinding?: HerdrBindingReservation, context: OwnedRuntimeContext = createOwnedRuntimeContext(runtimeId, herdrBinding)) {
  const publishedBinding = backend.identity.sessionBindingGeneration;
  const identity = () => ({ sessionId: backend.identity.currentHistorySessionId() ?? backend.identity.sessionId, binding: backend.identity.sessionBindingGeneration });
  const control = await serveSessionControl({ runtimeDir, runtimeId: context.runtimeId, identity, handle: async payload => {
    if (backend.identity.disposed) throw Object.assign(new Error("The session is stopped."), { code: "session-unavailable" });
    if (!payload || typeof payload !== "object") throw Object.assign(new Error("Invalid color request."), { code: "invalid-request" });
    const request = payload as { action?: unknown; color?: unknown };
    const sessionId = identity().sessionId;
    if (request.action === "set") {
      if (!UI_ACCENT_COLORS.includes(request.color as UiAccentColor)) throw Object.assign(new Error("Unknown color."), { code: "invalid-color" });
      const result = await settings.change("a1", "accentColor", request.color as UiAccentColor);
      if (!result.applied) throw Object.assign(new Error(result.failure ?? "Color could not be applied."), { code: "control-failed" });
      return { sessionId, color: result.effectiveValue };
    }
    if (request.action !== "get") throw Object.assign(new Error("Unknown color action."), { code: "invalid-request" });
    return { sessionId, color: settings.value("accentColor") };
  } });
  return new ReadySessionBinding(backend, control, context, publishedBinding);
}
