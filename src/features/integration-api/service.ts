import { OWNED_SETTING_DECLARATIONS, type ApplicationSettings } from "../../app/settings/index.js";
import { integrationCapabilities, integrationFailure, integrationResponse, parseIntegrationRequest, type ExitBlocker, type IntegrationRequest, type IntegrationResponse, type SessionLifecycleSnapshot } from "./protocol.js";

/** Deliberately small allowlist; no engine settings, private paths or credentials cross this boundary. */
function integrationSettingDescriptors() {
  return ["defaultAccentColor", "accentColor"].map(key => {
    const setting = OWNED_SETTING_DECLARATIONS[key as "accentColor" | "defaultAccentColor"];
    return { id: setting.id, label: setting.label, description: setting.description, section: setting.section,
      type: "string", choices: setting.allowedValues, scope: key === "accentColor" ? "session" : "profile",
      application: setting.application, concurrency: key === "accentColor" ? "serialized" : "atomic-key-assignment" };
  });
}

export interface IntegrationServices {
  profile(): ApplicationSettings;
  session(request: IntegrationRequest): Promise<unknown>;
}

/** What the owning shell answers about stopping; implemented by the live session presenter. */
export interface SessionLifecycleServices {
  readiness(): SessionLifecycleSnapshot;
  requestExit(): { readonly admitted: true } | { readonly admitted: false; readonly blocker: ExitBlocker };
}
const BLOCKER_MESSAGES: Record<ExitBlocker, string> = {
  "session-stopping": "The session is already stopping or has stopped.",
  "session-busy": "The session is not idle.",
  "editor-not-empty": "The editor holds a draft.",
  "pending-input": "A submission is waiting or input is queued.",
  "overlay-open": "A dialog, selector or overlay is open.",
};

/**
 * Runs inside the owning runtime's serialized handler. Deliberately synchronous: the readiness check and
 * the admission happen with no await between them, so a concurrent request cannot interleave.
 */
export function applySessionLifecycle(input: unknown, lifecycle: SessionLifecycleServices | null): IntegrationResponse {
  try {
    const request = parseIntegrationRequest(input);
    if (request.type !== "session.lifecycle" && request.type !== "session.exit") throw integrationFailure("unsupported-operation", "Not a lifecycle operation.");
    if (lifecycle === null) throw integrationFailure("session-unavailable", "The session shell is not available.");
    if (request.type === "session.lifecycle") return integrationResponse(request, { target: request.target, ...lifecycle.readiness() });
    const outcome = lifecycle.requestExit();
    if (!outcome.admitted) throw integrationFailure(outcome.blocker, BLOCKER_MESSAGES[outcome.blocker]);
    return integrationResponse(request, { target: request.target, status: "admitted", lifecycle: "stopping" });
  } catch (error) { return integrationResponse(input, undefined, error); }
}

/** The shared command router; session work is forwarded into the existing exact-target runtime. */
export async function executeIntegrationRequest(input: unknown, services: IntegrationServices): Promise<IntegrationResponse> {
  try {
    const request = parseIntegrationRequest(input);
    if (request.type === "capabilities") return integrationResponse(request, integrationCapabilities());
    if (request.type === "settings.list") return integrationResponse(request, { settings: integrationSettingDescriptors() });
    if (request.target?.scope === "session") return await services.session(request) as IntegrationResponse;
    return await applyIntegrationSettings(request, services.profile());
  } catch (error) { return integrationResponse(input, undefined, error); }
}

/** Runs inside the owning runtime, or against the selected profile's existing atomic settings store. */
export async function applyIntegrationSettings(input: unknown, settings: ApplicationSettings): Promise<IntegrationResponse> {
  try {
    const request = parseIntegrationRequest(input);
    if (request.type === "session.get") return integrationResponse(request, { target: request.target });
    if (request.type !== "settings.get" && request.type !== "settings.update") throw integrationFailure("unsupported-operation", "Not a settings operation.");
    const id = request.setting!;
    settings.refresh();
    let status: "applied" | "stored" | undefined;
    if (request.type === "settings.update") {
      const outcome = await settings.change("a1", id, request.value!);
      if (outcome.status !== "applied" && outcome.status !== "deferred") throw integrationFailure("settings-failed", "The owning settings service could not apply or store this value.");
      status = request.target?.scope === "session" ? "applied" : "stored";
      if (status === "applied" && !outcome.applied) throw integrationFailure("settings-failed", "Live application was not acknowledged.");
    }
    const setting = settings.resolution.settings.find(candidate => candidate.declaration.id === id)!;
    const session = request.target?.scope === "session";
    return integrationResponse(request, { target: request.target, setting: id,
      storedValue: setting.value, effectiveValue: session ? settings.valueOf(id) : setting.value,
      origin: session ? "session" : setting.source, application: setting.declaration.application,
      ...(status === undefined ? {} : { status }) });
  } catch (error) { return integrationResponse(input, undefined, error); }
}
