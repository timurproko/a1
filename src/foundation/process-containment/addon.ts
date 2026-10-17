import { createRequire } from "node:module";
import { resolve } from "node:path";

export interface ProcessGuardianVersion {
  readonly crateVersion: string;
  readonly protocolVersion: 2;
  readonly target: string;
}

export interface ProcessGuardianRuntime {
  readonly pid: number;
  readonly startIdentity: string;
  readonly containmentProvider: string;
  readonly containmentToken: string;
  readonly processGroup: number | null;
  readonly foregroundGroup: number | null;
  wait(): Promise<number>;
  terminate(code: number): void;
  stop(): void;
  close(): void;
}

export interface SpawnContainedOptions {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly environment: Readonly<Record<string, string>>;
  readonly instanceId: string;
}

export interface ProcessGuardianAddon {
  version(): ProcessGuardianVersion;
  inspectProcessStart(pid: number): string | null;
  captureTerminalModes(): string;
  restoreTerminalModes(encoded: string): void;
  deliverExitNotice(path: string, encodedModes: string): void;
  spawnContained(options: SpawnContainedOptions): ProcessGuardianRuntime;
  spawnWatcher(options: { readonly executable: string; readonly arguments: readonly string[] }): number;
  waitForProcessExit(pid: number): Promise<void>;
  stopProcessGroup(processGroup: number): void;
  restoreForegroundGroup(processGroup: number): void;
  ignoreConsoleControl(): void;
}

const require = createRequire(import.meta.url);
const cache = new Map<string, ProcessGuardianAddon>();

/** Loads one verified Node-API guardian instance per exact addon path. */
export function loadProcessGuardianAddon(path: string): ProcessGuardianAddon {
  if (!path || path.includes("\0")) throw new TypeError("process guardian addon path is invalid");
  const exactPath = resolve(path);
  const cached = cache.get(exactPath);
  if (cached) return cached;

  let value: unknown;
  try {
    value = require(exactPath);
  } catch (error) {
    const code = errorCode(error) === "MODULE_NOT_FOUND" || errorCode(error) === "ENOENT"
      ? "CONTAINMENT_ARTIFACT_MISSING"
      : "CONTAINMENT_ARTIFACT_INCOMPATIBLE";
    throw diagnosticError(`process guardian addon could not be loaded: ${errorMessage(error)}`, code);
  }
  if (!isProcessGuardianAddon(value)) {
    throw diagnosticError("process guardian addon exports are incompatible", "CONTAINMENT_ARTIFACT_INCOMPATIBLE");
  }
  let report: ProcessGuardianVersion;
  try {
    report = value.version();
  } catch (error) {
    throw diagnosticError(`process guardian addon identity failed: ${errorMessage(error)}`, "CONTAINMENT_ARTIFACT_INCOMPATIBLE");
  }
  if (report.protocolVersion !== 2 || typeof report.crateVersion !== "string" || report.crateVersion.length === 0 || typeof report.target !== "string") {
    throw diagnosticError("process guardian addon protocol is incompatible", "CONTAINMENT_ARTIFACT_INCOMPATIBLE");
  }
  cache.set(exactPath, value);
  return value;
}

function isProcessGuardianAddon(value: unknown): value is ProcessGuardianAddon {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return [
    "version", "inspectProcessStart", "captureTerminalModes", "restoreTerminalModes",
    "deliverExitNotice", "spawnContained", "spawnWatcher", "waitForProcessExit",
    "stopProcessGroup", "restoreForegroundGroup", "ignoreConsoleControl",
  ].every(name => typeof candidate[name] === "function");
}

function diagnosticError(message: string, code: string): Error & { code: string } {
  return Object.assign(new Error(message), { code });
}

function errorCode(error: unknown): string | null {
  return error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : null;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
