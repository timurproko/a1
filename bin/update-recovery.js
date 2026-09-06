#!/usr/bin/env node

// Security: this file intentionally depends only on Node built-ins: the updater copies it into a
// transaction capsule before npm is allowed to rename or remove the installed package.
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, lstat, mkdir, open, readFile, realpath, rename, rm, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const SCHEMA = "a1-update-recovery-v1";
const [, , mode, manifestPath, separator, ...forwarded] = process.argv;

if ((mode !== "--worker" && mode !== "--launch") || !manifestPath || (mode === "--launch" && separator !== "--")) {
  throw new Error("invalid A1 update recovery invocation");
}

const capsule = await readCapsule(manifestPath);
if (mode === "--worker") {
  await runWorker(capsule);
} else {
  process.exitCode = await runRecoveredCommand(capsule, forwarded);
}

async function runWorker(value) {
  await rm(value.resultPath, { force: true });
  await writeJson(value.ownerPath, {
    schema: SCHEMA,
    transactionId: value.transactionId,
    pid: process.pid,
    startIdentity: `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1000)}`,
    startedAt: new Date().toISOString(),
  });
  const heartbeat = setInterval(() => {
    void writeJson(value.ownerPath, {
      schema: SCHEMA,
      transactionId: value.transactionId,
      pid: process.pid,
      startIdentity: `${process.pid}:${Math.floor(Date.now() - process.uptime() * 1000)}`,
      heartbeatAt: new Date().toISOString(),
    });
  }, 500);
  heartbeat.unref?.();
  const child = spawn(process.execPath, [value.npmCli, ...value.npmArguments], {
    detached: false,
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  const stdout = [];
  const stderr = [];
  child.stdout?.on("data", chunk => stdout.push(Buffer.from(chunk)));
  child.stderr?.on("data", chunk => stderr.push(Buffer.from(chunk)));
  let cancelled = false;
  let forced = false;
  let forceTimer = null;
  const cancellationPoll = setInterval(async () => {
    if (cancelled || !await exists(value.cancellationPath)) return;
    cancelled = true;
    child.kill("SIGTERM");
    forceTimer = setTimeout(() => { forced = true; child.kill("SIGKILL"); }, 2_000);
    forceTimer.unref?.();
  }, 50);
  cancellationPoll.unref?.();

  let npmExitCode = null;
  let spawnError = null;
  try {
    npmExitCode = await new Promise((resolvePromise, rejectPromise) => {
      child.once("error", rejectPromise);
      child.once("close", code => resolvePromise(code));
    });
  } catch (error) {
    spawnError = error;
  } finally {
    clearInterval(cancellationPoll);
    clearInterval(heartbeat);
    if (forceTimer) clearTimeout(forceTimer);
  }

  const targetReady = await installedTargetIsCallable(value);
  let launcherDisposition = "unavailable";
  let outcome = "failed";
  if (targetReady) {
    launcherDisposition = "target";
    outcome = "installed";
  } else {
    await writeRecoveryLaunchers(value);
    if (await recoveryLaunchersAreCallable(value)) {
      launcherDisposition = "recovery";
      outcome = "recovery-launcher";
    }
  }
  await writeJson(value.resultPath, {
    schema: SCHEMA,
    transactionId: value.transactionId,
    outcome,
    npmExitCode,
    cancelled,
    launcherDisposition,
    stdout: bounded(Buffer.concat(stdout).toString("utf8")),
    stderr: bounded(`${Buffer.concat(stderr).toString("utf8")}${spawnError ? `\n${String(spawnError)}` : ""}${forced ? "\nforced npm termination after cancellation" : ""}`.trim()),
    completedAt: new Date().toISOString(),
  });
  if (launcherDisposition === "unavailable") process.exitCode = 1;
}

async function runRecoveredCommand(value, arguments_) {
  let entry = await installedTargetEntry(value);
  if (entry === null && arguments_[0] === "update") {
    await rm(value.cancellationPath, { force: true });
    await rm(value.resultPath, { force: true });
    await rm(value.ownerPath, { force: true });
    const worker = spawn(process.execPath, [fileURLToPath(import.meta.url), "--worker", manifestPath], {
      detached: true,
      windowsHide: true,
      stdio: "ignore",
    });
    worker.unref();
    const deadline = Date.now() + 15 * 60 * 1000;
    const requestCancellation = signal => { void writeJson(value.cancellationPath, { schema: SCHEMA, transactionId: value.transactionId, signal, requestedAt: new Date().toISOString() }); };
    const onSigint = () => requestCancellation("SIGINT");
    const onSigterm = () => requestCancellation("SIGTERM");
    process.on("SIGINT", onSigint);
    process.on("SIGTERM", onSigterm);
    try {
      while (Date.now() < deadline && !await exists(value.resultPath)) await sleep(50);
    } finally {
      process.off("SIGINT", onSigint);
      process.off("SIGTERM", onSigterm);
    }
    entry = await installedTargetEntry(value);
  }
  entry ??= resolve(value.priorReleaseRoot, "bin", "cli.js");
  const child = spawn(process.execPath, [entry, ...arguments_], { stdio: "inherit", windowsHide: false });
  return await new Promise(resolvePromise => {
    child.once("error", error => { console.error(error instanceof Error ? error.message : String(error)); resolvePromise(1); });
    child.once("close", code => resolvePromise(code ?? 1));
  });
}

async function readCapsule(path) {
  const value = JSON.parse(await readFile(path, "utf8"));
  if (value.schema !== SCHEMA || typeof value.transactionId !== "string" || typeof value.packageName !== "string"
    || typeof value.packageName !== "string" || !value.packageName.includes("/") || typeof value.targetVersion !== "string" || typeof value.packageRoot !== "string" || typeof value.globalRoot !== "string"
    || typeof value.launcherRoot !== "string" || !Array.isArray(value.launchers) || typeof value.priorReleaseId !== "string" || typeof value.priorReleaseRoot !== "string"
    || !/^[a-f0-9]{64}$/.test(value.priorContentDigest) || typeof value.releaseManifestName !== "string"
    || typeof value.recoveryEntry !== "string" || typeof value.recoveryEntryDigest !== "string" || value.nodeExecutable !== process.execPath || typeof value.npmCli !== "string"
    || !Array.isArray(value.npmArguments) || typeof value.resultPath !== "string" || typeof value.cancellationPath !== "string") {
    throw new Error("invalid A1 update recovery capsule");
  }
  const lexicalCapsuleRoot = dirname(resolve(path));
  if (lexicalCapsuleRoot.split(sep).at(-1) !== value.transactionId) throw new Error("A1 update recovery transaction path is invalid");
  const capsuleRoot = await realpath(lexicalCapsuleRoot);
  const entry = await realpath(value.recoveryEntry);
  assertDirectChild(capsuleRoot, entry);
  if (!samePath(entry, resolve(capsuleRoot, "recovery.js"))) throw new Error("A1 update recovery entry path is invalid");
  const digest = createHash("sha256").update(await readFile(entry)).digest("hex");
  if (digest !== value.recoveryEntryDigest) throw new Error("A1 update recovery payload digest mismatch");
  const globalRoot = await realpath(value.globalRoot);
  const packageRoot = await realpath(value.packageRoot).catch(() => resolve(value.packageRoot));
  const expectedPackage = resolve(globalRoot, ...value.packageName.split("/"));
  if (!samePath(packageRoot, expectedPackage) || !containedBy(globalRoot, packageRoot)) throw new Error("A1 update recovery package root escapes npm global root");
  const expectedNpmArguments = ["install", "--global", "--loglevel=error", "--no-fund", "--no-audit", `${value.packageName}@${value.targetVersion}`];
  if (JSON.stringify(value.npmArguments) !== JSON.stringify(expectedNpmArguments)) throw new Error("A1 update recovery npm arguments are invalid");
  const launcherRoot = resolve(value.launcherRoot);
  const expectedLaunchers = process.platform === "win32"
    ? [resolve(launcherRoot, "a1"), resolve(launcherRoot, "a1.cmd"), resolve(launcherRoot, "a1.ps1")]
    : [resolve(launcherRoot, "a1")];
  if (JSON.stringify(value.launchers.map(path => resolve(path))) !== JSON.stringify(expectedLaunchers)) throw new Error("A1 update recovery launcher set is invalid");
  for (const launcher of value.launchers) assertDirectChild(launcherRoot, resolve(launcher));
  const expectedSidecars = [resolve(lexicalCapsuleRoot, "cancel.json"), resolve(lexicalCapsuleRoot, "result.json"), resolve(lexicalCapsuleRoot, "owner.json")];
  if (![value.cancellationPath, value.resultPath, value.ownerPath].every((candidate, index) => samePath(candidate, expectedSidecars[index]))) {
    throw new Error("A1 update recovery sidecar paths are invalid");
  }
  const dataDir = dirname(dirname(capsuleRoot));
  const releasesRoot = await realpath(resolve(dataDir, "releases"));
  const priorReleaseRoot = await realpath(value.priorReleaseRoot);
  assertDirectChild(releasesRoot, priorReleaseRoot);
  if (priorReleaseRoot.split(sep).at(-1) !== value.priorReleaseId) throw new Error("A1 update recovery prior release identity is invalid");
  const priorManifest = JSON.parse(await readFile(resolve(priorReleaseRoot, value.releaseManifestName), "utf8"));
  if (priorManifest.releaseId !== value.priorReleaseId || priorManifest.contentDigest !== value.priorContentDigest) {
    throw new Error("A1 update recovery prior release manifest is invalid");
  }
  const npmMetadata = await lstat(value.npmCli);
  if (!npmMetadata.isFile() || npmMetadata.isSymbolicLink()) throw new Error("A1 update recovery npm entry is invalid");
  return value;
}

async function installedTargetEntry(value) {
  try {
    const manifest = JSON.parse(await readFile(resolve(value.packageRoot, "package.json"), "utf8"));
    const entry = resolve(value.packageRoot, "bin", "cli.js");
    if (manifest.name !== value.packageName || manifest.version !== value.targetVersion || !(await lstat(entry)).isFile()) return null;
    return entry;
  } catch { return null; }
}

async function installedTargetIsCallable(value) {
  if (await installedTargetEntry(value) === null) return false;
  const token = `node_modules/${value.packageName}/bin/cli.js`;
  for (const path of value.launchers) {
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink()) return false;
      if (process.platform !== "win32" && (metadata.mode & 0o111) === 0) return false;
      const normalized = (await readFile(path, "utf8")).replaceAll("\\", "/");
      if (!normalized.includes(token)) return false;
    } catch { return false; }
  }
  return true;
}

