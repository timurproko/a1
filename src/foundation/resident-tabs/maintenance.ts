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
  /** The first root is the invoking release; other roots never substitute for it. */
  readonly releaseRoots: readonly string[];
  readonly environment: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly timeoutMs?: number;
  readonly verify?: (addon: string, platform: NodeJS.Platform, architecture: string) => Promise<unknown>;
  readonly run?: (command: TerminalHostCommand, arguments_: readonly string[], timeoutMs: number) => Promise<{ readonly code: number; readonly stdout: string }>;
}

/** Runs maintenance only through the invoking release; another cohort is never a retry target. */
export async function runTerminalHostMaintenance(options: MaintenanceOptions): Promise<MaintenanceReport> {
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  const command = await firstVerifiedHost(options, options.releaseRoots.slice(0, 1), platform, architecture);
  if (command === undefined) return unavailable(options.action, "the invoking release has no verified terminal host");
  return await invoke(options, command);
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
      // Invariant: a missing or altered invoking artifact fails closed.
    }
  }
  return undefined;
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
