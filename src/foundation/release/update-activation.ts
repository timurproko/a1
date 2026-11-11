import { spawnReleaseEntry } from "./release-use.js";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_TEXT } from "../../product-identity.js";
import { certifyMaterializedRelease } from "./bootstrap.js";
import { ReleaseStateStore } from "./release-state.js";
import { resolveProductPaths, type ProductPaths } from "../lifecycle/index.js";
import { scheduleReleaseCleanup } from "./release-gc.js";
import { materializeRelease } from "./release-store.js";
import { warmMaterializedRelease } from "./warmup.js";
import { errorMessage } from "./managed-path.js";

/**
 * The one activation contract an installed tree can offer the updater that installed it.
 * The updater knows nothing else about the tree: the manifest names the contracts the tree
 * serves, and this entry drives its activation with the tree's own release code.
 */
export const UPDATE_ACTIVATION_CONTRACT = "activate-v1";
export const UPDATE_ACTIVATION_ENTRY = "bin/activate.js";
/** Manifest field listing the activation contracts an installed tree serves. */
export const UPDATE_ACTIVATION_MANIFEST_FIELD = "updateActivationContracts";
const ACTIVATION_DIAGNOSTIC_LIMIT = 2_000;
/** Bound on one progress line; the activator's events are all far shorter. */
const ACTIVATION_LINE_LIMIT = 64 * 1_024;

export type UpdateActivationPhase = "materialized" | "certified" | "active-reference-committed";

/**
 * Copying the release is the longest step with nothing to say for itself, so it
 * reports the files it has written against the files it must write. A caller that
 * shows progress can then move with the work instead of guessing at it.
 */
export interface UpdateMaterializationProgress {
  readonly completed: number;
  readonly total: number;
}

export interface UpdateActivationCallbacks {
  readonly phase: (phase: UpdateActivationPhase) => Promise<void>;
  readonly onMaterializing?: (progress: UpdateMaterializationProgress) => void;
  readonly onWarmup?: (state: "started" | "completed") => void;
}

export interface UpdateActivationRequest {
  readonly packageRoot: string;
  readonly dataDir: string;
  readonly targetVersion: string;
  readonly environment: NodeJS.ProcessEnv;
}

/** One line of the activator's progress stream; `failed` carries the reason and ends it. */
export type UpdateActivationEvent =
  | { readonly event: "materializing"; readonly completed: number; readonly total: number }
  | { readonly event: "phase"; readonly phase: UpdateActivationPhase }
  | { readonly event: "warmup"; readonly state: "started" | "completed" }
  | { readonly event: "completed" }
  | { readonly event: "failed"; readonly message: string };

/**
 * Activate the installed tree at `packageRoot` with this process's own release code:
 * materialize it into the immutable store, certify, warm, and only then move the active
 * reference. This is what the installed tree runs for itself through
 * its activation entry, and what an updater runs in-process for a tree older than the contract.
 */
export async function activateInstalledRelease(request: UpdateActivationRequest, callbacks: UpdateActivationCallbacks): Promise<void> {
  const stateStore = new ReleaseStateStore(request.dataDir);
  let total = 0;
  let completed = 0;
  const candidate = await materializeRelease(request.packageRoot, request.dataDir, {
    onProgress: event => {
      total = event.fileCount;
      callbacks.onMaterializing?.({ completed, total });
    },
    onOperation: event => {
      if (event.operation !== "candidate-write" && event.operation !== "layer-write") return;
      completed += 1;
      callbacks.onMaterializing?.({ completed, total });
    },
  });
  if (candidate.packageVersion !== request.targetVersion) throw new Error(`installed ${PRODUCT_TEXT.displayName} version ${candidate.packageVersion} does not match target ${request.targetVersion}`);
  await stateStore.recordCandidate(candidate);
  await callbacks.phase("materialized");
  const diagnostics = await certifyMaterializedRelease(candidate, request.dataDir);
  await stateStore.approve(candidate.releaseId, diagnostics);
  await callbacks.phase("certified");
  callbacks.onWarmup?.("started");
  await warmMaterializedRelease(candidate, request.environment);
  callbacks.onWarmup?.("completed");
  await stateStore.activate(candidate.releaseId);
  await callbacks.phase("active-reference-committed");
}

/**
 * Which activation contracts the installed tree serves, read from its manifest. A tree
 * without the field, or without a readable manifest, serves none and is activated in-process.
 */
export async function readActivationContracts(packageRoot: string, read: (path: string) => Promise<string> = path => readFile(path, "utf8")): Promise<readonly string[]> {
  try {
    const manifest = JSON.parse(await read(resolve(packageRoot, "package.json"))) as Record<string, unknown>;
    const declared = manifest[UPDATE_ACTIVATION_MANIFEST_FIELD];
    return Array.isArray(declared) ? declared.filter((value): value is string => typeof value === "string") : [];
  } catch {
    return [];
  }
}

/**
 * Drive the installed tree's own activator and relay its progress. The updater passes
 * the tree what the tree cannot know (the data directory, the target it must match) and
 * learns from it only the phases it reached; every path inside the tree is the tree's business.
 */
