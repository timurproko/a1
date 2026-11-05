import { spawn } from "node:child_process";
import type { TerminalHostCommand } from "./ensure-terminal-host.js";

export interface BoundedHostCommandResult {
  readonly code: number;
  readonly stdout: string;
  /** The command's last diagnostic line, bounded and stripped of control characters; never parsed. */
  readonly stderr: string;
}

/** Diagnostics beyond this many bytes are dropped rather than buffered. */
const MAX_STDERR_BYTES = 4096;

export interface BoundedHostCommandLimits {
  /** Output beyond this many bytes fails the exchange instead of being parsed. */
  readonly maxStdoutBytes: number;
  readonly timeoutMs: number;
  /** Names the exchange in the timeout error. */
  readonly label: string;
  readonly environment?: NodeJS.ProcessEnv;
}

/**
 * Runs one terminal-host command whose report is small. An oversized report kills the command and
 * reports a failed exchange; a command that outlives its deadline is killed and rejected.
 */
export async function runBoundedHostCommand(
  command: TerminalHostCommand,
  arguments_: readonly string[],
  limits: BoundedHostCommandLimits,
): Promise<BoundedHostCommandResult> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command.executable, [command.entry, ...arguments_], {
      env: limits.environment,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];
    let stderrSize = 0;
    child.stderr.on("data", (chunk: Buffer) => {
      if (stderrSize >= MAX_STDERR_BYTES) return;
      const kept = chunk.subarray(0, MAX_STDERR_BYTES - stderrSize);
      stderrSize += kept.length;
      stderr.push(Buffer.from(kept));
    });
    let size = 0;
    let overflowed = false;
    child.stdout.on("data", chunk => {
      size += chunk.length;
      // Security: an oversized answer is a failed exchange, never a truncated report to parse.
      if (size > limits.maxStdoutBytes) {
        overflowed = true;
        child.kill("SIGKILL");
      } else stdout.push(Buffer.from(chunk));
    });
    child.once("error", rejectPromise);
    child.once("close", code => {
      clearTimeout(timer);
      const diagnostic = lastDiagnosticLine(Buffer.concat(stderr).toString("utf8"));
      resolvePromise(overflowed
        ? { code: code === 0 || code === null ? 1 : code, stdout: "", stderr: diagnostic }
        : { code: code ?? 1, stdout: Buffer.concat(stdout).toString("utf8"), stderr: diagnostic });
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error(`${limits.label} timed out`));
    }, limits.timeoutMs);
    timer.unref();
  });
}

/** Keeps one terminal-safe line: the native host reports its reason last. */
function lastDiagnosticLine(text: string): string {
  const lines = text.split(/\r?\n/u)
    // Security: diagnostics never carry terminal controls into a later message.
    .map(line => line
      .replace(/\u001b\[[0-?]*[ -/]*[@-~]/gu, "")
      .replace(/[\u0000-\u001f\u007f-\u009f]/gu, "")
      .trim())
    .filter(line => line.length > 0);
  return (lines.at(-1) ?? "").slice(0, 300);
}
