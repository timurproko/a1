import { spawn } from "node:child_process";
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
  readonly testBehavior?: "run" | "fail" | "hang";
}

export interface RenderingProducerCheckpoint {
  readonly name: string;
  readonly atMs: number;
  readonly writeEnd: number;
  readonly columns: number;
  readonly rows: number;
  readonly transcript: readonly { readonly kind: string; readonly status: string; readonly text: string }[];
}

export interface RenderingProducerResult {
  readonly producer: RenderingProducerId;
  readonly processId: number;
  readonly effectiveMode: RenderingMode;
  readonly state: RenderingProducerRequest["state"];
  readonly writes: readonly TimedTerminalWrite[];
  readonly checkpoints: readonly RenderingProducerCheckpoint[];
}

export class RenderingProducerError extends Error {
  constructor(message: string, readonly kind: "spawn" | "timeout" | "exit" | "output" | "protocol") {
    super(message);
    this.name = "RenderingProducerError";
  }
}

export async function runRenderingProducer(
  request: RenderingProducerRequest,
  options: { readonly timeoutMs?: number; readonly maxOutputBytes?: number; readonly onSpawn?: (processId: number) => void } = {},
): Promise<RenderingProducerResult> {
  const timeoutMs = options.timeoutMs ?? 10_000;
  const maxOutputBytes = options.maxOutputBytes ?? 2 * 1024 * 1024;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1) throw new RangeError("producer timeout must be positive");
  if (!Number.isSafeInteger(maxOutputBytes) || maxOutputBytes < 1) throw new RangeError("producer output bound must be positive");
  const worker = fileURLToPath(new URL("./rendering-producer-worker.ts", import.meta.url));
  const child = spawn(process.execPath, ["--import", "tsx", worker], {
    cwd: request.state.cwd,
    env: { ...process.env, PI_OFFLINE: "1", NO_COLOR: "1" },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: true,
  });
  if (child.pid !== undefined) options.onSpawn?.(child.pid);
  let stdout = "";
  let stderr = "";
  let outputFailure: RenderingProducerError | undefined;
  const append = (current: string, chunk: string, stream: string): string => {
    const next = current + chunk;
    if (Buffer.byteLength(next) > maxOutputBytes && outputFailure === undefined) {
      outputFailure = new RenderingProducerError(`${request.producer} ${stream} exceeds ${maxOutputBytes} bytes`, "output");
      child.kill();
    }
    return Buffer.from(next).subarray(0, maxOutputBytes + 1).toString("utf8");
  };
  child.stdout.setEncoding("utf8");
  child.stderr.setEncoding("utf8");
  child.stdout.on("data", (chunk: string) => { stdout = append(stdout, chunk, "stdout"); });
  child.stderr.on("data", (chunk: string) => { stderr = append(stderr, chunk, "stderr"); });
  child.stdin.end(`${JSON.stringify(request)}\n`);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill();
  }, timeoutMs);
  timer.unref?.();
  const outcome = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolve, reject) => {
    child.once("error", error => reject(new RenderingProducerError(`${request.producer} failed to spawn: ${error.message}`, "spawn")));
    child.once("exit", (code, signal) => resolve({ code, signal }));
  }).finally(() => clearTimeout(timer));
  if (outputFailure !== undefined) throw outputFailure;
  if (timedOut) throw new RenderingProducerError(`${request.producer} timed out after ${timeoutMs} ms`, "timeout");
  if (outcome.code !== 0) {
    throw new RenderingProducerError(
      `${request.producer} exited ${outcome.code ?? outcome.signal ?? "unknown"}: ${stderr.trim()}`,
      "exit",
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdout);
  } catch (error) {
    throw new RenderingProducerError(`${request.producer} emitted malformed JSON: ${error instanceof Error ? error.message : String(error)}`, "protocol");
  }
  if (!isRenderingProducerResult(parsed) || parsed.producer !== request.producer) {
    throw new RenderingProducerError(`${request.producer} emitted an invalid result`, "protocol");
  }
  return parsed;
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
