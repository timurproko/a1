import { fork, type ChildProcess, type ForkOptions, type SpawnOptions } from "node:child_process";
import { fstatSync } from "node:fs";
import { HelperPool } from "./helper-pool.js";
import type { SelectionCopySnapshot } from "../../../ui/components/selection-copy.js";
import { COPY_CHUNK_UNITS, COPY_CLEANUP_MS, MAX_COPY_BYTES, MAX_COPY_CONTROL_BYTES, type CopyHelperInput, type CopyHelperOutput, type CopyResult } from "./response-copy-protocol.js";

type HelperResult = Extract<CopyHelperOutput, { kind: "result" }> & { readonly text?: string; readonly bytes?: number };
type HelperMode = "native" | "terminal" | "prepare";

export interface ResponseCopyJob {
  readonly result: Promise<CopyResult>;
  /** Resolves only after the executor can no longer produce clipboard side effects. */
  readonly stopped: Promise<void>;
  cancel(): void;
}
export type CopyPhaseObserver = (phase: "extracted" | "encoded" | "submitting", bytes: number, transport: "native" | "terminal" | "injected") => void;
export type ResponseCopyExecutor = (snapshot: SelectionCopySnapshot, phase: CopyPhaseObserver) => ResponseCopyJob;
/** The production executor also owns a spare helper; the owner warms it at start and disposes it at shutdown. */
export interface OwnedResponseCopyExecutor extends ResponseCopyExecutor {
  warm(): void;
  dispose(): void;
  readonly warmed: boolean;
}
export interface ResponseCopyTerminal {
  readonly maxBytes?: number;
  /** A supported non-blocking submission boundary, not clipboard acknowledgment. */
  submit(control: string, signal: AbortSignal): Promise<void>;
}

/** Never substitute a remote host's native clipboard for the terminal user's clipboard. */
export function responseCopyDestination(env: NodeJS.ProcessEnv): "native" | "terminal" {
  return env.SSH_CONNECTION || env.SSH_CLIENT || env.SSH_TTY || env.TMUX || env.STY || env.WSL_DISTRO_NAME
    ? "terminal" : "native";
}

/** Node documents synchronous POSIX TTY and Windows pipe writes; do not put clipboard traffic there. */
export function hasAsyncClipboardOutput(platform = process.platform, stdout: { readonly isTTY?: boolean | undefined; readonly fd?: number | undefined } = process.stdout): boolean {
  if (stdout.isTTY) return platform === "win32";
  if (platform === "win32") return false;
  try { const stat = fstatSync(stdout.fd ?? -1); return stat.isFIFO() || stat.isSocket(); }
  catch { return false; }
}

