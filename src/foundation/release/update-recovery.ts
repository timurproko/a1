import { createHash, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { chmod, lstat, mkdir, open, readFile, readdir, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import { processIsAlive } from "./process-cleanup.js";
import type { UpdateTransaction, UpdateRecoveryState } from "./update-transaction.js";

export const UPDATE_RECOVERY_SCHEMA = "a1-update-recovery-v1" as const;
const WORKER_TIMEOUT_MS = 15 * 60 * 1_000;
const POLL_MS = 50;

export interface UpdateRecoveryCapsule {
  readonly schema: typeof UPDATE_RECOVERY_SCHEMA;
  readonly transactionId: string;
  readonly packageName: string;
  readonly targetVersion: string;
  readonly packageRoot: string;
  readonly globalRoot: string;
  readonly launcherRoot: string;
  readonly launchers: readonly string[];
  readonly priorReleaseId: string;
  readonly priorReleaseRoot: string;
  readonly priorContentDigest: string;
  readonly releaseManifestName: string;
  readonly recoveryEntry: string;
  readonly recoveryEntryDigest: string;
  readonly nodeExecutable: string;
  readonly npmCli: string;
  readonly npmArguments: readonly string[];
  readonly cancellationPath: string;
  readonly resultPath: string;
  readonly ownerPath: string;
  readonly createdAt: string;
}

export interface UpdateRecoveryResult {
  readonly schema: typeof UPDATE_RECOVERY_SCHEMA;
  readonly transactionId: string;
  readonly outcome: "installed" | "recovery-launcher" | "failed";
  readonly npmExitCode: number | null;
  readonly cancelled: boolean;
  readonly launcherDisposition: "target" | "recovery" | "unavailable";
  readonly stdout: string;
  readonly stderr: string;
  readonly completedAt: string;
}

export interface ProtectedPackageReplacementOptions {
  readonly dataDir: string;
  readonly globalRoot: string;
  readonly packageRoot: string;
  readonly transaction: UpdateTransaction;
  readonly priorRelease: { readonly releaseId: string; readonly releaseRoot: string; readonly contentDigest: string };
  readonly output: { stderr(message: string): void };
  readonly environment?: NodeJS.ProcessEnv;
  readonly platform?: NodeJS.Platform;
  readonly timeoutMs?: number;
  readonly workerSpawner?: (entry: string, manifestPath: string, environment: NodeJS.ProcessEnv) => Promise<void>;
  readonly onRecoveryState?: (state: UpdateRecoveryState) => Promise<void>;
}

export interface ProtectedPackageReplacementResult extends UpdateRecoveryResult {
  readonly recovery: UpdateRecoveryState;
}

/** Resolve the complete public launcher set npm owns for the active platform. */
export function updateLauncherPaths(globalRoot: string, platform: NodeJS.Platform = process.platform): readonly string[] {
  const launcherRoot = platform === "win32" ? dirname(globalRoot) : resolve(globalRoot, "..", "..", "bin");
  return platform === "win32"
    ? [resolve(launcherRoot, "a1"), resolve(launcherRoot, "a1.cmd"), resolve(launcherRoot, "a1.ps1")]
    : [resolve(launcherRoot, "a1")];
}

/** Validate transaction-scoped recovery authority without trusting npm temporary names. */
export async function readUpdateRecoveryCapsule(manifestPath: string, platform: NodeJS.Platform = process.platform): Promise<UpdateRecoveryCapsule> {
  const capsule = JSON.parse(await readFile(manifestPath, "utf8")) as UpdateRecoveryCapsule;
  if (capsule.schema !== UPDATE_RECOVERY_SCHEMA || !/^[0-9a-f-]{36}$/i.test(capsule.transactionId) || typeof capsule.targetVersion !== "string"
    || capsule.packageName !== PRODUCT_TEXT.packageName || typeof capsule.packageRoot !== "string" || typeof capsule.globalRoot !== "string"
    || typeof capsule.launcherRoot !== "string" || !Array.isArray(capsule.launchers) || typeof capsule.priorReleaseId !== "string"
    || typeof capsule.priorReleaseRoot !== "string" || !/^[a-f0-9]{64}$/.test(capsule.priorContentDigest) || capsule.releaseManifestName !== PRODUCT_IDENTITY.manifest.releaseFilename || typeof capsule.recoveryEntry !== "string"
    || !/^[a-f0-9]{64}$/.test(capsule.recoveryEntryDigest) || typeof capsule.nodeExecutable !== "string" || typeof capsule.npmCli !== "string" || !Array.isArray(capsule.npmArguments)
    || typeof capsule.cancellationPath !== "string" || typeof capsule.resultPath !== "string" || typeof capsule.ownerPath !== "string") {
    throw new Error("invalid A1 update recovery capsule");
  }
  const canonicalGlobal = await realpath(capsule.globalRoot);
  const canonicalPackage = await realpath(capsule.packageRoot).catch(() => resolve(capsule.packageRoot));
  const expectedPackage = resolve(canonicalGlobal, ...capsule.packageName.split("/"));
  if (!samePath(canonicalPackage, expectedPackage) || !containedBy(canonicalGlobal, canonicalPackage)) throw new Error("recovery package root is outside npm global root");
  const expectedNpmArguments = ["install", "--global", "--loglevel=error", "--no-fund", "--no-audit", `${capsule.packageName}@${capsule.targetVersion}`];
  if (JSON.stringify(capsule.npmArguments) !== JSON.stringify(expectedNpmArguments)) throw new Error("recovery npm arguments differ from the selected target");
  const expectedLaunchers = updateLauncherPaths(canonicalGlobal, platform);
  if (JSON.stringify(capsule.launchers.map(path => resolve(path))) !== JSON.stringify(expectedLaunchers.map(path => resolve(path)))) {
    throw new Error("recovery launcher set differs from the canonical npm launcher set");
  }
  for (const path of capsule.launchers) assertDirectChild(resolve(capsule.launcherRoot), resolve(path));
  const lexicalCapsuleRoot = dirname(resolve(manifestPath));
  if (lexicalCapsuleRoot.split(sep).at(-1) !== capsule.transactionId) throw new Error("recovery capsule path differs from its transaction identity");
  const capsuleRoot = await realpath(lexicalCapsuleRoot);
  const entry = await realpath(capsule.recoveryEntry);
  assertDirectChild(capsuleRoot, entry);
  if (!samePath(entry, resolve(capsuleRoot, "recovery.js"))) throw new Error("recovery entry path differs from the managed capsule");
  const expectedSidecars = [resolve(lexicalCapsuleRoot, "cancel.json"), resolve(lexicalCapsuleRoot, "result.json"), resolve(lexicalCapsuleRoot, "owner.json")];
  if (![capsule.cancellationPath, capsule.resultPath, capsule.ownerPath].every((path, index) => samePath(resolve(path), expectedSidecars[index]!))) {
    throw new Error("recovery sidecar paths differ from the managed capsule");
  }
  const dataDir = dirname(dirname(capsuleRoot));
  const releasesRoot = await realpath(resolve(dataDir, "releases"));
  const priorReleaseRoot = await realpath(capsule.priorReleaseRoot);
  assertDirectChild(releasesRoot, priorReleaseRoot);
  if (priorReleaseRoot.split(sep).at(-1) !== capsule.priorReleaseId) throw new Error("recovery prior release identity is invalid");
  const priorManifest = JSON.parse(await readFile(resolve(priorReleaseRoot, capsule.releaseManifestName), "utf8")) as Record<string, unknown>;
  if (priorManifest.releaseId !== capsule.priorReleaseId || priorManifest.contentDigest !== capsule.priorContentDigest) {
    throw new Error("recovery prior release manifest differs from the capsule");
  }
  if (resolve(capsule.nodeExecutable) !== resolve(process.execPath)) throw new Error("recovery Node executable differs from the current runtime");
  const npmMetadata = await lstat(capsule.npmCli);
  if (!npmMetadata.isFile() || npmMetadata.isSymbolicLink()) throw new Error("recovery npm entry is invalid");
  const digest = createHash("sha256").update(await readFile(entry)).digest("hex");
  if (digest !== capsule.recoveryEntryDigest) throw new Error("recovery entry digest differs from capsule");
  return capsule;
}

/** Prepare durable recovery authority before npm can mutate the live launcher set. */
export async function prepareUpdateRecoveryCapsule(options: ProtectedPackageReplacementOptions): Promise<{ capsule: UpdateRecoveryCapsule; manifestPath: string }> {
  const root = resolve(options.dataDir, "update-recovery");
  await mkdir(root, { recursive: true, mode: 0o700 });
  const finalRoot = resolve(root, options.transaction.transactionId);
  const existingManifest = resolve(finalRoot, "capsule.json");
  if (await lstat(existingManifest).catch(() => null)) return { capsule: await readUpdateRecoveryCapsule(existingManifest, options.platform), manifestPath: existingManifest };
  const candidate = resolve(root, `.candidate-${options.transaction.transactionId}-${randomUUID()}`);
  await mkdir(candidate, { mode: 0o700 });
  try {
    const sourceEntry = fileURLToPath(new URL("../../../bin/update-recovery.js", import.meta.url));
    const entryBytes = await readFile(sourceEntry);
    const candidateEntry = resolve(candidate, "recovery.js");
    const recoveryEntry = resolve(finalRoot, "recovery.js");
    await writeFile(candidateEntry, entryBytes, { flag: "wx", mode: 0o500 });
    await chmod(candidateEntry, 0o500);
    const canonicalGlobal = await realpath(options.globalRoot);
    const platform = options.platform ?? process.platform;
    const launcherRoot = platform === "win32" ? dirname(canonicalGlobal) : resolve(canonicalGlobal, "..", "..", "bin");
    const npmCli = await resolveNpmCli(canonicalGlobal, options.environment ?? process.env);
    const capsule: UpdateRecoveryCapsule = {
      schema: UPDATE_RECOVERY_SCHEMA,
      transactionId: options.transaction.transactionId,
      packageName: PRODUCT_TEXT.packageName,
      targetVersion: options.transaction.targetVersion,
      packageRoot: resolve(options.packageRoot),
      globalRoot: canonicalGlobal,
      launcherRoot,
      launchers: updateLauncherPaths(canonicalGlobal, platform),
      priorReleaseId: options.priorRelease.releaseId,
      priorReleaseRoot: resolve(options.priorRelease.releaseRoot),
      priorContentDigest: options.priorRelease.contentDigest,
      releaseManifestName: PRODUCT_IDENTITY.manifest.releaseFilename,
      recoveryEntry,
      recoveryEntryDigest: createHash("sha256").update(entryBytes).digest("hex"),
      nodeExecutable: process.execPath,
      npmCli,
      npmArguments: ["install", "--global", "--loglevel=error", "--no-fund", "--no-audit", `${PRODUCT_TEXT.packageName}@${options.transaction.targetVersion}`],
      cancellationPath: resolve(finalRoot, "cancel.json"),
      resultPath: resolve(finalRoot, "result.json"),
      ownerPath: resolve(finalRoot, "owner.json"),
      createdAt: new Date().toISOString(),
    };
    await writeDurableJson(resolve(candidate, "capsule.json"), capsule);
    try {
      await rename(candidate, finalRoot);
    } catch (error) {
      if (!await lstat(finalRoot).catch(() => null)) throw error;
      await rm(candidate, { recursive: true, force: true });
    }
    const manifestPath = resolve(finalRoot, "capsule.json");
    return { capsule: await readUpdateRecoveryCapsule(manifestPath, options.platform), manifestPath };
  } catch (error) {
    await rm(candidate, { recursive: true, force: true });
    throw error;
  }
}

/** Execute global replacement behind a detached owner and coordinate terminal cancellation. */
export async function runProtectedPackageReplacement(options: ProtectedPackageReplacementOptions): Promise<ProtectedPackageReplacementResult> {
  const prepared = await prepareUpdateRecoveryCapsule(options);
  const capsule = prepared.capsule;
  await options.onRecoveryState?.({
    capsulePath: prepared.manifestPath,
    status: "prepared",
    guardianPid: null,
    guardianStartIdentity: null,
    cancellationRequested: false,
    launcherDisposition: "pending",
  });
  let owner = await readLiveRecoveryOwner(capsule.ownerPath, capsule.transactionId);
  const ownerIsLive = owner !== null;
  const priorResult = await readRecoveryResult(capsule.resultPath, capsule.transactionId).catch(() => null);
  if (!ownerIsLive && priorResult?.outcome !== "installed") {
    const startLease = resolve(dirname(prepared.manifestPath), "worker-starting.lock");
    if (await acquireStartLease(startLease)) {
      await Promise.all([rm(capsule.resultPath, { force: true }), rm(capsule.cancellationPath, { force: true }), rm(capsule.ownerPath, { force: true })]);
      owner = null;
      try {
        await (options.workerSpawner ?? spawnRecoveryWorker)(capsule.recoveryEntry, prepared.manifestPath, options.environment ?? process.env);
      } catch (error) {
        await rm(startLease, { force: true });
        throw error;
      }
    }
  }

  let runningRecorded = false;
  let cancellationReported = false;
  let cancellationWrite: Promise<void> | null = null;
  const requestCancellation = (signal: NodeJS.Signals) => {
    cancellationWrite ??= writeDurableJson(capsule.cancellationPath, { schema: UPDATE_RECOVERY_SCHEMA, transactionId: capsule.transactionId, signal, requestedAt: new Date().toISOString() });
    if (!cancellationReported) {
      cancellationReported = true;
      options.output.stderr(`${PRODUCT_TEXT.diagnostic("cancellation requested; restoring a callable launcher before exiting.")}\n`);
    }
  };
  const onSigint = () => requestCancellation("SIGINT");
  const onSigterm = () => requestCancellation("SIGTERM");
  process.on("SIGINT", onSigint);
  process.on("SIGTERM", onSigterm);
  try {
    const deadline = Date.now() + (options.timeoutMs ?? WORKER_TIMEOUT_MS);
    while (Date.now() < deadline) {
      const result = await readRecoveryResult(capsule.resultPath, capsule.transactionId).catch(() => null);
      if (result) {
        const recovery: UpdateRecoveryState = {
          capsulePath: prepared.manifestPath,
          status: result.outcome === "installed" ? "package-installed" : "recovery-launcher",
          guardianPid: typeof owner?.pid === "number" ? owner.pid : null,
          guardianStartIdentity: typeof owner?.startIdentity === "string" ? owner.startIdentity : null,
          cancellationRequested: result.cancelled,
          launcherDisposition: result.launcherDisposition,
        };
        if (cancellationWrite) await cancellationWrite;
        await options.onRecoveryState?.(recovery);
        return { ...result, recovery };
      }
      owner = await readLiveRecoveryOwner(capsule.ownerPath, capsule.transactionId) ?? owner;
      if (!runningRecorded && owner?.transactionId === capsule.transactionId && typeof owner.pid === "number" && typeof owner.startIdentity === "string") {
        runningRecorded = true;
        await rm(resolve(dirname(prepared.manifestPath), "worker-starting.lock"), { force: true });
        await options.onRecoveryState?.({
          capsulePath: prepared.manifestPath,
          status: "running",
          guardianPid: owner.pid,
          guardianStartIdentity: owner.startIdentity,
          cancellationRequested: false,
          launcherDisposition: "pending",
        });
      }
      await new Promise(resolvePromise => setTimeout(resolvePromise, POLL_MS));
    }
    requestCancellation("SIGTERM");
    if (cancellationWrite) await cancellationWrite;
    throw new Error("A1 update recovery guardian timed out before establishing a callable launcher");
  } finally {
    process.off("SIGINT", onSigint);
    process.off("SIGTERM", onSigterm);
    try { await cancellationWrite; } catch {}
  }
}

export async function removeUpdateRecoveryCapsule(dataDir: string, transactionId: string): Promise<void> {
  if (!/^[0-9a-f-]+$/i.test(transactionId)) throw new Error("invalid update recovery transaction identity");
  await rm(resolve(dataDir, "update-recovery", transactionId), { recursive: true, force: true });
}

/** Classify a complete launcher set without following linked or mixed launcher files. */
export async function inspectUpdateLauncherSet(capsule: UpdateRecoveryCapsule, platform: NodeJS.Platform = process.platform): Promise<"target" | "recovery" | "unavailable"> {
  let disposition: "target" | "recovery" | null = null;
  const targetToken = `node_modules/${capsule.packageName}/bin/cli.js`;
  for (const path of capsule.launchers) {
    const metadata = await lstat(path).catch(() => null);
    if (!metadata?.isFile() || metadata.isSymbolicLink() || (platform !== "win32" && (metadata.mode & 0o111) === 0)) return "unavailable";
    const source = (await readFile(path, "utf8")).replaceAll("\\", "/");
    const current = source.includes(capsule.recoveryEntry.replaceAll("\\", "/")) ? "recovery" as const
      : source.includes(targetToken) ? "target" as const : null;
    if (current === null || disposition !== null && disposition !== current) return "unavailable";
    disposition = current;
  }
  return disposition ?? "unavailable";
}

/** Remove terminal recovery capsules only after no canonical launcher references them. */
export async function cleanupUpdateRecoveryCapsules(dataDir: string): Promise<void> {
  const root = resolve(dataDir, "update-recovery");
  for (const entry of await readdir(root, { withFileTypes: true }).catch(() => [])) {
    if (!entry.isDirectory() || entry.name.startsWith(".candidate-")) continue;
    const capsuleRoot = resolve(root, entry.name);
    const manifestPath = resolve(capsuleRoot, "capsule.json");
    try {
      const capsule = await readUpdateRecoveryCapsule(manifestPath);
      if (await inspectUpdateLauncherSet(capsule) !== "recovery") await rm(capsuleRoot, { recursive: true, force: true });
    } catch {
      // Security: malformed recovery authority is retained for diagnostics rather than used as deletion authority.
    }
  }
}

async function spawnRecoveryWorker(entry: string, manifestPath: string, environment: NodeJS.ProcessEnv): Promise<void> {
  const child = spawn(process.execPath, [entry, "--worker", manifestPath], { detached: true, stdio: "ignore", windowsHide: true, env: environment });
  await new Promise<void>((resolvePromise, rejectPromise) => {
    child.once("spawn", resolvePromise);
    child.once("error", rejectPromise);
  });
  child.unref();
}

async function resolveNpmCli(globalRoot: string, environment: NodeJS.ProcessEnv): Promise<string> {
  const candidates = [environment.npm_execpath, resolve(globalRoot, "npm", "bin", "npm-cli.js")].filter((value): value is string => typeof value === "string" && value.length > 0);
  for (const candidate of candidates) {
    const canonical = await realpath(candidate).catch(() => null);
    if (canonical && await lstat(canonical).then(metadata => metadata.isFile()).catch(() => false)) return canonical;
  }
  throw new Error("could not resolve npm's JavaScript entry for protected package replacement");
}

async function readLiveRecoveryOwner(path: string, transactionId: string): Promise<{ transactionId?: unknown; pid?: unknown; startIdentity?: unknown } | null> {
  const owner = await readJson<{ transactionId?: unknown; pid?: unknown; startIdentity?: unknown }>(path).catch(() => null);
  const metadata = await lstat(path).catch(() => null);
  if (!owner || owner.transactionId !== transactionId || typeof owner.pid !== "number" || typeof owner.startIdentity !== "string"
    || !metadata || Date.now() - metadata.mtimeMs > 2_000 || !processIsAlive(owner.pid)) return null;
  return owner;
}

async function acquireStartLease(path: string): Promise<boolean> {
  try {
    const file = await open(path, "wx", 0o600);
    await file.writeFile(JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() }));
    await file.close();
    return true;
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
    const metadata = await lstat(path).catch(() => null);
    if (metadata && Date.now() - metadata.mtimeMs > 5_000) {
      await rm(path, { force: true });
      return await acquireStartLease(path);
    }
    return false;
  }
}

