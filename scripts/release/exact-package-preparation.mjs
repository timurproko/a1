import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, relative, resolve, sep } from "node:path";
import { readPackedManifest } from "../governance/candidate-evidence.mjs";

export const EXACT_PACKAGE_PREPARATION_SCHEMA = "a1-exact-package-preparation-v1";
export const EXACT_PACKAGE_INSTALL_POLICY = "npm-global-ignore-scripts-prefer-offline-v1";
export const EXACT_PACKAGE_PREPARATION_ENV = Object.freeze({
  mode: "VALIDATION_EXACT_PACKAGE_PREPARATION",
  root: "VALIDATION_EXACT_PACKAGE_PREPARATION_ROOT",
  prefix: "VALIDATION_EXACT_PACKAGE_PREPARATION_PREFIX",
  receipt: "VALIDATION_EXACT_PACKAGE_PREPARATION_RECEIPT",
  consumers: "VALIDATION_EXACT_PACKAGE_CONSUMERS_JSON",
  consumer: "VALIDATION_EXACT_PACKAGE_CONSUMER",
});

const ALLOWED_CONSUMERS = new Set(["package-contracts", "package-startup"]);
const MAX_FILES = 16_384;
const MAX_BYTES = 512 * 1024 * 1024;
const MAX_PATH = 4_096;

