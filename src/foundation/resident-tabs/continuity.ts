import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { RUNTIME_CONTROL_API } from "./runtime-control.js";
import { runBoundedHostCommand } from "./bounded-host-command.js";
import { resolveTerminalHostEntryPath, resolveTerminalHostPath } from "./ensure-terminal-host.js";
import { verifyTerminalHostArtifact } from "./terminal-host-artifact.js";

export interface ContinuityOptions {
  readonly releaseRoot: string;
  readonly dataDir: string;
  readonly profileRoot: string;
  readonly runtimeDir: string;
  readonly environment: NodeJS.ProcessEnv;
  readonly inspect?: (options: Omit<ContinuityOptions, "inspect">) => Promise<string>;
}

/** Activation authority requires a stable authenticated source-contract set, never an idle Agent. */
export async function assertResidentContinuity(options: ContinuityOptions): Promise<void> {
  const { inspect = inspectResidentContinuity, ...context } = options;
  const first = await inspect(context);
  const second = await inspect(context);
  if (first !== second && second !== await inspect(context)) {
    throw new Error("Resident workspace changed during update readiness");
  }
}

/** Native inspection/import is read-only toward execution and never starts or stops a source. */
export async function inspectResidentContinuity(options: Omit<ContinuityOptions, "inspect">): Promise<string> {
  let hasRecords = false;
  for (const directory of ["tabs", "resident-workspaces"]) {
    try { hasRecords ||= (await readdir(resolve(options.dataDir, directory))).length > 0; }
    catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
        throw new Error("Resident workspace discovery is unavailable; update activation was refused.");
      }
    }
  }
  if (!hasRecords) return "empty";
  const manifest = JSON.parse(await readFile(resolve(options.releaseRoot, "package.json"), "utf8")) as { residentControlContracts?: unknown };
  const contracts = manifest.residentControlContracts;
  if (!Array.isArray(contracts)
    || ![RUNTIME_CONTROL_API, "resident-workspace-v1"].every(contract => contracts.includes(contract))) {
    throw new Error("Candidate does not preserve the stable resident control and workspace contracts; activation was refused.");
  }
  const addon = resolveTerminalHostPath(options.releaseRoot, {}, process.platform, process.arch);
  await verifyTerminalHostArtifact(addon, process.platform, process.arch);
  const result = await runBoundedHostCommand({ executable: process.execPath, entry: resolveTerminalHostEntryPath(options.releaseRoot) }, [
    "workspace-check", "--profile", options.profileRoot,
    "--data-dir", options.dataDir, "--runtime-dir", options.runtimeDir,
  ], { label: "resident continuity check", maxStdoutBytes: 4096, timeoutMs: 8_000, environment: options.environment });
  const unverified = new Error(continuityFailure(result.stderr));
  let report: Record<string, unknown>;
  try { report = JSON.parse(result.stdout.trim()) as Record<string, unknown>; }
  catch { throw unverified; }
  if (result.code !== 0 || report.schema !== "resident-workspace-check-v1" || report.compatible !== true
    || typeof report.fingerprint !== "string" || !/^[a-f0-9]{64}$/u.test(report.fingerprint)) {
    throw unverified;
  }
  return report.fingerprint;
}

/** Names the native reason when the host reported one, without the host's own prefix. */
function continuityFailure(diagnostic: string): string {
  const reason = diagnostic.replace(/^a1-terminal-host:\s*/u, "").replace(/[.\s]+$/u, "");
  return reason.length > 0
    ? `Resident control compatibility could not be verified: ${reason}`
    : "Resident control compatibility could not be verified";
}
