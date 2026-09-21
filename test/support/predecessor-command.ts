import crossSpawn from "cross-spawn";
import { spawn, type ChildProcess } from "node:child_process";
import { performance } from "node:perf_hooks";

export const PREDECESSOR_OUTPUT_LIMIT = 1024 * 1024;
const CLEANUP_LIMIT = 120_000;

export interface PredecessorCommand {
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly cwd: string;
  readonly phase: string;
  readonly version?: string;
  readonly signal?: AbortSignal;
  readonly environment?: NodeJS.ProcessEnv;
}

export interface PredecessorCommandEvidence {
  readonly phase: string;
  readonly version: string | null;
  readonly executable: "node" | "npm" | "other";
  readonly durationMs: number;
  readonly stdoutBytes: number;
  readonly stderrBytes: number;
  readonly exitCode: number | null;
  readonly signal: string | null;
  readonly error: string | null;
  readonly cleanupError: string | null;
  /** Set only by fixture-owned root removal, which reports how many roots a cleanup step had to remove. */
  readonly roots?: number;
}

/** Contains only bounded metadata; captured command output is never copied into an error. */
export class PredecessorCommandError extends Error {
  readonly evidence: PredecessorCommandEvidence;
  constructor(evidence: PredecessorCommandEvidence) {
    super(`predecessor command failed: ${JSON.stringify(evidence)}`);
    this.evidence = evidence;
    this.name = "PredecessorCommandError";
  }
}

/** Preserves the fixture's protection against npm redirecting installation into the user's real prefix. */
export function predecessorEnvironment(environment: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(environment).filter(([key]) => !key.toLowerCase().startsWith("npm_config_")));
}

/** Waits without blocking runner RPC, bounds captured bytes, and closes the owned process before settlement. */
export async function runPredecessorCommand(command: PredecessorCommand): Promise<{
  stdout: string; stderr: string; evidence: PredecessorCommandEvidence;
}> {
  const startedAt = performance.now();
  const phase = boundedLabel(command.phase);
  const version = command.version === undefined ? null : boundedLabel(command.version);
  const executable = command.executable === process.execPath ? "node" : /(?:^|[/\\])npm(?:\.cmd)?$/i.test(command.executable) ? "npm" : "other";
  let stdoutBytes = 0;
  let stderrBytes = 0;
  let error: string | null = null;
  let cleanupError: string | null = null;
  const evidence = (exitCode: number | null, signal: string | null): PredecessorCommandEvidence => ({
    phase, version, executable, durationMs: Math.round(performance.now() - startedAt), stdoutBytes, stderrBytes,
    exitCode, signal, error, cleanupError,
  });
  if (command.signal?.aborted) { error = "ABORTED"; throw new PredecessorCommandError(evidence(null, null)); }

  return await new Promise((resolve, reject) => {
    let child: ChildProcess;
    try {
      child = crossSpawn(command.executable, [...command.arguments], {
        cwd: command.cwd, env: predecessorEnvironment(command.environment), shell: false, windowsHide: true,
        // Security: POSIX children belong to a new process group; Windows uses the live child handle and taskkill /T.
        detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (caught) {
      error = errorIdentity(caught); reject(new PredecessorCommandError(evidence(null, null))); return;
    }
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let settled = false;
    let stopping: Promise<void> | undefined;
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined;
    const cleanupController = new AbortController();
    const removeListeners = () => {
      if (cleanupTimer) clearTimeout(cleanupTimer);
      command.signal?.removeEventListener("abort", onAbort);
      child.stdout?.off("data", onStdout);
      child.stderr?.off("data", onStderr);
      child.stdout?.off("error", onStreamError);
      child.stderr?.off("error", onStreamError);
      child.off("error", onError);
      child.off("close", onClose);
    };
    const failCleanup = (code: string) => {
      if (settled) return;
      settled = true; cleanupError = code;
      cleanupController.abort();
      removeListeners();
      // Invariant: never keep the runner alive on unverified inherited pipes, or claim cleanup succeeded.
      child.stdout?.destroy(); child.stderr?.destroy(); child.unref();
      reject(new PredecessorCommandError(evidence(child.exitCode, child.signalCode)));
    };
    const stop = () => {
      if (stopping || settled) return;
      cleanupTimer = setTimeout(() => failCleanup("CLEANUP_TIMEOUT"), CLEANUP_LIMIT);
      stopping = stopOwnedTree(child, cleanupController.signal).catch(() => { failCleanup("CLEANUP_FAILED"); });
    };
    const collect = (chunk: Buffer, target: Buffer[], stream: "stdout" | "stderr") => {
      if (stream === "stdout") stdoutBytes += chunk.length; else stderrBytes += chunk.length;
      if (stdoutBytes + stderrBytes > PREDECESSOR_OUTPUT_LIMIT) {
        error ??= "OUTPUT_LIMIT"; stop(); return;
      }
      target.push(chunk);
    };
    const onStdout = (chunk: Buffer) => collect(chunk, stdout, "stdout");
    const onStderr = (chunk: Buffer) => collect(chunk, stderr, "stderr");
    const onError = (caught: Error) => { error ??= errorIdentity(caught); };
    const onStreamError = (caught: Error) => { error ??= errorIdentity(caught); stop(); };
    const onAbort = () => { error ??= "ABORTED"; stop(); };
    const onClose = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      void (async () => {
        await stopping;
        if (settled) return;
        settled = true; removeListeners();
        if (signal) error ??= "SIGNAL";
        if (exitCode !== 0) error ??= "EXIT";
        const record = evidence(exitCode, signal);
        if (error) reject(new PredecessorCommandError(record));
        else resolve({ stdout: Buffer.concat(stdout).toString("utf8"), stderr: Buffer.concat(stderr).toString("utf8"), evidence: record });
      })();
    };
    child.stdout!.on("data", onStdout);
    child.stderr!.on("data", onStderr);
    child.stdout!.on("error", onStreamError);
    child.stderr!.on("error", onStreamError);
    child.once("error", onError);
    child.once("close", onClose);
    command.signal?.addEventListener("abort", onAbort, { once: true });
    if (command.signal?.aborted) onAbort();
  });
}

async function stopOwnedTree(child: ChildProcess, signal: AbortSignal): Promise<void> {
  if (child.pid === undefined) return; // Invariant: a failed spawn has no process to terminate; its close event still settles the result.
  // Security: do not target a retired PID or infer descendant cleanup from output closure alone.
  if (child.exitCode !== null || child.signalCode !== null) throw new Error("root ownership no longer live");
  if (process.platform !== "win32") {
    try { process.kill(-child.pid, "SIGKILL"); } catch (caught) {
      if (errorIdentity(caught) !== "ESRCH") throw caught;
    }
    return;
  }
  await new Promise<void>((resolve, reject) => {
    // Security: accept only the ChildProcess created above, while its native root handle remains live.
    const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    const abort = () => { killer.kill("SIGKILL"); };
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    killer.once("error", caught => { signal.removeEventListener("abort", abort); reject(caught); });
    killer.once("close", code => {
      signal.removeEventListener("abort", abort);
      if (code === 0) resolve(); else reject(new Error("owned tree termination failed"));
    });
  });
}

function boundedLabel(value: string): string {
  if (!/^[A-Za-z0-9_.+-]{1,128}$/.test(value)) throw new Error("invalid predecessor diagnostic label");
  return value;
}

function errorIdentity(value: unknown): string {
  const code = value && typeof value === "object" && "code" in value ? value.code : null;
  return typeof code === "string" && /^[A-Z0-9_]{1,64}$/.test(code) ? code : "SPAWN";
}
