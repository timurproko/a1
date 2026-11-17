import { OWNED_SETTING_DECLARATIONS } from "../../app/settings/index.js";

export const INTEGRATION_VERSION = 1;
export const INTEGRATION_LIMIT = 8192;
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;
const OPERATIONS = ["capabilities", "settings.list", "settings.get", "settings.update", "session.get", "session.lifecycle", "session.exit", "session.rename"] as const;
/** Why one exact live session cannot stop safely right now; the first listed blocker is the refusal code. */
export const EXIT_BLOCKERS = ["session-stopping", "session-busy", "editor-not-empty", "pending-input", "overlay-open"] as const;
export type ExitBlocker = typeof EXIT_BLOCKERS[number];
const LIFECYCLES = ["starting", "ready", "busy", "suspended", "stopping", "stopped", "failed"] as const;
/** Read-only answer of session.lifecycle; admission is re-evaluated inside the runtime, never trusted from a snapshot. */
export interface SessionLifecycleSnapshot {
  readonly lifecycle: typeof LIFECYCLES[number];
  readonly editorEmpty: boolean;
  readonly pendingSubmissions: number;
  readonly queuedInput: number;
  readonly overlayOpen: boolean;
  readonly exitAdmissible: boolean;
  readonly blockers: readonly ExitBlocker[];
}
const LIFECYCLE_OPERATIONS = new Set<string>(["session.get", "session.lifecycle", "session.exit", "session.rename"]);
export type IntegrationOperation = typeof OPERATIONS[number];
export type IntegrationTarget = { readonly scope: "profile"; readonly profileId: "a1" }
  | { readonly scope: "session"; readonly sessionId: string; readonly runtimeId: string };
export interface IntegrationRequest {
  readonly version: 1;
  readonly id: string;
  readonly type: IntegrationOperation;
  readonly target?: IntegrationTarget;
  readonly setting?: "accentColor" | "defaultAccentColor";
  readonly value?: string;
  readonly name?: string;
  readonly expectedNameRevision?: string;
}
export interface IntegrationResponse {
  readonly version: 1;
  readonly id: string | null;
  readonly type: "response";
  readonly command: string | null;
  readonly success: boolean;
  readonly data?: unknown;
  readonly error?: { readonly code: string; readonly message: string };
}
export const integrationFailure = (code: string, message: string): Error & { code: string } => Object.assign(new Error(message), { code });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const only = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every(key => keys.includes(key));

/** Strict public requests: unsupported versions and ambiguous targets fail before any mutation. */
export function parseIntegrationRequest(value: unknown): IntegrationRequest {
  if (!record(value) || Buffer.byteLength(JSON.stringify(value)) > 4096) throw integrationFailure("invalid-request", "Expected a bounded JSON request object.");
  if (value.version !== INTEGRATION_VERSION) throw integrationFailure("unsupported-version", "This installation supports integration protocol 1.");
  if (typeof value.id !== "string" || !/^[a-zA-Z0-9._:-]{1,64}$/u.test(value.id)) throw integrationFailure("invalid-request", "Supply a bounded correlation id.");
  if (!OPERATIONS.includes(value.type as IntegrationOperation)) throw integrationFailure("unsupported-operation", "Unknown integration operation.");
  const type = value.type as IntegrationOperation;
  const discovery = type === "capabilities" || type === "settings.list";
  const keys = discovery ? ["version", "id", "type"] : type === "session.rename" ? ["version", "id", "type", "target", "name", "expectedNameRevision"] : LIFECYCLE_OPERATIONS.has(type) ? ["version", "id", "type", "target"]
    : ["version", "id", "type", "target", "setting", ...(type === "settings.update" ? ["value"] : [])];
  if (!only(value, keys)) throw integrationFailure("invalid-request", "Unexpected request fields.");
  if (discovery) return value as unknown as IntegrationRequest;
  const target = value.target;
  if (!record(target)) throw integrationFailure("target-required", "Supply an explicit target.");
  if (target.scope === "session") {
    if (!only(target, ["scope", "sessionId", "runtimeId"]) || typeof target.sessionId !== "string" || !UUID.test(target.sessionId)
      || typeof target.runtimeId !== "string" || !UUID.test(target.runtimeId)) throw integrationFailure("invalid-target", "Supply exact session and runtime UUIDs.");
  } else if (target.scope === "profile") {
    if (!only(target, ["scope", "profileId"]) || target.profileId !== "a1") throw integrationFailure("unsupported-profile", "Only the a1 profile is supported.");
  } else throw integrationFailure("unsupported-scope", "Only profile and session scopes are supported.");
  if (LIFECYCLE_OPERATIONS.has(type)) {
    if (target.scope !== "session") throw integrationFailure("unsupported-scope", "Session operations require a session target.");
    if (type === "session.rename") {
      if (!validSessionName(value.name)) throw integrationFailure("invalid-value", "Supply a nonempty single-line name of at most 256 characters without controls.");
      if (!validNameRevision(value.expectedNameRevision)) throw integrationFailure("invalid-request", "Supply the name revision from session.get.");
      return { ...value, name: value.name.trim() } as unknown as IntegrationRequest;
    }
  } else {
    if (value.setting !== "accentColor" && value.setting !== "defaultAccentColor") throw integrationFailure("unsupported-setting", "This setting is not exposed.");
    if ((value.setting === "accentColor") !== (target.scope === "session")) throw integrationFailure("unsupported-scope", "Setting is not supported in this scope.");
    if (type === "settings.update" && !OWNED_SETTING_DECLARATIONS[value.setting].allowedValues.includes(value.value as never)) {
      throw integrationFailure("invalid-value", "Choose a value from the setting descriptor.");
    }
  }
  return value as unknown as IntegrationRequest;
}

