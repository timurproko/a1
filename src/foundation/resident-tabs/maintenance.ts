import { spawn } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import { PRODUCT_IDENTITY } from "../../product-identity.js";
import { resolveTerminalHostPath } from "./ensure-terminal-host.js";
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
  readonly verify?: (executable: string, platform: NodeJS.Platform, architecture: string) => Promise<unknown>;
  readonly run?: (executable: string, arguments_: readonly string[], timeoutMs: number) => Promise<{ readonly code: number; readonly stdout: string }>;
}

const INCOMPATIBLE_EXIT = 4;

/**
 * Runs one maintenance form through a verified terminal host. When the running host speaks
 * another protocol generation, it retries once with the binary from the release that host
 * recorded, after verifying that release's manifest; it never runs an unverified binary.
 */
export async function runTerminalHostMaintenance(options: MaintenanceOptions): Promise<MaintenanceReport> {
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  const executable = await firstVerifiedHost(options, options.releaseRoots, platform, architecture);
  if (executable === undefined) return unavailable(options.action, "no verified terminal host is installed");
  const report = await invoke(options, executable);
  if (report.exitCode !== INCOMPATIBLE_EXIT || typeof report.releaseRoot !== "string") return report;
  const cohort = await firstVerifiedHost({ ...options, environment: {} }, [report.releaseRoot], platform, architecture);
  if (cohort === undefined || cohort === executable) {
    return { ...report, message: "the running tabs use another version whose terminal host cannot be verified" };
  }
  return await invoke(options, cohort);
}

function arguments_(options: MaintenanceOptions): string[] {
  const command = options.action === "stop" ? ["stop", options.tabId ?? ""] : [options.action];
  return ["tabs", ...command, "--profile", options.profileRoot, "--data-dir", options.dataDir, "--runtime-dir", options.runtimeDir];
}

async function invoke(options: MaintenanceOptions, executable: string): Promise<MaintenanceReport> {
  const timeoutMs = options.timeoutMs ?? 120_000;
  try {
    const result = await (options.run ?? runHost)(executable, arguments_(options), timeoutMs);
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
): Promise<string | undefined> {
  const override = options.environment[PRODUCT_IDENTITY.environment.developmentInstanceId]
    ? options.environment[PRODUCT_IDENTITY.environment.terminalHostPath]?.trim()
    : undefined;
  if (override) {
    try {
      await access(override, constants.R_OK | (platform === "win32" ? 0 : constants.X_OK));
      return override;
    } catch {
      return undefined;
    }
  }
  for (const root of roots) {
    const candidate = resolveTerminalHostPath(root, {}, platform, architecture);
    try {
      await (options.verify ?? verifyTerminalHostArtifact)(candidate, platform, architecture);
      return candidate;
    } catch {
      // Rationale: an older retained release may predate the packaged host; try the next one.
    }
  }
  return undefined;
}

function unavailable(action: MaintenanceAction, message: string): MaintenanceReport {
  return { schema: "a1-tabs-maintenance-v1", command: action, host: "unavailable", message, exitCode: 3 };
}

async function runHost(executable: string, arguments_: readonly string[], timeoutMs: number): Promise<{ code: number; stdout: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...arguments_], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    const stdout: Buffer[] = [];
    let size = 0;
    child.stdout.on("data", chunk => {
      size += chunk.length;
      // Security: maintenance reports are small; an oversized answer is a failed exchange.
      if (size > 4 * 1024 * 1024) child.kill("SIGKILL");
      else stdout.push(Buffer.from(chunk));
    });
    child.once("error", rejectPromise);
    child.once("close", code => { clearTimeout(timer); resolvePromise({ code: code ?? 1, stdout: Buffer.concat(stdout).toString("utf8") }); });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error("terminal host maintenance timed out"));
    }, timeoutMs);
    timer.unref();
  });
}
