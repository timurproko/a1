import { OWNED_SETTING_DECLARATIONS, type ApplicationSettings } from "../../app/settings/index.js";
import { integrationCapabilities, integrationFailure, integrationResponse, parseIntegrationRequest, type IntegrationRequest, type IntegrationResponse } from "./protocol.js";

/** Deliberately small allowlist; no engine settings, private paths or credentials cross this boundary. */
function integrationSettingDescriptors() {
  return ["defaultAccentColor", "accentColor"].map(key => {
    const setting = OWNED_SETTING_DECLARATIONS[key as "accentColor" | "defaultAccentColor"];
    return { id: setting.id, label: setting.label, description: setting.description, section: setting.section,
      type: "string", choices: setting.allowedValues, scope: key === "accentColor" ? "session" : "profile",
      application: key === "accentColor" ? "live" : "next-session", concurrency: key === "accentColor" ? "serialized" : "atomic-key-assignment" };
  });
}

export interface IntegrationServices {
  profile(): ApplicationSettings;
  session(request: IntegrationRequest): Promise<unknown>;
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
      origin: session ? "session" : setting.source, application: session ? "live" : "next-session",
      ...(status === undefined ? {} : { status }) });
  } catch (error) { return integrationResponse(input, undefined, error); }
}
