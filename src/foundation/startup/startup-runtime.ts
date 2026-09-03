import { createHash, randomUUID } from "node:crypto";
import { appendFile, mkdir, readdir, rm } from "node:fs/promises";
import { constants as moduleConstants, enableCompileCache } from "node:module";
import { dirname, resolve } from "node:path";
import { homedir, platform } from "node:os";
import { performance } from "node:perf_hooks";
import { PRODUCT_IDENTITY } from "../../product-identity.js";

export type StartupPhase =
  | "command-invoked"
  | "bootstrap-start"
  | "bootstrap-selected"
  | "guardian-start"
  | "guardian-connected"
  | "ui-entry"
  | "ui-modules-loaded"
  | "pi-services"
  | "resource-discovery"
  | "session-created"
  | "settings-loaded"
  | "first-input-ready-render";

interface StartupTraceContext {
  readonly path: string;
  readonly traceId: string;
  readonly startedAtMs: number;
  readonly profileId: string;
  readonly releaseId: string | null;
  readonly dependencyLayerIds: readonly string[];
}

export interface StartupPerformanceEvidence {
  readonly profileId: "a1" | "pi";
  readonly launchKind: "post-update" | "warm";
  readonly events: readonly StartupTraceEvent[];
}

export interface StartupTraceEvent {
  readonly schema: typeof PRODUCT_IDENTITY.evidence.startupTraceSchema;
  readonly traceId: string;
  readonly phase: StartupPhase;
  readonly elapsedMs: number;
  readonly processId: number;
  readonly profileId: string;
  readonly releaseId: string | null;
  readonly dependencyLayerIds: readonly string[];
  readonly nodeVersion: string;
  readonly fileReadOperations: number;
}

/** Initialize opt-in startup tracing from a caller-provided evidence path. */
export function initializeStartupTrace(environment: NodeJS.ProcessEnv, profileId: string, startedAtMs = performance.timeOrigin + performance.now()): void {
  const configured = environment[PRODUCT_IDENTITY.environment.startupTrace];
  if (!configured || parseContext(configured) !== null) return;
  const context: StartupTraceContext = {
    path: resolve(configured),
    traceId: randomUUID(),
    startedAtMs,
    profileId,
    releaseId: environment[PRODUCT_IDENTITY.environment.releaseId] ?? null,
    dependencyLayerIds: parseLayerIds(environment[PRODUCT_IDENTITY.environment.releaseLayers]),
  };
  environment[PRODUCT_IDENTITY.environment.startupTrace] = JSON.stringify(context);
}

