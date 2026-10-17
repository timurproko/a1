import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { runBoundedHostCommand } from "./bounded-host-command.js";
import { resolveTerminalHostEntryPath, resolveTerminalHostPath, type TerminalHostCommand } from "./ensure-terminal-host.js";
import { verifyTerminalHostArtifact } from "./terminal-host-artifact.js";

export type MaintenanceAction = "list" | "stop" | "stop-all" | "host-status" | "host-stop";

export type MaintenanceHostState = "none" | "running" | "stopped" | "unresponsive" | "incompatible" | "refused" | "unverifiable" | "unavailable";

/** The versioned `a1 tabs` report: `a1-tabs-maintenance-v1`, as printed by the terminal host. */
export interface MaintenanceReport {
  readonly schema: "a1-tabs-maintenance-v1";
  readonly command: string;
  readonly host: MaintenanceHostState;
  readonly stateDir?: string;
  readonly result?: Record<string, unknown>;
  readonly pid?: number;
  readonly message?: string;
  readonly releaseRoot?: string | null;
  readonly terminatedUnresponsive?: number;
  /** The terminal host's exit status: 0 success, 3 refused or failed, 4 another generation. */
  readonly exitCode: number;
}

export interface MaintenanceOptions {
  readonly action: MaintenanceAction;
  readonly tabId?: string;
  readonly profileRoot: string;
  readonly dataDir: string;
  readonly runtimeDir: string;
  /** Installed release roots whose verified terminal host may run maintenance, in preference order. */
  readonly releaseRoots: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly timeoutMs?: number;
  readonly verify?: (addon: string, platform: NodeJS.Platform, architecture: string) => Promise<unknown>;
  readonly run?: (command: TerminalHostCommand, arguments_: readonly string[], timeoutMs: number) => Promise<{ readonly code: number; readonly stdout: string }>;
}

const INCOMPATIBLE_EXIT = 4;

/**
 * Runs one maintenance form through a verified terminal host. When the running host speaks
 * another protocol generation, it retries once with the addon from the release that host
 * recorded, after verifying that release's manifest; it never loads an unverified addon.
 */
export async function runTerminalHostMaintenance(options: MaintenanceOptions): Promise<MaintenanceReport> {
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  const command = await firstVerifiedHost(options, options.releaseRoots, platform, architecture);
  if (command === undefined) return unavailable(options.action, "no verified terminal host is installed");
  const report = await invoke(options, command);
  if (report.exitCode !== INCOMPATIBLE_EXIT || typeof report.releaseRoot !== "string") return report;
  const cohort = await firstVerifiedHost({ ...options, environment: {} }, [report.releaseRoot], platform, architecture);
  if (cohort === undefined || cohort.entry === command.entry) {
    return { ...report, message: "the running tabs use another version whose terminal host cannot be verified" };
  }
  return await invoke({ ...options, environment: installedEnvironment(options.environment) }, cohort);
}

function arguments_(options: MaintenanceOptions): string[] {
  const command = options.action === "stop" ? ["stop", options.tabId ?? ""] : [options.action];
  return ["tabs", ...command, "--profile", options.profileRoot, "--data-dir", options.dataDir, "--runtime-dir", options.runtimeDir];
}

async function invoke(options: MaintenanceOptions, command: TerminalHostCommand): Promise<MaintenanceReport> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  try {
    const run = options.run ?? ((host: TerminalHostCommand, argumentsValue: readonly string[], limit: number) =>
      runHost(host, argumentsValue, limit, options.environment));
    const result = await run(command, arguments_(options), timeoutMs);
    const line = result.stdout.trim().split(/\r?\n/u).at(-1) ?? "";
    const parsed = JSON.parse(line) as Record<string, unknown>;
    if (parsed.schema !== "a1-tabs-maintenance-v1" || typeof parsed.host !== "string") throw new Error("malformed maintenance report");
    return { ...(parsed as unknown as MaintenanceReport), exitCode: result.code };
  } catch (error) {
    return unavailable(options.action, `terminal host maintenance failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function firstVerifiedHost(
  options: Pick<MaintenanceOptions, "environment" | "verify">,
  roots: readonly string[],
  platform: NodeJS.Platform,
  architecture: string,
): Promise<TerminalHostCommand | undefined> {
  const override = options.environment[PRODUCT_IDENTITY.environment.developmentInstanceId]
    ? options.environment[PRODUCT_IDENTITY.environment.terminalHostPath]?.trim()
    : undefined;
  if (override) {
    const entry = roots[0] === undefined ? undefined : resolveTerminalHostEntryPath(roots[0]);
    if (entry === undefined) return undefined;
    try {
      await Promise.all([access(override, constants.R_OK), access(entry, constants.R_OK)]);
      return { executable: process.execPath, entry };
    } catch {
      return undefined;
    }
  }
  for (const root of roots) {
    const addon = resolveTerminalHostPath(root, {}, platform, architecture);
    try {
      await (options.verify ?? verifyTerminalHostArtifact)(addon, platform, architecture);
      return { executable: process.execPath, entry: resolveTerminalHostEntryPath(root) };
    } catch {
      // Rationale: an older retained release may predate the packaged host; try the next one.
    }
  }
  return undefined;
}

function installedEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const sanitized = { ...environment };
  delete sanitized[PRODUCT_IDENTITY.environment.developmentInstanceId];
  delete sanitized[PRODUCT_IDENTITY.environment.terminalHostPath];
  return sanitized;
}

function unavailable(action: MaintenanceAction, message: string): MaintenanceReport {
  return { schema: "a1-tabs-maintenance-v1", command: action, host: "unavailable", message, exitCode: 3 };
}

/** The largest maintenance report accepted from the terminal host. */
export const MAX_MAINTENANCE_REPORT_BYTES = 4 * 1024 * 1024;

async function runHost(command: TerminalHostCommand, arguments_: readonly string[], timeoutMs: number, environment: NodeJS.ProcessEnv): Promise<{ code: number; stdout: string }> {
  return await runBoundedHostCommand(command, arguments_, {
    environment,
    maxStdoutBytes: MAX_MAINTENANCE_REPORT_BYTES,
    timeoutMs,
    label: "terminal host maintenance",
  });
}
