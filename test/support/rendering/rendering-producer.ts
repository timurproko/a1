import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { TimedTerminalWrite } from "./terminal-paint-evidence.js";

export type RenderingProducerId = "bare-a1" | "a1-pi" | "pinned-pi";
export type RenderingMode = "regular" | "fullscreen";

export interface RenderingProducerRequest {
  readonly producer: RenderingProducerId;
  readonly mode: RenderingMode;
  readonly workloadId: string;
  readonly state: {
    readonly profileId: "a1" | "pi";
    readonly cwd: string;
    readonly theme: "dark";
    readonly columns: number;
    readonly rows: number;
    readonly synchronizedUpdates: boolean;
  };
  readonly testBehavior?: "run" | "fail" | "hang" | "startup-hang";
}

export interface RenderingProducerCheckpoint {
  readonly name: string;
  readonly atMs: number;
  readonly writeEnd: number;
  readonly columns: number;
  readonly rows: number;
  readonly transcript: readonly { readonly kind: string; readonly status: string; readonly text: string }[];
  readonly damageDecision?: {
    readonly frameId: number | null;
    readonly transformed: boolean;
    readonly reason: string;
    readonly shiftRows: number;
    readonly paintedRows: readonly number[];
  };
  readonly viewport?: {
    readonly frameId: number;
    readonly transcript: { readonly rowStart: number; readonly rowEnd: number } | null;
    readonly dock: { readonly rowStart: number; readonly rowEnd: number } | null;
    readonly followingEnd: boolean;
    readonly verticalShiftRows: number;
    readonly safeVerticalShift: boolean;
    readonly cause: string;
  };
}

export interface RenderingProducerResult {
  readonly producer: RenderingProducerId;
  readonly processId: number;
  readonly effectiveMode: RenderingMode;
  readonly state: RenderingProducerRequest["state"];
  readonly writes: readonly TimedTerminalWrite[];
  readonly checkpoints: readonly RenderingProducerCheckpoint[];
  readonly timings?: { readonly startupMs: number; readonly completionMs: number };
}

export interface RenderingProducerDiagnostics {
  readonly phase: "startup" | "completion" | "spawn" | "output" | "protocol";
  readonly elapsedMs: number;
  readonly stderr: string;
}

export class RenderingProducerError extends Error {
  constructor(
    message: string,
    readonly kind: "spawn" | "timeout" | "exit" | "output" | "protocol",
    readonly diagnostics?: RenderingProducerDiagnostics,
  ) {
    super(message);
    this.name = "RenderingProducerError";
  }
}

export interface RenderingProducerOptions {
  readonly startupTimeoutMs?: number;
  readonly completionTimeoutMs?: number;
  /** Compatibility alias for completionTimeoutMs in focused timeout tests. */
  readonly timeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly onSpawn?: (processId: number) => void;
}

const DEFAULT_STARTUP_TIMEOUT_MS = 60_000;
const DEFAULT_COMPLETION_TIMEOUT_MS = 60_000;