/** Isolates preparation and native clipboard access; only the owner may submit terminal controls. */
export function createResponseCopyExecutor(options: {
  readonly terminal?: ResponseCopyTerminal;
  readonly destination?: "native" | "terminal";
  /** Explicit host seam: must be non-blocking and honor cancellation, or its unresolved lifetime is quarantined. */
  readonly writeText?: (text: string, signal: AbortSignal) => Promise<void>;
  /** Package/fault-test seam: the production helper is always an emitted sibling. */
  readonly helper?: URL;
  /** Idle bound for the spare helper; production keeps the default. */
  readonly spareIdleMs?: number;
} = {}): OwnedResponseCopyExecutor {
  const pool = new HelperPool({ fork: () => forkCopyHelper(options.helper), stop: stopCopyHelper, ...(options.spareIdleMs === undefined ? {} : { idleMs: options.spareIdleMs }) });
  const execute: ResponseCopyExecutor = (snapshot, phase) => {
    const controller = new AbortController();
    let active: ReturnType<typeof startHelper> | undefined;
    const run = async (): Promise<CopyResult> => {
      const destination = options.writeText === undefined ? options.destination ?? responseCopyDestination(process.env) : "prepare";
      const execute = async (mode: HelperMode): Promise<HelperResult> => {
        if (controller.signal.aborted) return { kind: "result", result: { outcome: "canceled" } } as const;
        if (mode === "terminal" && options.terminal === undefined) {
          return { kind: "result", result: { outcome: "failed", failure: "unsafe" } } as const;
        }
        active = startHelper(snapshot, mode, options.terminal?.maxBytes ?? MAX_COPY_CONTROL_BYTES, phase, options.helper, pool);
        if (controller.signal.aborted) active.cancel();
        return active.result;
      };
      let outcome = await execute(destination);
      // Concurrency: helper results settle only after exit; fallback cannot race an older native write.
      if (!controller.signal.aborted && destination === "native" && outcome.result.failure === "unavailable" && options.terminal !== undefined) {
        outcome = await execute("terminal");
      }
      if (controller.signal.aborted) return { outcome: "canceled" };
      if (destination === "prepare" && outcome.result.outcome === "delivered") {
        if (outcome.text === undefined) return { outcome: "failed", failure: "transport" };
        phase("submitting", outcome.bytes ?? 0, "injected");
        await options.writeText!(outcome.text, controller.signal);
      }
      if (outcome.result.outcome === "submitted-unverified") {
        const control = "control" in outcome ? outcome.control : undefined;
        if (typeof control !== "string" || !/^\u001b\]52;c;[A-Za-z0-9+/]*={0,2}\u0007$/u.test(control)
          || Buffer.byteLength(control) > Math.min(MAX_COPY_CONTROL_BYTES, options.terminal === undefined ? 0 : options.terminal.maxBytes ?? MAX_COPY_CONTROL_BYTES)) {
          return { outcome: "failed", failure: "transport" };
        }
        phase("submitting", control.length, "terminal");
        await options.terminal!.submit(control, controller.signal);
      }
      return controller.signal.aborted ? { outcome: "canceled" } : outcome.result;
    };
    const result = run().catch((): CopyResult => ({ outcome: controller.signal.aborted ? "canceled" : "failed", failure: "transport" }));
    return { result, stopped: result.then(() => {}), cancel: () => { controller.abort(); active?.cancel(); } };
  };
  // Rationale: `Object.assign` would copy the getter's value once; the accessor must read the pool each time.
  return Object.defineProperties(execute, {
    warm: { value: () => pool.warm() },
    dispose: { value: () => pool.dispose() },
    warmed: { get: () => pool.warmed },
  }) as OwnedResponseCopyExecutor;
}

/** Forks one copy helper: bounded IPC only, no clipboard payload in argv or temp files, no inherited terminal descriptors. */
function forkCopyHelper(helper?: URL): ChildProcess {
  const source = new URL(import.meta.url).pathname.endsWith(".ts");
  const entry = helper ?? new URL(source ? "./response-copy-helper.ts" : "./response-copy-helper.js", import.meta.url);
  const forkOptions: ForkOptions & Pick<SpawnOptions, "windowsHide"> = {
    execArgv: entry.pathname.endsWith(".ts") ? ["--import", "tsx"] : [],
    stdio: ["ignore", "ignore", "ignore", "ipc"], windowsHide: true,
    serialization: "json",
  };
  return fork(entry, [], forkOptions);
}

function stopCopyHelper(child: ChildProcess): void {
  child.kill("SIGKILL");
  child.unref(); child.channel?.unref();
}

function* sourceMessages(snapshot: SelectionCopySnapshot, mode: HelperMode, controlLimit: number): Generator<CopyHelperInput> {
  yield { kind: "begin", selection: snapshot.selection, rows: snapshot.rows.length, mode, controlLimit,
    ...(snapshot.literal === undefined ? {} : { literal: snapshot.literal }) };
  for (const row of snapshot.rows) {
    for (let offset = 0; offset < Math.max(1, row.text.length); offset += COPY_CHUNK_UNITS) {
      yield { kind: "row", text: row.text.slice(offset, offset + COPY_CHUNK_UNITS), end: offset + COPY_CHUNK_UNITS >= row.text.length,
        ...(row.prompt === undefined ? {} : { prompt: row.prompt }) };
    }
  }
  yield { kind: "finish" };
}

