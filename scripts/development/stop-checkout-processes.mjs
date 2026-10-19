#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { resolve, sep } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));

/**
 * The directories whose code a running A1 from this checkout keeps open: built JavaScript, the
 * native addon under `dist/`, and the `bin/` entry points. A process whose command line names one
 * of them belongs to this checkout, never to another worktree or an installed release.
 */
export function checkoutCodeRoots(root = repositoryRoot) {
  const roots = [resolve(root, "dist") + sep, resolve(root, "bin") + sep];
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

/**
 * Rationale: a local rebuild replaces `dist/`, and on Windows a running resident host keeps the
 * native addon locked, so `clean` fails with EPERM. A development checkout's own running A1 is
 * disposable test state; stop it before cleaning. CI and other checkouts are never touched.
 */
export function stopCheckoutProcesses({ root = repositoryRoot, environment = process.env } = {}) {
  if (environment.CI) return [];
  let processes;
  try {
    processes = listProcesses();
  } catch {
    return [];
  }
  const stopped = [];
  for (const { pid } of selectCheckoutProcesses(processes, root)) {
    try {
      process.kill(pid, "SIGKILL");
      stopped.push(pid);
    } catch {
      // Rationale: a process that already exited needs no stop.
    }
  }
  return stopped;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const stopped = stopCheckoutProcesses();
  if (stopped.length > 0) {
    process.stderr.write(`Stopped ${stopped.length} running A1 process(es) from this checkout before rebuilding.\n`);
  }
}