export function integrationResponse(request: unknown, data?: unknown, error?: unknown): IntegrationResponse {
  const input = record(request) ? request : {};
  const identity = { version: INTEGRATION_VERSION as 1, id: typeof input.id === "string" && /^[a-zA-Z0-9._:-]{1,64}$/u.test(input.id) ? input.id : null,
    type: "response" as const, command: typeof input.type === "string" && input.type.length <= 64 ? input.type : null };
  if (error === undefined) return { ...identity, success: true, data };
  const detail = error as Error & { code?: string };
  return { ...identity, success: false, error: { code: detail.code ?? "control-failed", message: (detail.message ?? "Integration request failed.").slice(0, 512) } };
}

/** A parsed JSON object alone is not an acknowledgement. Validate its envelope and exact operation target. */
export function assertIntegrationResponse(value: unknown, request: IntegrationRequest): asserts value is IntegrationResponse {
  if (!record(value) || Buffer.byteLength(JSON.stringify(value)) > INTEGRATION_LIMIT || value.version !== INTEGRATION_VERSION
    || value.id !== request.id || value.type !== "response" || value.command !== request.type || typeof value.success !== "boolean"
    || !only(value, ["version", "id", "type", "command", "success", ...(value.success ? ["data"] : ["error"])])) {
    throw integrationFailure("invalid-response", "Integration response identity did not match the request.");
  }
  if (!value.success) {
    if (!record(value.error) || typeof value.error.code !== "string" || typeof value.error.message !== "string") throw integrationFailure("invalid-response", "Malformed integration failure.");
    return;
  }
  if (!record(value.data)) throw integrationFailure("invalid-response", "Missing integration result.");
  if (request.target !== undefined) {
    const target = value.data.target;
    if (!record(target) || Object.keys(target).length !== Object.keys(request.target).length
      || Object.entries(request.target).some(([key, expected]) => target[key] !== expected)) throw integrationFailure("invalid-response", "Integration result target did not match.");
  }
  if (request.type === "session.lifecycle" || request.type === "session.exit") assertLifecycleReadback(value.data, request.type);
  if (request.type === "session.get" || request.type === "session.rename") {
    const data = value.data;
    if ((data.name !== null && (typeof data.name !== "string" || Buffer.byteLength(data.name) > 4096)) || !validNameRevision(data.nameRevision)
      || (request.type === "session.rename" && (data.status !== "applied" || data.name !== request.name?.trim()))) {
      throw integrationFailure("invalid-response", "Session name application was not acknowledged.");
    }
  }
  if (request.setting !== undefined) {
    const data = value.data;
    const choices = OWNED_SETTING_DECLARATIONS[request.setting].allowedValues;
    if (data.setting !== request.setting || !choices.includes(data.storedValue as never) || !choices.includes(data.effectiveValue as never)
      || !["default", "stored", "session", "invocation"].includes(data.origin as string)
      || data.application !== (request.target?.scope === "session" ? "live" : "next-session")) throw integrationFailure("invalid-response", "Malformed setting readback.");
    if (request.type === "settings.update" && (data.storedValue !== request.value
      || data.status !== (request.target?.scope === "session" ? "applied" : "stored")
      || (request.target?.scope === "session" && data.effectiveValue !== request.value))) throw integrationFailure("invalid-response", "Setting update was not acknowledged as applied or stored.");
  }
}

/** A lifecycle snapshot or exit acknowledgement must be internally consistent before a supervisor acts on it. */
function assertLifecycleReadback(data: Record<string, unknown>, type: "session.lifecycle" | "session.exit"): void {
  if (type === "session.exit") {
    if (data.status !== "admitted" || data.lifecycle !== "stopping") throw integrationFailure("invalid-response", "Exit was not acknowledged as admitted.");
    return;
  }
  const count = (candidate: unknown) => Number.isSafeInteger(candidate) && (candidate as number) >= 0;
  const blockers = data.blockers;
  if (!LIFECYCLES.includes(data.lifecycle as never) || typeof data.editorEmpty !== "boolean" || !count(data.pendingSubmissions) || !count(data.queuedInput)
    || typeof data.overlayOpen !== "boolean" || typeof data.exitAdmissible !== "boolean" || !Array.isArray(blockers)
    || !blockers.every(blocker => EXIT_BLOCKERS.includes(blocker as ExitBlocker)) || data.exitAdmissible !== (blockers.length === 0)) {
    throw integrationFailure("invalid-response", "Malformed lifecycle snapshot.");
  }
}

/** Manual names are single-line user data, never terminal control sequences. */
export function validSessionName(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && [...value.trim()].length <= 256
    && !/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/u.test(value);
}

/** Opaque compare token; deliberately not a path or a private discovery record. */
export function validNameRevision(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

export function integrationCapabilities() {
  return { operations: OPERATIONS, launchColor: true, terminalIdentity: true, snapshots: true, lifecycle: true };
}
