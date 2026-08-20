import { spawn, type StdioOptions } from "node:child_process";
import { access, readFile, realpath } from "node:fs/promises";
import { connect } from "node:net";
import { isAbsolute, relative, resolve, sep } from "node:path";
import crossSpawn from "cross-spawn";
import { valid as validSemver } from "semver";
import { PRODUCT_IDENTITY, PRODUCT_TEXT } from "../../product-identity.js";
import {
  certifyMaterializedRelease,
  probeOwnership,
  readEndpointMetadata,
  removeEndpointArtifacts,
  startSupervisor,
  waitForProcessExit,
  waitForVerifiedEndpoint,
} from "./bootstrap.js";
import { resolveProductPaths } from "../lifecycle/index.js";
import { encodeFrame, LineFrameDecoder } from "../protocol/index.js";
import { CohortStateStore, type SupervisorEndpointMetadata } from "./cohort-state.js";
import { cleanupVerifiedOwner, processIsAlive } from "./process-cleanup.js";
import { materializeRelease, readMaterializedRelease } from "./release-store.js";
import { UpdateTransactionStore, type UpdateTransaction, type UpdateTransactionPhase } from "./update-transaction.js";

export const A1_PACKAGE = PRODUCT_TEXT.packageName;
export type UpdateChannel = "stable" | "next";
const UPDATE_DIST_TAGS: Readonly<Record<UpdateChannel, "latest" | "next">> = { stable: "latest", next: "next" };

export interface ProcessRequest { captureStdout: boolean }
export interface ProcessResult { code: number | null; stdout: string }
export type UpdateProcessRunner = (command: string, arguments_: readonly string[], request: ProcessRequest) => Promise<ProcessResult>;
export interface UpdateFileSystem {
  readFile(path: string): Promise<string>;
  realpath(path: string): Promise<string>;
  access?(path: string): Promise<void>;
}
export interface UpdateOutput { stdout(message: string): void; stderr(message: string): void }
export interface SelfUpdateOptions {
  packageRoot: string;
  channel?: UpdateChannel;
  environment?: NodeJS.ProcessEnv;
  fileSystem?: UpdateFileSystem;
  output?: UpdateOutput;
  runner?: UpdateProcessRunner;
  lifecycle?: UpdateLifecycleCoordinator;
  transactionStore?: UpdateTransactionJournal;
}
export interface UpdateLifecycleCoordinator {
  targetIsActive(targetVersion: string): Promise<boolean>;
  shutdownVerifiedOwners(targetVersion: string): Promise<{ priorActiveVersion: string | null }>;
  verifyPackageUnlocked(packageRoot: string): Promise<void>;
  activateInstalled(packageRoot: string, targetVersion: string, phase: (phase: UpdateTransactionPhase) => Promise<void>): Promise<void>;
}
export interface UpdateTransactionJournal {
  readonly path: string;
  read(): Promise<UpdateTransaction | null>;
  begin(input: { channel: UpdateChannel; targetVersion: string; packageRoot: string; priorActiveReleaseId: string | null }): Promise<UpdateTransaction>;
  advance(phase: UpdateTransactionPhase): Promise<UpdateTransaction>;
  finish(status: "completed" | "rolled-back" | "failed", error?: string | null): Promise<UpdateTransaction>;
  clearCompleted(): Promise<void>;
}

const defaultFileSystem: UpdateFileSystem = {
  async readFile(path) { return await readFile(path, "utf8"); },
  realpath,
  access,
};
const defaultOutput: UpdateOutput = {
  stdout(message) { process.stdout.write(message); },
  stderr(message) { process.stderr.write(message); },
};

export function createNpmProcessRunner(platform: NodeJS.Platform = process.platform): UpdateProcessRunner {
  return async (command, arguments_, request) => await new Promise((resolvePromise, rejectPromise) => {
    const stdio: StdioOptions = request.captureStdout ? ["ignore", "pipe", "inherit"] : ["inherit", "inherit", "inherit"];
    const child = platform === "win32" ? crossSpawn(command, [...arguments_], { stdio }) : spawn(command, [...arguments_], { stdio });
    const stdout: Buffer[] = [];
    child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
    let settled = false;
    child.once("error", error => { if (!settled) { settled = true; rejectPromise(error); } });
    child.once("close", code => { if (!settled) { settled = true; resolvePromise({ code, stdout: Buffer.concat(stdout).toString("utf8") }); } });
  });
}

