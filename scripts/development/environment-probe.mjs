/** Dependency-free executable probes that preserve failure identity without exposing subprocess output. */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

export const PROBE_TIMEOUT_MS = 15000;

/** Resolve Windows shims with PATHEXT before spawning; Node does not resolve them like a shell. */
export function locateExecutable(command, { platform = process.platform, env = process.env, exists = existsSync } = {}) {
  const extensions = platform === "win32" ? (env.PATHEXT ?? ".EXE;.CMD;.BAT").split(";").filter(Boolean) : [""];
  for (const entry of (env.PATH ?? "").split(platform === "win32" ? ";" : ":").filter(Boolean)) {
    const directory = entry.replace(/^"|"$/gu, "");
    for (const extension of extensions) {
      const candidate = resolve(directory, `${command}${extension}`);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

/** Keep the existing deadline and fail closed for every unsuccessful or unparseable banner. */
export function probeVersion(command, { locate = locateExecutable, spawn = spawnSync } = {}) {
  const executable = locate(command);
  if (!executable) return { version: null, status: "missing" };
  const shell = /\.(?:cmd|bat)$/iu.test(executable);
  const options = { encoding: "utf8", windowsHide: true, timeout: PROBE_TIMEOUT_MS, shell };
  // Security: only literal internal command names and --version are passed; quote Windows shim paths.
  const result = shell ? spawn(`"${executable}" --version`, options) : spawn(executable, ["--version"], options);
  if (result.error) return { version: null, status: result.error.code === "ETIMEDOUT" ? "timeout" : "spawn-error", code: result.error.code };
  if (result.status !== 0) return { version: null, status: "exit", exitCode: result.status, signal: result.signal };
  const version = typeof result.stdout === "string" ? /(\d+\.\d+(?:\.\d+)?)/u.exec(result.stdout)?.[1] : null;
  return version ? { version, status: "ok" } : { version: null, status: "invalid-version" };
}

/** Diagnostics name only the operation and bounded machine result, never stdout, stderr, or environment. */
export function probeFailureDetail(command, result) {
  const operation = `${command} --version`;
  switch (result.status) {
    case "timeout": return `${operation} timed out after ${PROBE_TIMEOUT_MS}ms; the executable was found on PATH`;
    case "spawn-error": return `${operation} could not start (${safeCode(result.code)}); the executable was found on PATH`;
    case "exit": return `${operation} failed (${result.signal ? safeCode(result.signal) : `exit ${Number.isInteger(result.exitCode) ? result.exitCode : "unknown"}`}); the executable was found on PATH`;
    case "invalid-version": return `${operation} returned no recognizable version; the executable was found on PATH`;
    default: return null;
  }
}

function safeCode(value) {
  return typeof value === "string" && /^[A-Z][A-Z0-9_]{0,31}$/u.test(value) ? value : "unknown";
}