async function readRecoveryResult(path: string, transactionId: string): Promise<UpdateRecoveryResult | null> {
  const value = await readJson<UpdateRecoveryResult>(path).catch(error => {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
    throw error;
  });
  if (value === null) return null;
  if (value.schema !== UPDATE_RECOVERY_SCHEMA || value.transactionId !== transactionId || !["installed", "recovery-launcher", "failed"].includes(value.outcome)
    || !["target", "recovery", "unavailable"].includes(value.launcherDisposition) || typeof value.cancelled !== "boolean"
    || typeof value.stdout !== "string" || typeof value.stderr !== "string") throw new Error("invalid A1 update recovery result");
  return value;
}

async function writeDurableJson(path: string, value: unknown): Promise<void> {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); }
  finally { await file.close(); }
  await rename(temporary, path);
}

async function readJson<T>(path: string): Promise<T> { return JSON.parse(await readFile(path, "utf8")) as T; }
function samePath(left: string, right: string): boolean {
  return process.platform === "win32" ? resolve(left).toLowerCase() === resolve(right).toLowerCase() : resolve(left) === resolve(right);
}
function containedBy(parent: string, child: string): boolean {
  const fromParent = relative(parent, child);
  return fromParent.length > 0 && fromParent !== ".." && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent);
}
function assertDirectChild(parent: string, child: string): void {
  const expectedParent = resolve(parent);
  const actualParent = dirname(resolve(child));
  const matches = process.platform === "win32"
    ? actualParent.toLowerCase() === expectedParent.toLowerCase()
    : actualParent === expectedParent;
  if (!matches) throw new Error(`update recovery path is outside its managed root: ${child}`);
}
