import { spawn } from "node:child_process";

export interface BoundedHostCommandResult {
  readonly code: number;
  readonly stdout: string;
}

export interface BoundedHostCommandLimits {
  /** Output beyond this many bytes fails the exchange instead of being parsed. */
  readonly maxStdoutBytes: number;
  readonly timeoutMs: number;
  /** Names the exchange in the timeout error. */
  readonly label: string;
}

/**
 * Runs one terminal-host command whose report is small. An oversized report kills the command and
 * reports a failed exchange; a command that outlives its deadline is killed and rejected.
 */
export async function runBoundedHostCommand(
  executable: string,
  arguments_: readonly string[],
  limits: BoundedHostCommandLimits,
): Promise<BoundedHostCommandResult> {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(executable, [...arguments_], { windowsHide: true, stdio: ["ignore", "pipe", "ignore"] });
    const stdout: Buffer[] = [];
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
      resolvePromise(overflowed
        ? { code: code === 0 || code === null ? 1 : code, stdout: "" }
        : { code: code ?? 1, stdout: Buffer.concat(stdout).toString("utf8") });
    });
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      rejectPromise(new Error(`${limits.label} timed out`));
    }, limits.timeoutMs);
    timer.unref();
  });
}