export function createUpdateLifecycleCoordinator(
  environment: NodeJS.ProcessEnv = process.env,
  fileSystem: UpdateFileSystem = defaultFileSystem,
): UpdateLifecycleCoordinator {
  const paths = resolveProductPaths(environment);
  const stateStore = new CohortStateStore(paths.dataDir);
  return {
    async targetIsActive(targetVersion) {
      const state = await stateStore.read();
      const activeId = state.references.active;
      if (!activeId || state.releases[activeId]?.packageVersion !== targetVersion) return false;
      const endpoint = await readEndpointMetadata(paths.endpointMetadataPath);
      return endpoint?.releaseId === activeId && await probeOwnership(endpoint) === "live-verified";
    },
    async shutdownVerifiedOwners(targetVersion) {
      const state = await stateStore.read();
      const priorActiveVersion = state.references.active ? state.releases[state.references.active]?.packageVersion ?? null : null;
      const endpoint = await readEndpointMetadata(paths.endpointMetadataPath);
      if (!endpoint) return { priorActiveVersion };
      const ownership = await probeOwnership(endpoint);
      if (ownership !== "live-verified" && ownership !== "dead") {
        throw new Error(PRODUCT_TEXT.diagnostic(`refused update shutdown because supervisor ownership is ${ownership}`));
      }
      const immutableRoot = await canonicalImmutableRoot(paths.dataDir, endpoint.releaseRoot);
      const legacyMutableInstall = ownership === "live-verified" && !immutableRoot;
      const identity = ownership === "dead"
        ? { accepted: false, reason: "recorded owner is dead" }
        : await requestUpdateShutdown(endpoint, targetVersion, 2_000);
      if (!identity.accepted && processIsAlive(endpoint.pid)) {
        // Explicit update consent permits bounded cleanup of an authenticated
        // older owner that predates the update-shutdown message.
        const cleanup = await cleanupVerifiedOwner(endpoint, {
          allowLiveGenerations: true,
          reason: legacyMutableInstall ? "legacy-mutable-install" : "explicit-update",
        });
        if (!cleanup.terminated) throw new Error(`verified ${PRODUCT_TEXT.displayName} owner ${endpoint.pid} rejected shutdown and could not be terminated: ${identity.reason}`);
      } else if (identity.accepted) {
        await waitForProcessExit(endpoint.pid, 3_000).catch(async () => {
          const cleanup = await cleanupVerifiedOwner(endpoint, {
            allowLiveGenerations: true,
            reason: legacyMutableInstall ? "legacy-mutable-install" : "explicit-update",
          });
          if (!cleanup.terminated) throw new Error(`verified ${PRODUCT_TEXT.displayName} owner ${endpoint.pid} did not terminate`);
        });
      }
      await removeEndpointArtifacts(paths.endpointMetadataPath, paths.endpoint);
      return { priorActiveVersion };
    },
    async verifyPackageUnlocked(packageRoot) {
      if (fileSystem.access) await fileSystem.access(packageRoot);
      const probe = `${packageRoot}.${PRODUCT_IDENTITY.filesystem.slug}-unlock-probe`;
      const { rename } = await import("node:fs/promises");
      try {
        await rename(packageRoot, probe);
        await rename(probe, packageRoot);
      } catch (error) {
        // Best-effort rollback if the first rename succeeded and the second did not.
        await rename(probe, packageRoot).catch(() => {});
        throw new Error(PRODUCT_TEXT.diagnostic(`package remains locked after verified shutdown: ${errorMessage(error)}`));
      }
    },
    async activateInstalled(packageRoot, targetVersion, phase) {
      const candidate = await materializeRelease(packageRoot, paths.dataDir);
      if (candidate.packageVersion !== targetVersion) throw new Error(`installed ${PRODUCT_TEXT.displayName} version ${candidate.packageVersion} does not match target ${targetVersion}`);
      await stateStore.recordCandidate(candidate);
      await phase("materialized");
      const diagnostics = await certifyMaterializedRelease(candidate, paths.dataDir);
      await stateStore.approve(candidate.releaseId, diagnostics);
      await phase("certified");
      await stateStore.activate(candidate.releaseId);
      await phase("active-reference-committed");
      await startSupervisor(candidate, environment);
      await waitForVerifiedEndpoint(paths.endpointMetadataPath, candidate, 8_000);
    },
  };
}