/** Runs one producer behind a readiness protocol and always terminates its complete process tree on failure. */
export async function runRenderingProducer(
  request: RenderingProducerRequest,
  options: RenderingProducerOptions = {},
): Promise<RenderingProducerResult> {
  const startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_STARTUP_TIMEOUT_MS;
  const completionTimeoutMs = options.completionTimeoutMs ?? options.timeoutMs ?? DEFAULT_COMPLETION_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? 2 * 1024 * 1024;
  assertPositiveInteger(startupTimeoutMs, "producer startup timeout");
  assertPositiveInteger(completionTimeoutMs, "producer completion timeout");
  assertPositiveInteger(maxOutputBytes, "producer output bound");

  const startedAt = Date.now();
  const worker = fileURLToPath(new URL("./rendering-producer-worker.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", worker], {
    cwd: request.state.cwd,
    env: { ...process.env, PI_OFFLINE: "1", NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe", "ipc"],
    windowsHide: true,
  });
  if (child.pid !== undefined) options.onSpawn?.(child.pid);

  let stdout = "";
  let stderr = "";
  let readyAt: number | undefined;
  let terminalFailure: RenderingProducerError | undefined;
  let completionTimer: ReturnType<typeof setTimeout> | undefined;
  let termination: Promise<void> | undefined;
  const terminate = (): Promise<void> => termination ??= terminateProcessTree(child);
  const diagnostics = (phase: RenderingProducerDiagnostics["phase"]): RenderingProducerDiagnostics => ({
    phase,
    elapsedMs: Math.max(0, Date.now() - startedAt),
    stderr: truncateDiagnostic(stderr),
  });
  const append = (current: string, chunk: string, stream: "stdout" | "stderr"): string => {
    const next = current + chunk;
    if (Buffer.byteLength(next) > maxOutputBytes && terminalFailure === undefined) {
      terminalFailure = new RenderingProducerError(
        `${request.producer} ${stream} exceeds ${maxOutputBytes} bytes`,
        "output",
        diagnostics("output"),
      );
      void terminate();
    }
    return Buffer.from(next).subarray(0, maxOutputBytes + 1).toString("utf8");
  };
  child.stdout!.setEncoding("utf8");
  child.stderr!.setEncoding("utf8");
  child.stdout!.on("data", (chunk: string) => { stdout = append(stdout, chunk, "stdout"); });
  child.stderr!.on("data", (chunk: string) => { stderr = append(stderr, chunk, "stderr"); });

  const startupTimer = setTimeout(() => {
    if (readyAt !== undefined || terminalFailure !== undefined) return;
    terminalFailure = new RenderingProducerError(
      `${request.producer} startup timed out after ${startupTimeoutMs} ms`,
      "timeout",
      diagnostics("startup"),
    );
    void terminate();
  }, startupTimeoutMs);
  startupTimer.unref?.();

  child.on("message", message => {
    if (!isReadyMessage(message) || readyAt !== undefined || terminalFailure !== undefined) return;
    readyAt = Date.now();
    clearTimeout(startupTimer);
    completionTimer = setTimeout(() => {
      if (terminalFailure !== undefined) return;
      terminalFailure = new RenderingProducerError(
        `${request.producer} completion timed out after ${completionTimeoutMs} ms`,
        "timeout",
        diagnostics("completion"),
      );
      void terminate();
    }, completionTimeoutMs);
    completionTimer.unref?.();
  });

  const outcomePromise = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", error => reject(new RenderingProducerError(
      `${request.producer} failed to spawn: ${error.message}`,
      "spawn",
      diagnostics("spawn"),
    )));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  child.stdin!.end(`${JSON.stringify(request)}\n`);

  let outcome: { code: number | null; signal: NodeJS.Signals | null };
  try {
    outcome = await outcomePromise;
    if (termination !== undefined) await termination;
  } finally {
    clearTimeout(startupTimer);
    if (completionTimer !== undefined) clearTimeout(completionTimer);
  }
  if (terminalFailure !== undefined) throw terminalFailure;
  if (readyAt === undefined) {
    throw new RenderingProducerError(
      `${request.producer} exited before readiness (${outcome.code ?? outcome.signal ?? "unknown"}): ${stderr.trim()}`,
      "exit",
      diagnostics("startup"),
    );
  }
  if (outcome.code !== 0) {
    throw new RenderingProducerError(
      `${request.producer} exited ${outcome.code ?? outcome.signal ?? "unknown"}: ${stderr.trim()}`,
      "exit",
      diagnostics("completion"),
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new RenderingProducerError(
      `${request.producer} emitted malformed JSON: ${error instanceof Error ? error.message : String(error)}`,
      "protocol",
      diagnostics("protocol"),
    );
  }
  if (!isRenderingProducerResult(parsed) || parsed.producer !== request.producer) {
    throw new RenderingProducerError(`${request.producer} emitted an invalid result`, "protocol", diagnostics("protocol"));
  }
  return {
    ...parsed,
    timings: {
      startupMs: Math.max(0, readyAt - startedAt),
      completionMs: Math.max(0, Date.now() - readyAt),
    },
  };
}

function isRenderingProducerResult(value: unknown): value is RenderingProducerResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<RenderingProducerResult>;
  return (result.producer === "bare-a1" || result.producer === "a1-pi" || result.producer === "pinned-pi")
    && typeof result.processId === "number"
    && (result.effectiveMode === "regular" || result.effectiveMode === "fullscreen")
    && Array.isArray(result.writes) && result.writes.every(write => typeof write === "object" && write !== null
      && typeof (write as TimedTerminalWrite).data === "string" && typeof (write as TimedTerminalWrite).atMs === "number")
    && Array.isArray(result.checkpoints);
}

function isReadyMessage(value: unknown): value is { readonly type: "ready" } {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "ready";
}

function assertPositiveInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`${label} must be positive`);
}

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid !== undefined) {
    await new Promise<void>(resolve => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], {
        stdio: "ignore",
        windowsHide: true,
      });
      killer.once("error", () => { child.kill(); resolve(); });
      killer.once("exit", () => { if (child.exitCode === null && child.signalCode === null) child.kill(); resolve(); });
    });
    return;
  }
  child.kill("SIGKILL");
}

function truncateDiagnostic(value: string, maximumBytes = 4096): string {
  const bytes = Buffer.from(value);
  return bytes.length <= maximumBytes ? value : `${bytes.subarray(0, maximumBytes).toString("utf8")}…`;
}
