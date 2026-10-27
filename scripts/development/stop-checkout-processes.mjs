#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { readFileSync, realpathSync } from "node:fs";
import { resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const developmentDirectory = JSON.parse(
  readFileSync(new URL("../../src/product-identity.json", import.meta.url), "utf8"),
).state.developmentDirectory;

/** How many list-and-terminate passes a stop makes before it reports survivors. */
export const STOP_PASS_LIMIT = 8;
/** The pause after a pass that terminated something, so restarts and handle release can settle. */
export const STOP_PASS_DELAY_MS = 500;

/**
 * Mirrors `resolveDevelopmentLaunchEnvironment`: every `./scripts/dev` launch of a checkout runs
 * its materialized release from `<tmp>/<developmentDirectory>/<checkoutId>/`.
 */
export function developmentCheckoutId(root = repositoryRoot) {
  let canonical = root;
  try {
    canonical = realpathSync(root);
  } catch {
    // Rationale: an unresolvable root still identifies the checkout by its spelled path.
  }
  return createHash("sha256").update(resolve(canonical).toLowerCase()).digest("hex").slice(0, 16);
}

/**
 * The directories whose code a running A1 from this checkout keeps open: built JavaScript, the
 * native addon under `dist/`, the `bin/` entry points, and the development copies `./scripts/dev`
 * launches from. A process whose command line names one of them belongs to this checkout, never to
 * another worktree or an installed release.
 */
export function checkoutCodeRoots(root = repositoryRoot) {
  const roots = [
    resolve(root, "dist") + sep,
    resolve(root, "bin") + sep,
    `${sep}${developmentDirectory}${sep}${developmentCheckoutId(root)}${sep}`,
  ];
  return [...new Set(roots.flatMap(value => [value, value.replaceAll("\\", "/")]))]
    .map(value => value.toLowerCase());
}

/** Selects processes running this checkout's code, excluding the current process. */
export function selectCheckoutProcesses(processes, root = repositoryRoot, self = process.pid) {
  const roots = checkoutCodeRoots(root);
  return processes.filter(({ pid, commandLine }) => {
    if (pid === self || typeof commandLine !== "string") return false;
    // Platform: Windows may report extended-length `\\?\` paths in command lines.
    const normalized = commandLine.replaceAll("\\\\?\\", "").toLowerCase();
    return roots.some(value => normalized.includes(value));
  });
}

function listProcesses() {
  if (process.platform === "win32") {
    const output = execFileSync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      "Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine | ConvertTo-Json -Compress",
    ], { encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024 });
    const parsed = JSON.parse(output || "[]");
    return (Array.isArray(parsed) ? parsed : [parsed])
      .map(entry => ({ pid: Number(entry.ProcessId), commandLine: entry.CommandLine }));
  }
  const output = execFileSync("ps", ["-eo", "pid=,args="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return output.split("\n").flatMap(line => {
    const match = /^\s*(\d+)\s+(.*)$/u.exec(line);
    return match ? [{ pid: Number(match[1]), commandLine: match[2] }] : [];
  });
}

function terminateProcess(pid) {
  process.kill(pid, "SIGKILL");
}

const defaultSleep = async durationMs => await new Promise(resolveDelay => setTimeout(resolveDelay, durationMs));

/**
 * Stops every process running this checkout's code and keeps going until none is left.
 *
 * Rationale: a local rebuild replaces `dist/`, and on Windows a running resident host keeps the
 * native addon locked, so `clean` fails with EPERM; a development launch that ends must not leave
 * its instance behind either. A development checkout's own running A1 is disposable test state.
 * Its resident roles restart one another (a holder requests a replacement server, the server
 * restarts holders), so one pass over a snapshot of pids does not converge: every pass lists
 * again and terminates what it finds until a pass finds nothing or the bound is reached. CI and
 * other checkouts are never touched.
 *
 * @returns {Promise<{ stopped: number[], survivors: number[] }>} the pids terminated across all
 * passes and the pids still running this checkout's code when the stop gave up.
 */
export async function stopCheckoutProcesses({
  root = repositoryRoot,
  environment = process.env,
  list = listProcesses,
  terminate = terminateProcess,
  sleep = defaultSleep,
  passLimit = STOP_PASS_LIMIT,
} = {}) {
  const stopped = new Set();
  if (environment.CI) return { stopped: [], survivors: [] };
  const remaining = () => {
    try {
      return selectCheckoutProcesses(list(), root).map(({ pid }) => pid);
    } catch {
      return null;
    }
  };
  for (let pass = 0; pass < passLimit; pass += 1) {
    const found = remaining();
    if (found === null) return { stopped: [...stopped], survivors: [] };
    if (found.length === 0) return { stopped: [...stopped], survivors: [] };
    for (const pid of found) {
      try {
        terminate(pid);
        stopped.add(pid);
      } catch {
        // Rationale: a process that already exited needs no stop; a refusal shows up as a survivor.
      }
    }
    await sleep(STOP_PASS_DELAY_MS);
  }
  return { stopped: [...stopped], survivors: remaining() ?? [] };
}

/** The one line a caller prints when a stop did not converge; nothing when it did. */
export function describeSurvivors(survivors) {
  if (survivors.length === 0) return "";
  return `A1 process(es) from this checkout are still running after the stop: ${survivors.join(", ")}.\n`;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const { survivors } = await stopCheckoutProcesses();
  process.stderr.write(describeSurvivors(survivors));
  if (survivors.length > 0) process.exitCode = 1;
}
