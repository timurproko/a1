import { spawn } from "node:child_process";
import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { resolveTerminalHostPath } from "./ensure-terminal-host.js";
import { verifyTerminalHostArtifact } from "./terminal-host-artifact.js";

export interface ResidentReleaseHoldReport {
  /** False when any resident record or identity could not be verified; callers then keep every release. */
  readonly complete: boolean;
  readonly releaseRoots: readonly string[];
  readonly uncertain: readonly string[];
}

export interface ResidentReleaseHoldOptions {
  readonly dataDir: string;
  /** Installed release roots whose terminal host may answer, in preference order. */
  readonly releaseRoots: readonly string[];
  readonly platform?: NodeJS.Platform;
  readonly architecture?: string;
  readonly timeoutMs?: number;
  readonly verify?: (executable: string, platform: NodeJS.Platform, architecture: string) => Promise<unknown>;
  readonly run?: (executable: string, arguments_: readonly string[], timeoutMs: number) => Promise<{ readonly code: number; readonly stdout: string }>;
}

const COMPLETE_EMPTY: ResidentReleaseHoldReport = Object.freeze({ complete: true, releaseRoots: Object.freeze([]), uncertain: Object.freeze([]) });

/**
 * Reports the releases that live resident processes run from, read-only. The verified terminal
 * host inspects its own records, so pid reuse and identity formats are judged exactly as the
 * server judges them. No records means nothing to hold; any doubt yields an incomplete report.
 */
export async function readResidentReleaseHolds(options: ResidentReleaseHoldOptions): Promise<ResidentReleaseHoldReport> {
  if (!await hasResidentRecords(options.dataDir)) return COMPLETE_EMPTY;
  const platform = options.platform ?? process.platform;
  const architecture = options.architecture ?? process.arch;
  const verify = options.verify ?? verifyTerminalHostArtifact;
  let executable: string | undefined;
  for (const root of options.releaseRoots) {
    const candidate = resolveTerminalHostPath(root, {}, platform, architecture);
    try {
      await verify(candidate, platform, architecture);
      executable = candidate;
      break;
    } catch {
      // Rationale: an older release may predate the packaged host; another retained release may still carry it.
    }
  }
  if (!executable) return incomplete("no verified terminal host is installed to inspect resident records");
  try {
    const result = await (options.run ?? runHost)(executable, ["release-holds", "--data-dir", options.dataDir], options.timeoutMs ?? 5_000);
    const report = JSON.parse(result.stdout.trim().split(/\r?\n/u).at(-1) ?? "") as Record<string, unknown>;
    if (result.code !== 0 || report.schema !== "a1-resident-release-holds-v1" || typeof report.complete !== "boolean"
      || !isStringArray(report.releaseRoots) || !isStringArray(report.uncertain)) {
      return incomplete("terminal host returned no valid release-hold report");
    }
    return { complete: report.complete, releaseRoots: report.releaseRoots, uncertain: report.uncertain };
  } catch {
    return incomplete("terminal host release-hold inspection failed");
  }
}

async function hasResidentRecords(dataDir: string): Promise<boolean> {
  let profiles: string[];
  try {
    profiles = await readdir(resolve(dataDir, "tabs"));
  } catch (error) {
    return !(error instanceof Error && "code" in error && error.code === "ENOENT");
  }
  for (const profile of profiles) {
    for (const record of ["server.json", "registry.json"]) {
      try {
        await stat(resolve(dataDir, "tabs", profile, record));
        return true;
      } catch (error) {
        if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) return true;
      }
    }
  }
  return false;
}

function incomplete(reason: string): ResidentReleaseHoldReport {
  return { complete: false, releaseRoots: [], uncertain: [reason] };
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === "string");
}

async function runHost(executable: string, arguments_: readonly string[], timeoutMs: number): Promise<{ code: number; stdout: string }> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...arguments_], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    const stdout: Buffer[] = [];
    let size = 0;
    child.stdout.on("data", chunk => {
      size += chunk.length;
      // Security: the report is small; an oversized answer is treated as a failed inspection.
      if (size > 1024 * 1024) child.kill("SIGKILL");
      else stdout.push(Buffer.from(chunk));
    });
    child.once("error", rejectPromise);
    child.once("close", code => { clearTimeout(timer); resolvePromise({ code: code ?? 1, stdout: Buffer.concat(stdout).toString("utf8") }); });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error("terminal host release-hold inspection timed out"));
    }, timeoutMs);
    timer.unref();
  });
}