async function writeRecoveryLaunchers(value) {
  const node = value.nodeExecutable ?? process.execPath;
  const entry = value.recoveryEntry;
  const manifest = manifestPath;
  const shell = `#!/bin/sh\nexec ${shellQuote(node)} ${shellQuote(entry)} --launch ${shellQuote(manifest)} -- "$@"\n`;
  const command = `@ECHO off\r\n"${node}" "${entry}" --launch "${manifest}" -- %*\r\n`;
  const powershell = `& '${psQuote(node)}' '${psQuote(entry)}' --launch '${psQuote(manifest)}' -- $args\nexit $LASTEXITCODE\n`;
  const content = process.platform === "win32" ? [shell, command, powershell] : [shell];
  await mkdir(value.launcherRoot, { recursive: true });
  for (let index = 0; index < value.launchers.length; index += 1) await atomicWrite(value.launchers[index], content[index], 0o755);
}

async function recoveryLaunchersAreCallable(value) {
  for (const path of value.launchers) {
    try {
      const metadata = await lstat(path);
      if (!metadata.isFile() || metadata.isSymbolicLink()) return false;
      if (process.platform !== "win32" && (metadata.mode & 0o111) === 0) return false;
      if (!(await readFile(path, "utf8")).includes(value.recoveryEntry)) return false;
    } catch { return false; }
  }
  return true;
}