export async function runSelfUpdate(options: SelfUpdateOptions): Promise<number> {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const output = options.output ?? defaultOutput;
  const runner = options.runner ?? createNpmProcessRunner();
  const channel = options.channel ?? "stable";
  const distTag = UPDATE_DIST_TAGS[channel];

  let runningVersion: string;
  try {
    const packageJson = JSON.parse(await fileSystem.readFile(resolve(options.packageRoot, "package.json"))) as { version?: unknown };
    const parsedVersion = typeof packageJson.version === "string" ? validSemver(packageJson.version) : null;
    if (parsedVersion === null) throw new Error("package.json does not contain a valid semantic version");
    runningVersion = parsedVersion;
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not read its running package version: ${errorMessage(error)}`)}\n`);
    return 1;
  }

  const targetLookup = await runNpm(runner, ["view", `${A1_PACKAGE}@${distTag}`, "version"], true, output, `query the npm ${distTag} channel`);
  if (targetLookup.result === null) return targetLookup.exitCode;
  const targetVersion = validSemver(targetLookup.result.stdout.trim());
  if (targetVersion === null) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`received a malformed ${distTag} version from npm: ${JSON.stringify(targetLookup.result.stdout.trim())}.`)}\n`);
    return 1;
  }
  output.stdout(`${PRODUCT_TEXT.diagnostic(`update (${channel}): ${runningVersion} → ${targetVersion}.`)}\n`);

  const rootLookup = await runNpm(runner, ["root", "--global"], true, output, "resolve npm's global package root");
  if (rootLookup.result === null) return rootLookup.exitCode;
  if (rootLookup.result.stdout.trim().length === 0) {
    output.stderr(`${PRODUCT_TEXT.diagnostic("could not verify its installation because npm returned an empty global package root.")}\n`);
    return 1;
  }
  let packageRoot: string;
  let globalRoot: string;
  try {
    [packageRoot, globalRoot] = await Promise.all([fileSystem.realpath(options.packageRoot), fileSystem.realpath(rootLookup.result.stdout.trim())]);
  } catch (error) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not canonicalize the running and global npm paths: ${errorMessage(error)}`)}\n`);
    return 1;
  }
  if (!isContainedBy(globalRoot, packageRoot)) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`refused to update automatically because ${packageRoot} is not managed beneath npm's global package root ${globalRoot}.`)}\n`);
    return 1;
  }

  const environment = options.environment ?? process.env;
  const paths = resolveProductPaths(environment);
  const lifecycle = options.lifecycle ?? createUpdateLifecycleCoordinator(environment, fileSystem);
  const transactionStore = options.transactionStore ?? new UpdateTransactionStore(paths.dataDir);
  let transaction = await transactionStore.read();
  try {
    if (await lifecycle.targetIsActive(targetVersion)) {
      if (transaction?.status === "active") {
        await transactionStore.advance("supervisor-verified");
        await transactionStore.finish("completed");
      }
      await transactionStore.clearCompleted();
      output.stdout(`${PRODUCT_TEXT.diagnostic("is already current and active for this channel; no installation was changed.")}\n`);
      return 0;
    }
    const cohortState = await new CohortStateStore(paths.dataDir).read();
    transaction = await transactionStore.begin({
      channel,
      targetVersion,
      packageRoot,
      priorActiveReleaseId: cohortState.references.active,
    });
    if (phaseBefore(transaction.phase, "ownership-released")) {
      await lifecycle.shutdownVerifiedOwners(targetVersion);
      await lifecycle.verifyPackageUnlocked(packageRoot);
      transaction = await transactionStore.advance("ownership-released");
    }

    if (phaseBefore(transaction.phase, "package-installed")) {
      output.stdout(`${PRODUCT_TEXT.diagnostic(`is installing ${PRODUCT_TEXT.packageName}@${targetVersion}.`)}\n`);
      const installation = await runNpm(runner, ["install", "--global", `${A1_PACKAGE}@${targetVersion}`], false, output, "start the global npm installation", false);
      if (installation.result === null) throw new UpdateFailure(installation.exitCode, "npm process failed");
      if (installation.result.code !== 0) throw new UpdateFailure(unsuccessfulCode(installation.result.code), `npm exited with status ${formatExitCode(installation.result.code)}`);
      transaction = await transactionStore.advance("package-installed");
    }

    await lifecycle.activateInstalled(packageRoot, targetVersion, async phase => { transaction = await transactionStore.advance(phase); });
    await transactionStore.advance("supervisor-verified");
    await transactionStore.finish("completed");
    await transactionStore.clearCompleted();
    output.stdout(`${PRODUCT_TEXT.diagnostic(`updated successfully: ${targetVersion} (${channel}).`)}\n`);
    return 0;
  } catch (error) {
    const message = errorMessage(error);
    const rollback = options.lifecycle
      ? "previous test lifecycle retained"
      : await rollbackPriorCohort(paths.dataDir, environment, transaction?.priorActiveReleaseId ?? null).catch(rollbackError => `rollback failed: ${errorMessage(rollbackError)}`);
    if (transaction) await transactionStore.finish(rollback === "rolled back" ? "rolled-back" : "failed", `${message}; ${rollback}`);
    output.stderr(`${PRODUCT_TEXT.diagnostic(`update failed: ${message}. ${rollback}. Diagnostics: ${transactionStore.path}`)}\n`);
    return error instanceof UpdateFailure ? error.exitCode : 1;
  }
}

