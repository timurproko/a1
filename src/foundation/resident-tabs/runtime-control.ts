import { runTerminalHostMaintenance, type MaintenanceOptions, type MaintenanceReport } from "./maintenance.js";

/** Mandatory native control semantics; optional methods never establish source authority. */
export const RUNTIME_CONTROL_API = "resident-control-v1";
export const RUNTIME_CONTROL_CORE = Object.freeze([
  "attach", "tab.list", "tab.view", "input", "resize", "detach", "controller-boundary",
] as const);

export interface RuntimeControlIdentity {
  readonly releaseId: string;
  readonly scope: string;
  readonly epoch: number;
  readonly bootId: string;
  readonly osSessionId: string;
}

export interface RuntimeControlDescription extends RuntimeControlIdentity {
  readonly api: typeof RUNTIME_CONTROL_API;
  readonly generation: 1;
  readonly core: readonly string[];
  readonly frameLimit: number;
  readonly inputLimit: number;
  readonly retryInput: false;
}

export type RuntimeControlVerdict =
  | { readonly status: "compatible"; readonly contract: RuntimeControlDescription }
  | { readonly status: "blocked"; readonly reason: "unavailable" | "invalid-contract" | "unsupported-api" | "source-mismatch" | "stale-epoch" | "missing-core" };

/**
 * Validates an authenticated source's descriptor against separately verified source custody.
 * This is not an activation verdict: the caller must also reconcile every live tab and fence
 * changes to that topology before committing a client selection.
 */
export function assessRuntimeControl(value: unknown, expected: RuntimeControlIdentity): RuntimeControlVerdict {
  if (!isRecord(value)) return blocked("invalid-contract");
  if (value.api !== RUNTIME_CONTROL_API || value.generation !== 1) return blocked("unsupported-api");
  if (!identityValid(value) || !identityValid(expected)
    || !boundedStrings(value.core) || typeof value.retryInput !== "boolean"
    || !positiveInteger(value.frameLimit, 2 * 1024 * 1024)
    || !positiveInteger(value.inputLimit, 1024 * 1024) || value.inputLimit > value.frameLimit) {
    return blocked("invalid-contract");
  }
  if (value.releaseId !== expected.releaseId || value.scope !== expected.scope
    || value.bootId !== expected.bootId || value.osSessionId !== expected.osSessionId) return blocked("source-mismatch");
  if (value.epoch !== expected.epoch) return blocked("stale-epoch");
  const core = value.core;
  if (value.retryInput || RUNTIME_CONTROL_CORE.some(method => !core.includes(method))) return blocked("missing-core");
  // Security: retain only allowlisted metadata, never arbitrary optional source data.
  return { status: "compatible", contract: Object.freeze({
    api: RUNTIME_CONTROL_API, generation: 1, releaseId: value.releaseId, scope: value.scope,
    epoch: value.epoch, bootId: value.bootId, osSessionId: value.osSessionId,
    core: Object.freeze([...value.core]), frameLimit: value.frameLimit, inputLimit: value.inputLimit,
    retryInput: false,
  }) };
}

export interface ReadRuntimeControlOptions extends Omit<MaintenanceOptions, "action" | "tabId"> {
  readonly expected: RuntimeControlIdentity;
  readonly maintain?: (options: MaintenanceOptions) => Promise<MaintenanceReport>;
}

/** A bounded read-only authenticated exchange; it never starts a host or substitutes a release. */
export async function readRuntimeControl(options: ReadRuntimeControlOptions): Promise<RuntimeControlVerdict> {
  const { expected, maintain = runTerminalHostMaintenance, ...maintenance } = options;
  try {
    const report = await maintain({ ...maintenance, action: "runtime-control" });
    if (report.schema !== "a1-tabs-maintenance-v1" || report.exitCode !== 0
      || report.host !== "running" || report.command !== "runtime-control") return blocked("unavailable");
    return assessRuntimeControl(report.result, expected);
  } catch {
    return blocked("unavailable");
  }
}

function blocked(reason: Extract<RuntimeControlVerdict, { status: "blocked" }>["reason"]): RuntimeControlVerdict {
  return { status: "blocked", reason };
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function positiveInteger(value: unknown, maximum = Number.MAX_SAFE_INTEGER): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 && value <= maximum;
}
function boundedStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.length <= 64 && new Set(value).size === value.length
    && value.every(entry => typeof entry === "string" && entry.length > 0 && entry.length <= 64);
}
function identityValid(value: object): value is RuntimeControlIdentity {
  const record = value as Record<string, unknown>;
  return typeof record.releaseId === "string" && /^[a-f0-9]{64}$/u.test(record.releaseId)
    && typeof record.scope === "string" && /^[a-f0-9]{20}$/u.test(record.scope)
    && positiveInteger(record.epoch)
    && [record.bootId, record.osSessionId].every(entry => typeof entry === "string" && entry.length > 0
      && entry.length <= 256 && !/[\x00-\x1f\x7f]/u.test(entry));
}