function startHelper(snapshot: SelectionCopySnapshot, mode: HelperMode, controlLimit: number, phase: CopyPhaseObserver, helper: URL | undefined, pool: HelperPool): {
  result: Promise<HelperResult>;
  cancel(): void;
} {
  // Performance: a warm spare skips fork and module load on the copy's own critical path.
  const spare = pool.take();
  const child = spare?.child ?? forkCopyHelper(helper);
  let iterator: Generator<CopyHelperInput> | undefined = sourceMessages(snapshot, mode, controlLimit);
  let outcome: Extract<CopyHelperOutput, { kind: "result" }> | undefined;
  let stopping = false;
  let prepared: string[] = [], preparedBytes = 0, expectedBytes: number | undefined;
  const observedPhases = new Set<string>();
  let cleanup: ReturnType<typeof setTimeout> | undefined;
  const stop = (discard: boolean) => {
    if (stopping) return;
    stopping = true;
    if (discard) prepared = [];
    iterator = undefined;
    child.kill("SIGKILL");
    // Concurrency: a kernel-stuck child is quarantined by the coordinator, not allowed to pin UI shutdown.
    cleanup = setTimeout(() => { child.unref(); child.channel?.unref(); }, COPY_CLEANUP_MS);
    cleanup.unref();
  };
  const cancel = () => stop(true);
  // Invariant: reaping keeps a complete result's prepared text; discarding it would write "" to the clipboard.
  const reap = () => stop(false);
  const result = new Promise<HelperResult>(resolve => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      const value = outcome ?? { kind: "result", result: { outcome: "failed", failure: "transport" } } as const;
      if (mode === "prepare" && value.result.outcome === "delivered") {
        resolve(expectedBytes === preparedBytes ? { ...value, text: prepared.join(""), bytes: preparedBytes }
          : { kind: "result", result: { outcome: "failed", failure: "transport" } });
      } else resolve(value);
      prepared = [];
    };
    const advance = () => {
      const next = iterator?.next();
      if (next === undefined || next.done) { cancel(); return; }
      child.send(next.value, error => { if (error) cancel(); });
    };
    child.on("message", value => {
      const message = value as CopyHelperOutput;
      if (stopping) return;
      if (message?.kind === "ready") {
        advance();
      } else if (message?.kind === "data") {
        if (mode !== "prepare" || expectedBytes === undefined || typeof message.text !== "string" || message.text.length > COPY_CHUNK_UNITS) { cancel(); return; }
        preparedBytes += Buffer.byteLength(message.text);
        if (preparedBytes > MAX_COPY_BYTES) { cancel(); return; }
        prepared.push(message.text);
        child.send({ kind: "next" } satisfies CopyHelperInput, error => { if (error) cancel(); });
      } else if (message?.kind === "phase" && ["extracted", "encoded", "submitting"].includes(message.phase)
        && Number.isSafeInteger(message.bytes) && message.bytes >= 0) {
        if (observedPhases.has(message.phase)) { cancel(); return; }
        observedPhases.add(message.phase);
        if (message.phase === "extracted") expectedBytes = message.bytes;
        phase(message.phase, message.bytes, mode === "prepare" ? "injected" : mode);
      } else if (message?.kind === "result" && ["delivered", "submitted-unverified", "failed"].includes(message.result?.outcome)) {
        outcome = message;
        iterator = undefined;
        // Concurrency: a result is not an exit fence; bound a helper that sends a result but never exits.
        cleanup = setTimeout(reap, COPY_CLEANUP_MS);
        cleanup.unref();
      } else cancel();
    });
    child.once("error", cancel);
    child.once("exit", () => {
      iterator = undefined;
      if (cleanup !== undefined) clearTimeout(cleanup);
      child.removeAllListeners("message");
      settle();
      // Performance: the next copy finds a spare that was forked while nothing waited on it.
      pool.replenish();
    });
    // Platform: spawn failure has no exit event, but has a close event and no live executor to fence.
    child.once("close", () => {
      iterator = undefined;
      if (cleanup !== undefined) clearTimeout(cleanup);
      settle();
    });
    // Protocol: a spare already announced itself while pooled, so its first request is sent now rather than on "ready".
    if (spare?.ready) advance();
  });
  return { result, cancel };
}