export async function delegateActivation(request: UpdateActivationRequest, callbacks: UpdateActivationCallbacks): Promise<void> {
  const entry = resolve(request.packageRoot, UPDATE_ACTIVATION_ENTRY);
  const child = await spawnReleaseEntry(entry, ["--data-dir", request.dataDir, "--target-version", request.targetVersion], {
    env: request.environment,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  let pending = "";
  let diagnostics = "";
  let failure: Error | null = null;
  let completed = false;
  // Concurrency: callbacks are awaited in order so a phase is journaled before the next one is read.
  let relay: Promise<void> = Promise.resolve();
  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", chunk => { diagnostics = `${diagnostics}${chunk}`.slice(-ACTIVATION_DIAGNOSTIC_LIMIT); });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", chunk => {
    const lines = `${pending}${String(chunk)}`.split("\n");
    pending = lines.pop() ?? "";
    if (pending.length > ACTIVATION_LINE_LIMIT) { failure ??= new Error("activation event exceeds the line limit"); pending = ""; }
    const events: unknown[] = [];
    for (const line of lines) {
      if (line.trim().length === 0) continue;
      try { events.push(JSON.parse(line)); } catch (error) { failure ??= new Error(errorMessage(error)); return; }
    }
    for (const event of events) {
      relay = relay.then(async () => {
        const parsed = parseActivationEvent(event);
        // Compatibility: a newer tree may report events this updater does not know; they carry no verdict.
        if (parsed === "unknown") return;
        if (!parsed) { failure ??= new Error(`unrecognized activation event ${JSON.stringify(event).slice(0, 200)}`); return; }
        if (parsed.event === "materializing") callbacks.onMaterializing?.({ completed: parsed.completed, total: parsed.total });
        else if (parsed.event === "phase") await callbacks.phase(parsed.phase);
        else if (parsed.event === "warmup") callbacks.onWarmup?.(parsed.state);
        else if (parsed.event === "completed") completed = true;
        else failure ??= new Error(parsed.message);
      }).catch(error => { failure ??= new Error(errorMessage(error)); });
    }
  });
  const exit = await new Promise<{ code: number | null; signal: NodeJS.Signals | null }>((resolvePromise, rejectPromise) => {
    child.once("error", rejectPromise);
    child.once("close", (code, signal) => resolvePromise({ code, signal }));
  });
  await relay;
  if (failure) throw failure;
  if (exit.code !== 0 || !completed) {
    const status = exit.code === null ? exit.signal ?? "unknown status" : `status ${exit.code}`;
    throw new Error(`installed release activation exited with ${status}${summarize(diagnostics)}`);
  }
}

/**
 * Body of the installed tree's activation entry: activate the tree this code ships in,
 * writing one progress event per line so the updater that started it can follow along.
 */
export async function runActivationEntry(
  argv: readonly string[],
  entryUrl: string,
  io: { write(line: string): void; diagnostic?(line: string): void } = {
    write: line => process.stdout.write(line),
    diagnostic: line => process.stderr.write(line),
  },
  environment: NodeJS.ProcessEnv = process.env,
  maintenance: (dataDir: string, paths: ProductPaths) => Promise<void> = scheduleReleaseCleanup,
): Promise<number> {
  const emit = (event: UpdateActivationEvent) => io.write(`${JSON.stringify(event)}\n`);
  try {
    const arguments_ = parseEntryArguments(argv);
    const packageRoot = resolve(fileURLToPath(new URL("..", entryUrl)));
    const paths = resolveProductPaths(environment);
    const dataDir = arguments_.dataDir ?? paths.dataDir;
    await activateInstalledRelease({
      packageRoot,
      dataDir,
      targetVersion: arguments_.targetVersion,
      environment,
    }, {
      phase: async phase => emit({ event: "phase", phase }),
      onMaterializing: progress => emit({ event: "materializing", ...progress }),
      onWarmup: state => emit({ event: "warmup", state }),
    });
    // Invariant: the release that now owns the control state performs its own maintenance. The
    // updater that started this entry may be older and must not interpret state this code wrote.
    // The activation is committed, so a maintenance failure is a diagnostic, never a verdict.
    await maintenance(dataDir, { ...paths, dataDir }).catch((error: unknown) => {
      io.diagnostic?.(`release maintenance after activation failed: ${errorMessage(error)}\n`);
    });
    emit({ event: "completed" });
    return 0;
  } catch (error) {
    emit({ event: "failed", message: errorMessage(error) });
    return 1;
  }
}

function parseEntryArguments(argv: readonly string[]): { dataDir: string | null; targetVersion: string } {
  let dataDir: string | null = null;
  let targetVersion: string | null = null;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index + 1];
    if (argv[index] === "--data-dir" && value !== undefined) { dataDir = value; index += 1; }
    else if (argv[index] === "--target-version" && value !== undefined) { targetVersion = value; index += 1; }
    else throw new Error(`unexpected activation argument ${argv[index]}`);
  }
  if (targetVersion === null) throw new Error("activation requires --target-version");
  return { dataDir, targetVersion };
}

function parseActivationEvent(value: unknown): UpdateActivationEvent | "unknown" | null {
  if (typeof value !== "object" || value === null || !("event" in value)) return null;
  const record = value as Record<string, unknown>;
  switch (record.event) {
    case "materializing":
      return typeof record.completed === "number" && typeof record.total === "number" ? { event: "materializing", completed: record.completed, total: record.total } : null;
    case "phase":
      if (record.phase === "materialized" || record.phase === "certified" || record.phase === "active-reference-committed") return { event: "phase", phase: record.phase };
      return typeof record.phase === "string" && record.phase.length > 0 ? "unknown" : null;
    case "warmup":
      return record.state === "started" || record.state === "completed" ? { event: "warmup", state: record.state } : null;
    case "completed":
      return { event: "completed" };
    case "failed":
      return typeof record.message === "string" ? { event: "failed", message: record.message } : null;
    default:
      return typeof record.event === "string" && record.event.length > 0 ? "unknown" : null;
  }
}

function summarize(text: string): string {
  const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
  return lines.length === 0 ? "" : `: ${lines.slice(0, 4).join(" | ")}`;
}