/** Append one redacted phase event; ordinary launches without trace context perform no I/O. */
export async function markStartupPhase(environment: NodeJS.ProcessEnv, phase: StartupPhase): Promise<void> {
  const context = parseContext(environment[PRODUCT_IDENTITY.environment.startupTrace]);
  if (context === null) return;
  const event: StartupTraceEvent = {
    schema: PRODUCT_IDENTITY.evidence.startupTraceSchema,
    traceId: context.traceId,
    phase,
    elapsedMs: Math.max(0, performance.timeOrigin + performance.now() - context.startedAtMs),
    processId: process.pid,
    profileId: context.profileId,
    releaseId: environment[PRODUCT_IDENTITY.environment.releaseId] ?? context.releaseId,
    dependencyLayerIds: parseLayerIds(environment[PRODUCT_IDENTITY.environment.releaseLayers]).length > 0
      ? parseLayerIds(environment[PRODUCT_IDENTITY.environment.releaseLayers])
      : context.dependencyLayerIds,
    nodeVersion: process.version,
    fileReadOperations: process.resourceUsage().fsRead,
  };
  await mkdir(dirname(context.path), { recursive: true, mode: 0o700 });
  await appendFile(context.path, `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
}

export function assertImmutableWarmupEnvironment(environment: NodeJS.ProcessEnv): void {
  if (environment[PRODUCT_IDENTITY.environment.immutableWarmup] !== "1") {
    throw new Error("warmup entry is private to verified update activation");
  }
}

/** Enable the compile cache directly from launch environment without loading profile services. */
export function enableEnvironmentCompileCache(environment: NodeJS.ProcessEnv): string | null {
  const home = environment.HOME ?? environment.USERPROFILE ?? homedir();
  const dataDir = resolve(environment[PRODUCT_IDENTITY.environment.dataDir]
    ?? (platform() === "win32"
      ? resolve(environment.LOCALAPPDATA ?? home, PRODUCT_IDENTITY.state.windowsControlDirectory)
      : resolve(environment.XDG_DATA_HOME ?? resolve(home, ".local", "share"), PRODUCT_IDENTITY.state.unixControlDirectory)));
  return enableStartupCompileCache(
    dataDir,
    environment[PRODUCT_IDENTITY.environment.releaseId] ?? null,
    parseLayerIds(environment[PRODUCT_IDENTITY.environment.releaseLayers]),
  );
}

/** Enable Node's supported persistent compile cache in an immutable-identity namespace. */
export function enableStartupCompileCache(dataDir: string, releaseId: string | null, dependencyLayerIds: readonly string[]): string | null {
  try {
    const path = startupCompileCachePath(dataDir, releaseId, dependencyLayerIds);
    const result = enableCompileCache(path);
    return result.status === moduleConstants.compileCacheStatus.FAILED ? null : result.directory ?? path;
  } catch {
    return null;
  }
}

export function startupCompileCachePath(dataDir: string, releaseId: string | null, dependencyLayerIds: readonly string[]): string {
  const layers = createHash("sha256").update(dependencyLayerIds.join("\0")).digest("hex").slice(0, 20);
  const content = dependencyLayerIds.length > 0
    ? `layers-${layers}`
    : `release-${(releaseId ?? "mutable").replace(/[^0-9A-Za-z.+_-]/g, "_")}`;
  // Stable layer paths intentionally share compiled dependency entries across product releases;
  // Node's own cache key still isolates each release-specific module path and source bytes.
  return resolve(dataDir, "cache", "compile", `${process.versions.modules ?? "node"}-${process.version.replace(/[^0-9A-Za-z.-]/g, "_")}-${content}`);
}

/** Retain current compile namespaces plus a bounded number of recent fallbacks. */
export async function collectCompileCaches(dataDir: string, protectedPaths: readonly string[], keepRecent = 2): Promise<void> {
  const root = resolve(dataDir, "cache", "compile");
  const protectedSet = new Set(protectedPaths.map(path => resolve(path)));
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  const candidates = await Promise.all(entries.filter(entry => entry.isDirectory()).map(async entry => {
    const path = resolve(root, entry.name);
    const metadata = await import("node:fs/promises").then(fs => fs.stat(path));
    return { path, mtimeMs: metadata.mtimeMs };
  }));
  const retainedRecent = new Set(candidates.filter(item => !protectedSet.has(item.path))
    .sort((left, right) => right.mtimeMs - left.mtimeMs)
    .slice(0, keepRecent)
    .map(item => item.path));
  for (const candidate of candidates) {
    if (!protectedSet.has(candidate.path) && !retainedRecent.has(candidate.path)) await rm(candidate.path, { recursive: true, force: true });
  }
}

export function assertStartupPerformanceBudget(
  evidence: StartupPerformanceEvidence,
  budgets: { readonly postUpdateMs: number; readonly warmMs: number } = { postUpdateMs: 5_000, warmMs: 3_000 },
): void {
  const events = [...evidence.events].sort((left, right) => left.elapsedMs - right.elapsedMs);
  const ready = events.findLast(event => event.phase === "first-input-ready-render");
  if (!ready) throw new Error(`startup budget failed for ${evidence.profileId}: first input-ready render was not recorded`);
  const budget = evidence.launchKind === "post-update" ? budgets.postUpdateMs : budgets.warmMs;
  if (ready.elapsedMs <= budget) return;
  const intervals = events.map((event, index) => ({
    phase: event.phase,
    durationMs: event.elapsedMs - (events[index - 1]?.elapsedMs ?? 0),
  })).sort((left, right) => right.durationMs - left.durationMs);
  throw new Error(`startup budget failed for ${evidence.profileId} ${evidence.launchKind}: ${Math.round(ready.elapsedMs)}ms exceeds ${budget}ms; dominant phases: ${intervals.slice(0, 3).map(item => `${item.phase} ${Math.round(item.durationMs)}ms`).join(", ")}`);
}

export function parseStartupTrace(source: string): readonly StartupTraceEvent[] {
  const events = source.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line) as StartupTraceEvent);
  for (const event of events) {
    if (event.schema !== PRODUCT_IDENTITY.evidence.startupTraceSchema || typeof event.traceId !== "string"
      || typeof event.phase !== "string" || !Number.isFinite(event.elapsedMs) || !Array.isArray(event.dependencyLayerIds)) {
      throw new Error("startup trace contains an invalid event");
    }
  }
  return events.sort((left, right) => left.elapsedMs - right.elapsedMs);
}

function parseContext(value: string | undefined): StartupTraceContext | null {
  if (!value?.startsWith("{")) return null;
  try {
    const context = JSON.parse(value) as StartupTraceContext;
    if (typeof context.path !== "string" || typeof context.traceId !== "string" || !Number.isFinite(context.startedAtMs)
      || typeof context.profileId !== "string" || !Array.isArray(context.dependencyLayerIds)) return null;
    return context;
  } catch {
    return null;
  }
}

function parseLayerIds(value: string | undefined): readonly string[] {
  if (!value) return [];
  return [...new Set(value.split(",").filter(id => /^dependencies-[a-f0-9]{32}$/.test(id)))].sort();
}