async function requestUpdateShutdown(metadata: SupervisorEndpointMetadata, targetVersion: string, timeoutMs: number): Promise<{ accepted: boolean; reason: string }> {
  if (!processIsAlive(metadata.pid)) return { accepted: false, reason: "recorded owner is dead" };
  return await new Promise(resolvePromise => {
    const socket = connect(metadata.endpoint);
    const decoder = new LineFrameDecoder();
    let settled = false;
    const finish = (value: { accepted: boolean; reason: string }) => {
      if (settled) return;
      settled = true;
      socket.destroy();
      resolvePromise(value);
    };
    socket.once("error", () => finish({ accepted: false, reason: "verified endpoint did not respond" }));
    socket.once("connect", () => socket.write(encodeFrame({ type: "release-update-ownership", bootNonce: metadata.bootNonce, targetVersion })));
    socket.on("data", chunk => {
      try {
        const message = decoder.push(chunk)[0] as Record<string, unknown> | undefined;
        if (message?.type === "release-update-result") finish({ accepted: message.accepted === true, reason: String(message.reason ?? "shutdown rejected") });
      } catch { finish({ accepted: false, reason: "invalid shutdown response" }); }
    });
    setTimeout(() => finish({ accepted: false, reason: "verified endpoint shutdown timed out" }), timeoutMs).unref();
  });
}

async function runNpm(runner: UpdateProcessRunner, arguments_: readonly string[], captureStdout: boolean, output: UpdateOutput, action: string, reportNonzero = true): Promise<{ result: ProcessResult | null; exitCode: number }> {
  let result: ProcessResult;
  try { result = await runner("npm", arguments_, { captureStdout }); }
  catch (error) { output.stderr(`${PRODUCT_TEXT.diagnostic(`could not execute npm to ${action}: ${errorMessage(error)}`)}\n`); return { result: null, exitCode: 1 }; }
  if (result.code !== 0 && reportNonzero) {
    output.stderr(`${PRODUCT_TEXT.diagnostic(`could not ${action}; npm exited with status ${formatExitCode(result.code)}. Review npm's diagnostics above.`)}\n`);
    return { result: null, exitCode: unsuccessfulCode(result.code) };
  }
  return { result, exitCode: 0 };
}
async function rollbackPriorCohort(dataDir: string, environment: NodeJS.ProcessEnv, priorReleaseId: string | null): Promise<string> {
  if (!priorReleaseId) return "no prior cohort was available for rollback";
  const stateStore = new CohortStateStore(dataDir);
  const state = await stateStore.read();
  const prior = state.releases[priorReleaseId];
  if (!prior || prior.approval !== "approved") return "prior cohort is not a verified rollback candidate";
  if (state.references.active !== priorReleaseId) {
    if (state.references.rollback === priorReleaseId) await stateStore.rollback(true);
    else throw new Error(`prior release ${priorReleaseId} is not the recorded rollback cohort`);
  }
  const release = await readMaterializedRelease(prior.releaseRoot);
  const paths = resolveProductPaths(environment);
  await startSupervisor(release, environment);
  await waitForVerifiedEndpoint(paths.endpointMetadataPath, release, 8_000);
  return "rolled back";
}

function phaseBefore(current: UpdateTransactionPhase, target: UpdateTransactionPhase): boolean {
  const phases = ["shutdown-intent", "ownership-released", "package-installed", "materialized", "certified", "active-reference-committed", "supervisor-verified"] as const;
  return phases.indexOf(current) < phases.indexOf(target);
}

class UpdateFailure extends Error {
  constructor(readonly exitCode: number, message: string) { super(message); }
}

async function canonicalImmutableRoot(dataDir: string, releaseRoot: string): Promise<boolean> {
  try {
    const [store, selected] = await Promise.all([realpath(resolve(dataDir, "releases")), realpath(releaseRoot)]);
    const fromStore = relative(store, selected);
    return fromStore.length > 0 && fromStore !== ".." && !fromStore.startsWith(`..${sep}`) && !isAbsolute(fromStore);
  } catch {
    return false;
  }
}

function isContainedBy(parent: string, child: string): boolean {
  const pathFromParent = relative(parent, child);
  return pathFromParent.length > 0 && pathFromParent !== ".." && !pathFromParent.startsWith(`..${sep}`) && !isAbsolute(pathFromParent);
}
function unsuccessfulCode(code: number | null): number { return code === null || code === 0 ? 1 : code; }
function formatExitCode(code: number | null): string { return code === null ? "unknown" : String(code); }
function errorMessage(error: unknown): string { return error instanceof Error ? error.message : String(error); }
