import { execFile, type ChildProcess } from "node:child_process";

export interface AbortableExecFileOptions {
  readonly cwd: string;
  readonly signal: AbortSignal;
  readonly timeoutMs: number;
  readonly maxBufferBytes: number;
}

/**
 * Execute a UTF-8 subprocess without asking Node to abort an incompletely spawned child.
 *
 * Node's built-in `signal` path can call `ChildProcess.kill()` while `pid` is still undefined.
 * On POSIX that race can reach `kill(0, SIGTERM)` and terminate the caller's whole process group.
 */
export function executeAbortableFile(
  executable: string,
  arguments_: readonly string[],
  options: AbortableExecFileOptions,
): Promise<string | null> {
  if (options.signal.aborted) return Promise.resolve(null);
  return new Promise(resolvePromise => {
    let settled = false;
    let terminationRequested = false;
    let child: ChildProcess;
    let timer: NodeJS.Timeout | undefined;

    const finish = (stdout: string | null): void => {
      if (settled) return;
      settled = true;
      if (timer !== undefined) clearTimeout(timer);
      options.signal.removeEventListener("abort", requestTermination);
      resolvePromise(stdout);
    };
    const terminateSpawnedChild = (): void => {
      const pid = child.pid;
      if (!Number.isSafeInteger(pid) || (pid as number) <= 0) return;
      try { child.kill("SIGTERM"); } catch {}
    };
    const requestTermination = (): void => {
      terminationRequested = true;
      terminateSpawnedChild();
    };

    try {
      child = execFile(
        executable,
        [...arguments_],
        {
          cwd: options.cwd,
          windowsHide: true,
          maxBuffer: options.maxBufferBytes,
          encoding: "utf8",
        },
        (error, stdout) => finish(error === null && typeof stdout === "string" ? stdout : null),
      );
    } catch {
      finish(null);
      return;
    }
    child.once("spawn", () => { if (terminationRequested) terminateSpawnedChild(); });
    options.signal.addEventListener("abort", requestTermination, { once: true });
    timer = setTimeout(requestTermination, options.timeoutMs);
    timer.unref?.();
    if (options.signal.aborted) requestTermination();
  });
}
