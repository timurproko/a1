import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { parseArguments } from "../../../packages/a1-install/bin/a1-install.js";
import { inspectRepairWriters, validateRepairCapsule } from "../../../packages/a1-install/bin/repair-capsule.js";
const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "a1-installer-repair-")));
  roots.push(root);
  const transactionId = randomUUID();
  const dataDir = resolve(root, "data");
  const capsuleRoot = resolve(dataDir, "update-recovery", transactionId);
  const globalRoot = resolve(root, "prefix", "node_modules");
  const packageName = "@timurproko/a1";
  const packageRoot = resolve(globalRoot, ...packageName.split("/"));
  const priorReleaseId = "1.0.0-aaaaaaaaaaaaaaaaaaaa";
  const priorReleaseRoot = resolve(dataDir, "releases", priorReleaseId);
  for (const path of [capsuleRoot, packageRoot, priorReleaseRoot]) await mkdir(path, { recursive: true });
  const source = "// known legacy worker\n";
  const knownDigest = createHash("sha256").update(source).digest("hex");
  const recoveryEntry = resolve(capsuleRoot, "recovery.js");
  await writeFile(recoveryEntry, source);
  await writeFile(resolve(priorReleaseRoot, ".a1-release.json"), JSON.stringify({ launchContract: "neutral-launch-v1", releaseId: priorReleaseId, contentDigest: "a".repeat(64) }));
  const capsule = { schema: "a1-update-recovery-v1", launchContract: "neutral-launch-v1", transactionId, packageName, targetVersion: "1.1.0", packageRoot, globalRoot, launcherRoot: resolve(root, "prefix"),
    launchers: ["a1", "a1.cmd", "a1.ps1"].map(name => resolve(root, "prefix", name)), recoveryEntry, recoveryEntryDigest: knownDigest, ownerPath: resolve(capsuleRoot, "owner.json"),
    resultPath: resolve(capsuleRoot, "result.json"), cancellationPath: resolve(capsuleRoot, "cancel.json"), priorReleaseRoot, priorReleaseId, priorContentDigest: "a".repeat(64), releaseManifestName: ".a1-release.json" };
  const manifest = resolve(capsuleRoot, "capsule.json");
  const journal = { schema: "a1-update-journal-v1", transactionId, targetVersion: "1.1.0", packageRoot, phase: "ownership-released", status: "active", recovery: { capsulePath: manifest, guardianPid: 2147483647 } };
  await writeFile(manifest, JSON.stringify(capsule));
  await writeFile(resolve(dataDir, "update-transaction.json"), JSON.stringify(journal));
  await writeFile(capsule.ownerPath, JSON.stringify({ transactionId, pid: 2147483647 }));
  const options = { globalRoot, packageName, targetVersion: "1.1.0", platform: "win32" as const, knownDigest, inspect: async () => false };
  return { root, dataDir, capsule, journal, manifest, options };
}
describe("explicit capsule-verified installer repair", () => {
  it("requires an explicit absolute capsule and preserves channel parsing", () => {
    const capsule = resolve("capsule.json");
    expect(parseArguments(["--develop", "107", "--repair", capsule])).toMatchObject({ target: { kind: "preview", requested: "107" }, repairCapsule: capsule });
    for (const args of [["--repair"], ["--repair", "relative.json"], ["--repair", capsule, "--repair", capsule]]) expect(() => parseArguments(args)).toThrow();
    expect(parseArguments([]).repairCapsule).toBeNull();
  });
  it("authenticates durable prior ownership even when the current package has no manifest or CLI", async () => {
    const f = await fixture();
    await expect(validateRepairCapsule(f.manifest, f.options)).resolves.toEqual({ packageRoot: f.capsule.packageRoot, dataDir: f.dataDir, prefix: f.capsule.launcherRoot });
  });
  it.each(["target", "package", "bytes", "prior", "result", "live-owner", "live-journal", "writers", "platform"])("refuses %s without taking over a partial tree", async fault => {
    const f = await fixture();
    if (fault === "target") f.capsule.targetVersion = "9.9.9";
    if (fault === "package") f.capsule.packageRoot = resolve(f.root, "foreign");
    if (fault === "bytes") await writeFile(f.capsule.recoveryEntry, "foreign worker");
    if (fault === "prior") f.capsule.priorContentDigest = "b".repeat(64);
    if (fault === "result") await writeFile(f.capsule.resultPath, "{}");
    if (fault === "live-owner") await writeFile(f.capsule.ownerPath, JSON.stringify({ transactionId: f.capsule.transactionId, pid: process.pid }));
    if (fault === "live-journal") { f.journal.recovery.guardianPid = process.pid; await writeFile(resolve(f.dataDir, "update-transaction.json"), JSON.stringify(f.journal)); }
    if (fault === "writers") f.options.inspect = async () => true;
    await writeFile(f.manifest, JSON.stringify(f.capsule));
    await expect(validateRepairCapsule(f.manifest, fault === "platform" ? { ...f.options, platform: "linux" } : f.options)).rejects.toThrow();
  });
  it("pins read-only native process inspection and refuses package or recovery writers", async () => {
    const f = await fixture();
    const execute = async () => ({ stdout: JSON.stringify([{ ProcessId: process.pid, CommandLine: "installer" }, { ProcessId: 9999, CommandLine: `node "${f.capsule.recoveryEntry}" --worker` }]) });
    await expect(inspectRepairWriters(f.capsule.launcherRoot, f.capsule.recoveryEntry, execute)).resolves.toBe(true);
    await expect(inspectRepairWriters(f.capsule.launcherRoot, f.capsule.recoveryEntry, async () => ({ stdout: "[]" }))).rejects.toThrow("inspection unavailable");
  });
});
