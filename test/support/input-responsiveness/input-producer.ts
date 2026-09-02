import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { PiTuiInputDiagnosticsEvent } from "../../../src/integrations/pi/tui-runtime/index.js";
import type { RenderingProducerId } from "../rendering/rendering-producer.js";

export interface InputProducerState {
  readonly cwd: string;
  readonly columns: number;
  readonly rows: number;
  readonly theme: "dark";
}

export interface InputProducerRequest {
  readonly producer: RenderingProducerId;
  readonly workloadId: string;
  readonly variant?: "candidate" | "baseline";
  readonly state: InputProducerState;
  readonly testBehavior?: "run" | "fail" | "hang" | "startup-hang" | "malformed" | "missing-checkpoint";
}

export interface InputProducerBatchRequest {
  readonly producer: RenderingProducerId;
  readonly workloadIds: readonly string[];
  readonly variant?: "candidate" | "baseline";
  readonly state: Omit<InputProducerState, "columns" | "rows">;
}

export interface InputProducerCheckpoint {
  readonly name: string;
  readonly writeStart: number;
  readonly writeEnd: number;
  readonly columns: number;
  readonly rows: number;
  readonly text: string;
  readonly actions: readonly string[];
  readonly selected: string | null;
  readonly viewportCause: string | null;
  readonly viewportTranscript: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly viewportDock: { readonly rowStart: number; readonly rowEnd: number } | null;
  readonly viewportCompositions: { readonly full: number; readonly dockOnly: number } | null;
  readonly transcriptBlockRenders: number | null;
}

export interface InputProducerResult {
  readonly schema: "a1-input-responsiveness-producer-v1";
  readonly producer: RenderingProducerId;
  readonly processId: number;
  readonly workloadId: string;
  readonly variant: "candidate" | "baseline";
  readonly phases: readonly PiTuiInputDiagnosticsEvent[];
  readonly writes: readonly { readonly data: string; readonly atMs: number }[];
  readonly checkpoints: readonly InputProducerCheckpoint[];
  readonly restored: boolean;
  readonly timings?: { readonly startupMs: number; readonly completionMs: number };
}

export interface InputProducerBatchResult {
  readonly schema: "a1-input-responsiveness-batch-v1";
  readonly producer: RenderingProducerId;
  readonly processId: number;
  readonly results: readonly InputProducerResult[];
  readonly timings?: { readonly startupMs: number; readonly completionMs: number };
}

export class InputProducerError extends Error {
  constructor(
    message: string,
    readonly kind: "spawn" | "timeout" | "exit" | "output" | "protocol",
    readonly phase: "startup" | "completion" | "spawn" | "output" | "protocol",
    readonly elapsedMs: number,
    readonly stderr: string,
  ) {
    super(message);
    this.name = "InputProducerError";
  }
}

export interface InputProducerOptions {
  readonly startupTimeoutMs?: number;
  readonly completionTimeoutMs?: number;
  readonly maxOutputBytes?: number;
  readonly onSpawn?: (processId: number) => void;
}

const DEFAULT_TIMEOUT_MS = 60_000;
const DEFAULT_OUTPUT_BYTES = 2 * 1024 * 1024;

/** Launches one isolated input producer behind bounded readiness and teardown protocol. */
export async function runInputProducer(
  request: InputProducerRequest,
  options: InputProducerOptions = {},
): Promise<InputProducerResult> {
  const result = await runInputWorker(request, options, isResult);
  if (result.producer !== request.producer || result.workloadId !== request.workloadId) {
    throw protocolError("input producer identity disagrees with request");
  }
  return result;
}

/** Captures multiple workloads in one isolated producer process without sharing across profiles. */
export async function runInputProducerBatch(
  request: InputProducerBatchRequest,
  options: InputProducerOptions = {},
): Promise<InputProducerBatchResult> {
  if (request.workloadIds.length < 1 || new Set(request.workloadIds).size !== request.workloadIds.length) {
    throw new TypeError("input producer batch workload identities are empty or duplicated");
  }
  const result = await runInputWorker(request, options, isBatchResult);
  if (result.producer !== request.producer
    || result.results.length !== request.workloadIds.length
    || result.results.some((entry, index) => entry.workloadId !== request.workloadIds[index])) {
    throw protocolError("input producer batch identity disagrees with request");
  }
  return result;
}

