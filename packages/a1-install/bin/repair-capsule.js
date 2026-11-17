// Security: explicit legacy repair derives installation ownership from durable capsule authority,
// never from a partial manifest, an error string, or an environment flag that bypasses verification.
import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, readFile, realpath } from "node:fs/promises";
import { basename, dirname, isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
const execFile = promisify(execFileCallback);
const LEGACY_DIGEST = "1afca5ea1e2b81c77367fb842e37e78ed35d3bd06b69ec8cd7421ffb7259b13d";
const same = (left, right) => typeof left === "string" && typeof right === "string" && resolve(left).toLowerCase() === resolve(right).toLowerCase();
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
const alive = pid => {
  if (!Number.isSafeInteger(pid) || pid <= 0) throw new Error("invalid recovery process identity");
  try { process.kill(pid, 0); return true; } catch (error) { if (error.code === "ESRCH") return false; throw error; }
};
async function document(path, limit = 64_000) {
  const metadata = await lstat(path);
  if (!metadata.isFile() || metadata.isSymbolicLink() || metadata.size > limit) throw new Error("invalid repair document");
  return JSON.parse(await readFile(path, "utf8"));
}

/** Native read-only inspection refuses the known recovery/npm writer tree before direct repair. */
export async function inspectRepairWriters(prefix, recoveryEntry, execute = execFile) {
  const script = "$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process | Select-Object ProcessId,CommandLine); ConvertTo-Json -InputObject $rows -Compress";
  const { stdout } = await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-EncodedCommand", Buffer.from(script, "utf16le").toString("base64")], {
    encoding: "utf8", windowsHide: true, timeout: 10_000, maxBuffer: 2 * 1024 * 1024,
  });
  const rows = JSON.parse(stdout);
  if (!Array.isArray(rows) || !rows.some(row => row.ProcessId === process.pid)) throw new Error("repair process inspection unavailable");
  const normalize = value => value.replaceAll("\\", "/").toLowerCase();
  const root = `${normalize(resolve(prefix))}/`;
  const recovery = normalize(recoveryEntry);
  return rows.some(row => row.ProcessId !== process.pid && typeof row.CommandLine === "string"
    && (normalize(row.CommandLine).includes(root) || normalize(row.CommandLine).includes(recovery)));
}

/** Authenticate a settled legacy transaction and prior release before repairing its exact prefix. */
export async function validateRepairCapsule(manifestPath, { globalRoot, packageName, targetVersion, platform = process.platform, inspect = inspectRepairWriters, knownDigest = LEGACY_DIGEST }) {
  if (platform !== "win32" || !isAbsolute(manifestPath)) throw new Error("repair requires a Windows recovery capsule");
  const capsuleRoot = await realpath(dirname(manifestPath));
  const value = await document(resolve(capsuleRoot, "capsule.json"));
  const canonicalGlobal = await realpath(globalRoot);
  const packageRoot = resolve(canonicalGlobal, ...packageName.split("/"));
  const prefix = dirname(canonicalGlobal);
  const recoveryEntry = resolve(capsuleRoot, "recovery.js");
  if (basename(canonicalGlobal).toLowerCase() !== "node_modules" || !/^[a-f0-9-]{36}$/iu.test(value.transactionId)
    || basename(capsuleRoot) !== value.transactionId || basename(dirname(capsuleRoot)) !== "update-recovery"
    || value.schema !== "a1-update-recovery-v1" || value.launchContract !== "neutral-launch-v1"
    || value.packageName !== packageName || value.targetVersion !== targetVersion
    || !same(value.globalRoot, canonicalGlobal) || !same(value.packageRoot, packageRoot) || !same(value.launcherRoot, prefix)
    || !same(value.recoveryEntry, recoveryEntry) || value.recoveryEntryDigest !== knownDigest
    || hash(await readFile(recoveryEntry)) !== knownDigest
    || !same(value.ownerPath, resolve(capsuleRoot, "owner.json")) || !same(value.resultPath, resolve(capsuleRoot, "result.json"))
    || !same(value.cancellationPath, resolve(capsuleRoot, "cancel.json"))) throw new Error("repair capsule identity is invalid");
  const entryMetadata = await lstat(recoveryEntry);
  if (!entryMetadata.isFile() || entryMetadata.isSymbolicLink()) throw new Error("repair payload is invalid");
  const packageMetadata = await lstat(packageRoot).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (packageMetadata && (!packageMetadata.isDirectory() || packageMetadata.isSymbolicLink() || !same(await realpath(packageRoot), packageRoot))) throw new Error("repair package path is linked or invalid");
  const launchers = ["a1", "a1.cmd", "a1.ps1"].map(name => resolve(prefix, name));
  if (!Array.isArray(value.launchers) || value.launchers.length !== launchers.length || !launchers.every((path, index) => same(path, value.launchers[index]))) throw new Error("repair launcher authority is invalid");
  const dataDir = dirname(dirname(capsuleRoot));
  const prior = await realpath(value.priorReleaseRoot);
  if (!same(dirname(prior), await realpath(resolve(dataDir, "releases"))) || basename(prior) !== value.priorReleaseId || value.releaseManifestName !== ".a1-release.json") throw new Error("repair prior release path is invalid");
  const priorManifest = await document(resolve(prior, value.releaseManifestName), 2 * 1024 * 1024);
  if (priorManifest.launchContract !== "neutral-launch-v1" || priorManifest.releaseId !== value.priorReleaseId
    || !/^[a-f0-9]{64}$/u.test(value.priorContentDigest) || priorManifest.contentDigest !== value.priorContentDigest) throw new Error("repair prior release authority is invalid");
  const journal = await document(resolve(dataDir, "update-transaction.json"));
  if (journal.schema !== "a1-update-journal-v1" || journal.transactionId !== value.transactionId || journal.targetVersion !== targetVersion
    || !same(journal.packageRoot, packageRoot) || journal.phase !== "ownership-released"
    || !["active", "rolled-back", "failed"].includes(journal.status) || !same(journal.recovery?.capsulePath, resolve(capsuleRoot, "capsule.json"))
    || alive(journal.recovery?.guardianPid)) throw new Error("repair transaction is invalid or still running");
  const owner = await document(value.ownerPath).catch(error => { if (error.code === "ENOENT") return null; throw error; });
  if (owner && (owner.transactionId !== value.transactionId || alive(owner.pid))) throw new Error("repair owner is still running");
  if (await lstat(value.resultPath).catch(error => { if (error.code === "ENOENT") return null; throw error; })) throw new Error("repair capsule has a completed result");
  if (await inspect(prefix, recoveryEntry)) throw new Error("repair refused while package writers are running");
  return { packageRoot, dataDir, prefix };
}