async function atomicWrite(path, content, mode) {
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  await writeFile(temporary, content, { mode });
  await chmod(temporary, mode);
  await rm(path, { force: true });
  await rename(temporary, path);
}

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true, mode: 0o700 });
  const temporary = `${path}.${process.pid}.${randomUUID()}.tmp`;
  const file = await open(temporary, "wx", 0o600);
  try { await file.writeFile(JSON.stringify(value, null, 2)); await file.sync(); }
  finally { await file.close(); }
  await rm(path, { force: true });
  await rename(temporary, path);
}

function samePath(left, right) {
  return process.platform === "win32" ? resolve(left).toLowerCase() === resolve(right).toLowerCase() : resolve(left) === resolve(right);
}
function containedBy(parent, child) {
  const fromParent = relative(parent, child);
  return fromParent.length > 0 && fromParent !== ".." && !fromParent.startsWith(`..${sep}`) && !isAbsolute(fromParent);
}
function assertDirectChild(parent, child) {
  const expectedParent = resolve(parent);
  const actualParent = dirname(resolve(child));
  const matches = process.platform === "win32" ? actualParent.toLowerCase() === expectedParent.toLowerCase() : actualParent === expectedParent;
  if (!matches) throw new Error(`A1 update recovery path escapes its managed root: ${child}`);
}
function shellQuote(value) { return `'${String(value).replaceAll("'", `'"'"'`)}'`; }
function psQuote(value) { return String(value).replaceAll("'", "''"); }
function bounded(value) { return value.length <= 64 * 1024 ? value : value.slice(-64 * 1024); }
async function exists(path) { return await lstat(path).then(() => true).catch(() => false); }
async function sleep(ms) { await new Promise(resolvePromise => setTimeout(resolvePromise, ms)); }