export async function prepareExactPackageInstallation(options = {}) {
  const environment = options.environment ?? process.env;
  const candidatePath = boundedAbsolute(options.candidatePath ?? environment.VALIDATION_CANDIDATE_TARBALL, "candidate path");
  const consumers = validateConsumers(options.consumers);
  const lane = laneIdentity(environment, options.identity);
  const bytes = await readFile(candidatePath);
  const manifest = readPackedManifest(bytes);
  validatePackageIdentity(manifest);
  const root = await mkdtemp(resolve(options.rootParent ?? tmpdir(), "a1-exact-package-"));
  const prefix = resolve(root, "prefix");
  const packageRoot = installedPackageRoot(prefix, manifest.name, lane.platform);
  const receiptPath = resolve(root, "preparation.receipt.json");
  const npm = lane.platform === "win32" ? "npm.cmd" : "npm";
  const execute = options.runCommand ?? runCommand;
  const now = options.now ?? Date.now;
  const startedAt = now();

  try {
    await mkdir(prefix, { recursive: true });
    const installStartedAt = now();
    const installed = await execute(npm, installArguments(prefix, candidatePath), root, environment);
    if (installed.status !== 0) throw new Error(`exact-package clean install failed: ${installed.stderr || `exit ${installed.status}`}`);
    const installMs = Math.max(0, now() - installStartedAt);
    const proxyStartedAt = now();
    const synchronized = await execute(process.execPath, [resolve(packageRoot, "bin", "sync-pi-tui-proxy.js")], root, environment);
    if (synchronized.status !== 0) throw new Error(`exact-package proxy synchronization failed: ${synchronized.stderr || `exit ${synchronized.status}`}`);
    const proxySynchronizationMs = Math.max(0, now() - proxyStartedAt);

    const identityStartedAt = now();
    const installedIdentity = await installedPackageIdentity(packageRoot);
    const installedIdentityMs = Math.max(0, now() - identityStartedAt);
    const durationMs = Math.max(0, now() - startedAt);
    const payload = {
      schema: EXACT_PACKAGE_PREPARATION_SCHEMA,
      authority: "validation-runner",
      candidate: {
        sha256: sha256(bytes), size: bytes.length, name: manifest.name, version: manifest.version,
      },
      lane,
      install: {
        policy: EXACT_PACKAGE_INSTALL_POLICY,
        root,
        prefix,
        packageRoot,
        installedIdentity,
      },
      // Performance: the phases attribute the Windows cost to npm reification, proxy repair, or
      // the identity walk so a latency change can be judged on evidence rather than a guess.
      preparation: { count: 1, durationMs, proxySynchronizations: 1, phases: { installMs, proxySynchronizationMs, installedIdentityMs } },
      consumers,
    };
    const receipt = { ...payload, receiptId: digest(payload) };
    await writeFile(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    return { root, prefix, packageRoot, receiptPath, receipt, durationMs };
  } catch (error) {
    const cleanup = await cleanupRoot(root, options.removeRoot);
    if (error && typeof error === "object") error.cleanup = cleanup;
    throw error;
  }
}

export async function verifyExactPackagePreparation(options = {}) {
  const environment = options.environment ?? process.env;
  if (environment[EXACT_PACKAGE_PREPARATION_ENV.mode] !== "runner") throw new Error("authoritative exact-package preparation is not enabled");
  const root = boundedAbsolute(environment[EXACT_PACKAGE_PREPARATION_ENV.root], "preparation root");
  const prefix = boundedAbsolute(environment[EXACT_PACKAGE_PREPARATION_ENV.prefix], "preparation prefix");
  const receiptPath = boundedAbsolute(environment[EXACT_PACKAGE_PREPARATION_ENV.receipt], "preparation receipt");
  if (!inside(root, prefix) || !inside(root, receiptPath)) throw new Error("exact-package preparation paths escape their bounded root");

  const receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  assertReceipt(receipt);
  if (receipt.install.root !== root || receipt.install.prefix !== prefix) throw new Error("exact-package preparation paths contradict the environment handoff");
  if (!inside(prefix, receipt.install.packageRoot)) throw new Error("exact-package installed package escapes its prefix");

  const consumers = validateConsumers(JSON.parse(environment[EXACT_PACKAGE_PREPARATION_ENV.consumers] ?? "null"));
  if (canonical(receipt.consumers) !== canonical(consumers)) throw new Error("exact-package preparation consumers contradict the receipt");
  const consumer = options.consumer ?? environment[EXACT_PACKAGE_PREPARATION_ENV.consumer];
  if (!ALLOWED_CONSUMERS.has(consumer) || !consumers.includes(consumer)) throw new Error("exact-package preparation consumer is not authorized");

  const lane = laneIdentity(environment, options.identity);
  if (canonical(receipt.lane) !== canonical(lane)) throw new Error("exact-package preparation belongs to another validation lane");
  if (receipt.install.policy !== EXACT_PACKAGE_INSTALL_POLICY) throw new Error("exact-package preparation install policy is incompatible");

  const candidatePath = boundedAbsolute(options.candidatePath ?? environment.VALIDATION_CANDIDATE_TARBALL, "candidate path");
  const bytes = await readFile(candidatePath);
  const manifest = readPackedManifest(bytes);
  const candidate = { sha256: sha256(bytes), size: bytes.length, name: manifest.name, version: manifest.version };
  if (canonical(receipt.candidate) !== canonical(candidate)) throw new Error("exact-package preparation candidate identity is stale or contradictory");
  const expectedPackageRoot = installedPackageRoot(prefix, manifest.name, lane.platform);
  if (receipt.install.packageRoot !== expectedPackageRoot) throw new Error("exact-package preparation package path is contradictory");
  const installedIdentity = await installedPackageIdentity(expectedPackageRoot);
  if (canonical(receipt.install.installedIdentity) !== canonical(installedIdentity)) throw new Error("exact-package installed bytes changed after preparation");

  return { receipt, root, prefix, packageRoot: expectedPackageRoot, receiptPath, durationMs: receipt.preparation.durationMs };
}

export function exactPackagePreparationEnvironment(preparation) {
  const { receipt, root, prefix, receiptPath } = preparation;
  assertReceipt(receipt);
  return {
    [EXACT_PACKAGE_PREPARATION_ENV.mode]: "runner",
    [EXACT_PACKAGE_PREPARATION_ENV.root]: boundedAbsolute(root, "preparation root"),
    [EXACT_PACKAGE_PREPARATION_ENV.prefix]: boundedAbsolute(prefix, "preparation prefix"),
    [EXACT_PACKAGE_PREPARATION_ENV.receipt]: boundedAbsolute(receiptPath, "preparation receipt"),
    [EXACT_PACKAGE_PREPARATION_ENV.consumers]: JSON.stringify(receipt.consumers),
  };
}

export async function cleanupExactPackagePreparation(preparation, options = {}) {
  const root = boundedAbsolute(preparation?.root, "preparation root");
  const startedAt = options.now?.() ?? Date.now();
  const result = await cleanupRoot(root, options.removeRoot);
  return { ...result, durationMs: Math.max(0, (options.now?.() ?? Date.now()) - startedAt) };
}

export function installArguments(prefix, candidatePath) {
  return ["install", "--global", "--prefix", prefix, candidatePath, "--ignore-scripts", "--no-audit", "--no-fund", "--prefer-offline"];
}

async function installedPackageIdentity(packageRoot) {
  const manifest = JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  validatePackageIdentity(manifest);
  const files = [];
  let bytes = 0;
  await visit(packageRoot);
  files.sort((left, right) => left.path.localeCompare(right.path));
  const inventory = files.map(file => ({ path: file.path, size: file.bytes.length, sha256: sha256(file.bytes) }));
  return { name: manifest.name, version: manifest.version, files: inventory.length, bytes, sha256: digest(inventory) };

  async function visit(path) {
    const relativePath = relative(packageRoot, path).split(sep).join("/");
    // Performance: dependency trees are npm-owned resolution state, not immutable
    // candidate bytes. Bind the installed package payload without rehashing that tree.
    if (relativePath === "node_modules" || relativePath.startsWith("node_modules/")) return;
    const metadata = await lstat(path);
    if (metadata.isSymbolicLink()) throw new Error("exact-package preparation rejects symbolic links inside the installed package");
    if (metadata.isDirectory()) {
      for (const entry of await readdir(path)) await visit(resolve(path, entry));
      return;
    }
    if (!metadata.isFile()) throw new Error("exact-package preparation accepts regular installed files only");
    if (files.length >= MAX_FILES || metadata.size > MAX_BYTES) throw new Error("exact-package installed identity exceeds bounds");
    const content = await readFile(path);
    bytes += content.length;
    if (bytes > MAX_BYTES) throw new Error("exact-package installed identity exceeds bounds");
    files.push({ path: relative(packageRoot, path).split(sep).join("/"), bytes: content });
  }
}

function assertReceipt(receipt) {
  if (!receipt || receipt.schema !== EXACT_PACKAGE_PREPARATION_SCHEMA || receipt.authority !== "validation-runner"
    || typeof receipt.receiptId !== "string" || !/^[0-9a-f]{64}$/u.test(receipt.receiptId)) throw new Error("exact-package preparation receipt is malformed");
  const { receiptId, ...payload } = receipt;
  if (receiptId !== digest(payload)) throw new Error("exact-package preparation receipt identity is invalid");
  validateConsumers(receipt.consumers);
  if (receipt.preparation?.count !== 1 || receipt.preparation?.proxySynchronizations !== 1
    || !Number.isSafeInteger(receipt.preparation?.durationMs) || receipt.preparation.durationMs < 0) throw new Error("exact-package preparation count is invalid");
  const phases = receipt.preparation.phases;
  if (!phases || ["installMs", "proxySynchronizationMs", "installedIdentityMs"].some(key => !Number.isSafeInteger(phases[key]) || phases[key] < 0)) {
    throw new Error("exact-package preparation phase timing is invalid");
  }
  if (!receipt.candidate || !/^[0-9a-f]{64}$/u.test(receipt.candidate.sha256 ?? "") || !Number.isSafeInteger(receipt.candidate.size)
    || receipt.candidate.size < 1 || typeof receipt.candidate.name !== "string" || typeof receipt.candidate.version !== "string") throw new Error("exact-package preparation candidate is malformed");
  if (!receipt.install || typeof receipt.install.installedIdentity?.sha256 !== "string") throw new Error("exact-package installed identity is malformed");
}

function laneIdentity(environment, overrides = {}) {
  const value = {
    platform: overrides.platform ?? process.platform,
    architecture: overrides.architecture ?? process.arch,
    nodeVersion: overrides.nodeVersion ?? process.version,
    runId: overrides.runId ?? environment.GITHUB_RUN_ID ?? "local",
    runAttempt: overrides.runAttempt ?? environment.GITHUB_RUN_ATTEMPT ?? "1",
  };
  if (!/^(win32|linux|darwin)$/u.test(value.platform) || !/^(x64|arm64)$/u.test(value.architecture)
    || !/^v\d+\.\d+\.\d+$/u.test(value.nodeVersion) || !/^(?:local|\d{1,24})$/u.test(value.runId)
    || !/^\d{1,8}$/u.test(value.runAttempt)) throw new Error("exact-package validation lane identity is invalid");
  return value;
}

function validateConsumers(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > ALLOWED_CONSUMERS.size
    || new Set(value).size !== value.length || value.some(consumer => !ALLOWED_CONSUMERS.has(consumer))) {
    throw new Error("exact-package preparation consumers are invalid");
  }
  return [...value];
}