async function runInputWorker<T extends object>(
  request: InputProducerRequest | InputProducerBatchRequest,
  options: InputProducerOptions,
  validate: (value: unknown) => value is T,
): Promise<T & { readonly timings: { readonly startupMs: number; readonly completionMs: number } }> {
  const startupTimeoutMs = options.startupTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const completionTimeoutMs = options.completionTimeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxOutputBytes = options.maxOutputBytes ?? DEFAULT_OUTPUT_BYTES;
  for (const [label, value] of [["startup timeout", startupTimeoutMs], ["completion timeout", completionTimeoutMs], ["output bound", maxOutputBytes]] as const) {
    if (!Number.isSafeInteger(value) || value < 1) throw new RangeError(`input producer ${label} must be positive`);
  }
  const startedAt = Date.now();
  const worker = fileURLToPath(new URL("./input-producer-worker.ts", import.meta.url));
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
  let failure: InputProducerError | undefined;
  let completionTimer: ReturnType<typeof setTimeout> | undefined;
  let termination: Promise<void> | undefined;
  const diagnostics = (phase: InputProducerError["phase"]) => ({ phase, elapsedMs: Math.max(0, Date.now() - startedAt), stderr: truncate(stderr) });
  const terminate = (): Promise<void> => termination ??= terminateProcessTree(child);
  const append = (current: string, chunk: string, stream: "stdout" | "stderr") => {
    const next = current + chunk;
    if (Buffer.byteLength(next) > maxOutputBytes && failure === undefined) {
      const detail = diagnostics("output");
      failure = new InputProducerError(`${request.producer} ${stream} exceeds ${maxOutputBytes} bytes`, "output", detail.phase, detail.elapsedMs, detail.stderr);
      void terminate();
    }
    return Buffer.from(next).subarray(0, maxOutputBytes + 1).toString("utf8");
  };
  child.stdout!.setEncoding("utf8");
  child.stderr!.setEncoding("utf8");
  child.stdout!.on("data", (chunk: string) => { stdout = append(stdout, chunk, "stdout"); });
  child.stderr!.on("data", (chunk: string) => { stderr = append(stderr, chunk, "stderr"); });
  const startupTimer = setTimeout(() => {
    if (readyAt !== undefined || failure !== undefined) return;
    const detail = diagnostics("startup");
    failure = new InputProducerError(`${request.producer} input startup timed out`, "timeout", detail.phase, detail.elapsedMs, detail.stderr);
    void terminate();
  }, startupTimeoutMs);
  startupTimer.unref?.();
  child.on("message", message => {
    if (!isReady(message) || readyAt !== undefined || failure !== undefined) return;
    readyAt = Date.now();
    clearTimeout(startupTimer);
    completionTimer = setTimeout(() => {
      if (failure !== undefined) return;
      const detail = diagnostics("completion");
      failure = new InputProducerError(`${request.producer} input completion timed out`, "timeout", detail.phase, detail.elapsedMs, detail.stderr);
      void terminate();
    }, completionTimeoutMs);
    completionTimer.unref?.();
  });
  const outcome = new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", error => {
      const detail = diagnostics("spawn");
      reject(new InputProducerError(error.message, "spawn", detail.phase, detail.elapsedMs, detail.stderr));
    });
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });
  child.stdin!.end(`${JSON.stringify(request)}\n`);
  let exit: { code: number | null; signal: NodeJS.Signals | null };
  try {
    exit = await outcome;
    if (termination !== undefined) await termination;
  } finally {
    clearTimeout(startupTimer);
    if (completionTimer !== undefined) clearTimeout(completionTimer);
  }
  if (failure !== undefined) throw failure;
  if (readyAt === undefined || exit.code !== 0) {
    const detail = diagnostics(readyAt === undefined ? "startup" : "completion");
    throw new InputProducerError(`${request.producer} input producer exited ${exit.code ?? exit.signal ?? "unknown"}`, "exit", detail.phase, detail.elapsedMs, detail.stderr);
  }
  let parsed: unknown;
  try { parsed = JSON.parse(stdout); }
  catch (error) {
    const detail = diagnostics("protocol");
    throw new InputProducerError(`malformed input producer JSON: ${error instanceof Error ? error.message : String(error)}`, "protocol", detail.phase, detail.elapsedMs, detail.stderr);
  }
  if (!validate(parsed)) {
    const detail = diagnostics("protocol");
    throw new InputProducerError("invalid input producer result", "protocol", detail.phase, detail.elapsedMs, detail.stderr);
  }
  return { ...parsed, timings: { startupMs: readyAt - startedAt, completionMs: Date.now() - readyAt } };
}

function isResult(value: unknown): value is InputProducerResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<InputProducerResult>;
  return result.schema === "a1-input-responsiveness-producer-v1"
    && (result.producer === "bare-a1" || result.producer === "a1-pi" || result.producer === "pinned-pi")
    && typeof result.processId === "number" && typeof result.workloadId === "string"
    && (result.variant === "candidate" || result.variant === "baseline")
    && Array.isArray(result.phases) && Array.isArray(result.writes)
    && Array.isArray(result.checkpoints) && result.checkpoints.length > 0
    && result.restored === true;
}

function isBatchResult(value: unknown): value is InputProducerBatchResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Partial<InputProducerBatchResult>;
  return result.schema === "a1-input-responsiveness-batch-v1"
    && (result.producer === "bare-a1" || result.producer === "a1-pi" || result.producer === "pinned-pi")
    && typeof result.processId === "number" && Array.isArray(result.results) && result.results.every(isResult)
    && result.results.every(entry => entry.processId === result.processId && entry.producer === result.producer);
}

function protocolError(message: string): InputProducerError {
  return new InputProducerError(message, "protocol", "protocol", 0, "");
}

function isReady(value: unknown): value is { readonly type: "ready" } {
  return typeof value === "object" && value !== null && (value as { type?: unknown }).type === "ready";
}

async function terminateProcessTree(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.signalCode !== null) return;
  if (process.platform === "win32" && child.pid !== undefined) {
    await new Promise<void>(resolve => {
      const killer = spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
      killer.once("error", () => { child.kill(); resolve(); });
      killer.once("exit", () => { if (child.exitCode === null && child.signalCode === null) child.kill(); resolve(); });
    });
  } else child.kill("SIGKILL");
}

function truncate(value: string, maximumBytes = 4096): string {
  const bytes = Buffer.from(value);
  return bytes.length <= maximumBytes ? value : `${bytes.subarray(0, maximumBytes).toString("utf8")}…`;
}