function validatePackageIdentity(manifest) {
  if (!manifest || typeof manifest.name !== "string" || !manifest.name.startsWith("@") || !manifest.name.includes("/")
    || typeof manifest.version !== "string" || manifest.version.length > 128) throw new Error("exact-package candidate package identity is invalid");
}

function installedPackageRoot(prefix, packageName, targetPlatform) {
  return resolve(prefix, ...(targetPlatform === "win32" ? [] : ["lib"]), "node_modules", ...packageName.split("/"));
}

function boundedAbsolute(path, label) {
  if (typeof path !== "string" || path.length < 1 || path.length > MAX_PATH) throw new Error(`exact-package ${label} is missing or unbounded`);
  return resolve(path);
}

function inside(parent, child) {
  const path = relative(parent, child);
  return path !== "" && path !== ".." && !path.startsWith(`..${sep}`) && !path.startsWith("/") && !path.startsWith("\\");
}

async function cleanupRoot(root, removeRoot) {
  try {
    const status = removeRoot ? await removeRoot(root) : await defaultRemoveRoot(root);
    if (!status || !["passed", "deferred"].includes(status)) throw new Error("invalid exact-package cleanup disposition");
    return { status, error: null };
  } catch (error) {
    return { status: "failed", error: error instanceof Error ? error.message.slice(0, 512) : "unknown cleanup failure" };
  }
}

async function defaultRemoveRoot(path) {
  if (process.platform !== "win32") {
    await rm(path, { recursive: true, force: true, maxRetries: 2, retryDelay: 100 });
    return "passed";
  }
  const cleanup = crossSpawn.sync(process.execPath, [
    "-e",
    "require('node:fs/promises').rm(process.argv[1], { recursive: true, force: true, maxRetries: 2, retryDelay: 100 }).catch(() => { process.exitCode = 1; })",
    path,
  ], { windowsHide: true, stdio: "ignore", timeout: 5_000 });
  if (cleanup.status !== 0 || cleanup.error) return "deferred";
  return "passed";
}

function runCommand(command, arguments_, cwd, environment) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = crossSpawn(command, arguments_, { cwd, env: environment, windowsHide: true });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr?.on("data", chunk => { stderr += chunk.toString(); });
    child.once("error", rejectPromise);
    child.once("close", status => resolvePromise({ status, stdout, stderr }));
  });
}

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  return JSON.stringify(value);
}
function sha256(bytes) { return createHash("sha256").update(bytes).digest("hex"); }
function digest(value) { return sha256(canonical(value)); }
