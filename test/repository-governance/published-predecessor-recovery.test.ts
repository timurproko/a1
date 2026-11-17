import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { prepareLegacyRecoveryObservation, readLegacyHeartbeatCrash } from "../../scripts/release/published-predecessor-recovery.mjs";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true }))); });
async function fixture() {
  const root = await realpath(await mkdtemp(resolve(tmpdir(), "a1-legacy-heartbeat-")));
  roots.push(root);
  const transactionId = randomUUID();
  const dataDir = resolve(root, "data");
  const packageRoot = resolve(root, "prefix", "node_modules", "fixture-package");
  const capsuleRoot = resolve(dataDir, "update-recovery", transactionId);
  const directory = resolve(root, "observer");
  await mkdir(capsuleRoot, { recursive: true });
  await mkdir(directory);
  await mkdir(resolve(packageRoot, "bin"), { recursive: true });
  const bytes = "// immutable legacy worker fixture\n";
  const recoveryEntryDigest = createHash("sha256").update(bytes).digest("hex");
  const knownDigests = new Set([recoveryEntryDigest]);
  const recoveryEntry = resolve(capsuleRoot, "recovery.js");
  await writeFile(recoveryEntry, bytes);
  await writeFile(resolve(packageRoot, "bin", "update-recovery.js"), bytes);
  const ownerPath = resolve(capsuleRoot, "owner.json");
  const version = "1.1.0";
  const capsule = { schema: "a1-update-recovery-v1", transactionId, targetVersion: version, packageRoot, ownerPath, recoveryEntry, recoveryEntryDigest, resultPath: resolve(capsuleRoot, "result.json") };
  const manifestPath = resolve(capsuleRoot, "capsule.json");
  await writeFile(manifestPath, JSON.stringify(capsule));
  const event = { event: "uncaught", pid: 4321, errorDetails: { code: "EPERM", syscall: "rename", path: `${ownerPath}.4321.${randomUUID()}.tmp`, dest: ownerPath } };
  const events: Array<Record<string, unknown>> = [{ event: "start", pid: 4321, worker: true, entry: "recovery.js" }, event, { event: "exit", pid: 4321, code: 1 }];
  const context = { directory, packageRoot, dataDir, version, knownDigests };
  const writeEvents = () => writeFile(resolve(directory, "4321.jsonl"), events.map(value => JSON.stringify(value)).join("\n"));
  await writeEvents();
  return { root, context, capsule, manifestPath, event, events, writeEvents, bytes };
}

describe("authenticated legacy heartbeat recovery", () => {
  it.each(["rename", "unlink"])("accepts only the known worker's observed failed heartbeat %s", async syscall => {
    const f = await fixture();
    if (syscall === "unlink") f.event.errorDetails = { ...f.event.errorDetails, syscall, path: f.capsule.ownerPath };
    await f.writeEvents();
    await expect(readLegacyHeartbeatCrash(f.context)).resolves.toMatchObject({ pid: 4321, transactionId: f.capsule.transactionId, code: "EPERM", syscall });
  });

  it.each(["unknown-code", "wrong-file", "wrong-temporary", "successful-exit", "missing-exit", "not-worker", "wrong-pid"])("rejects %s instead of authorizing generic retry", async fault => {
    const f = await fixture();
    if (fault === "unknown-code") f.event.errorDetails.code = "ENOENT";
    if (fault === "wrong-file") f.event.errorDetails.dest = resolve(f.root, "owner.json");
    if (fault === "wrong-temporary") f.event.errorDetails.path = `${f.capsule.ownerPath}.other.tmp`;
    if (fault === "successful-exit") f.events[2]!.code = 0;
    if (fault === "missing-exit") f.events.pop();
    if (fault === "not-worker") f.events[0]!.worker = false;
    if (fault === "wrong-pid") f.events[2]!.pid = 9999;
    await f.writeEvents();
    await expect(readLegacyHeartbeatCrash(f.context)).resolves.toBeNull();
  });

  it.each(["package", "version", "transaction", "digest", "bytes", "result", "cancelled", "malformed"])("rejects mismatched %s authority", async fault => {
    const f = await fixture();
    if (fault === "package") f.capsule.packageRoot = resolve(f.root, "other-package");
    if (fault === "version") f.capsule.targetVersion = "9.9.9";
    if (fault === "transaction") f.capsule.transactionId = randomUUID();
    if (fault === "digest") f.capsule.recoveryEntryDigest = "b".repeat(64);
    if (fault === "bytes") await writeFile(f.capsule.recoveryEntry, "changed worker");
    if (fault === "result") await writeFile(f.capsule.resultPath, "{}");
    if (fault === "cancelled") await writeFile(resolve(f.capsule.ownerPath, "..", "cancel.json"), "{}");
    await writeFile(f.manifestPath, fault === "malformed" ? "not-json" : JSON.stringify(f.capsule));
    await expect(readLegacyHeartbeatCrash(f.context)).resolves.toBeNull();
  });

  it("does not enable recovery for unknown package bytes or non-Windows execution", async () => {
    const f = await fixture();
    const context = { root: f.root, packageRoot: f.context.packageRoot, dataDir: f.context.dataDir, version: f.context.version, environment: { NODE_OPTIONS: "--trace-warnings" } };
    await expect(prepareLegacyRecoveryObservation({ ...context, platform: "win32" })).resolves.toBeNull();
    await expect(prepareLegacyRecoveryObservation({ ...context, platform: "linux", knownDigests: f.context.knownDigests })).resolves.toBeNull();
    const observation = await prepareLegacyRecoveryObservation({ ...context, platform: "win32", knownDigests: f.context.knownDigests });
    expect(observation?.environment.NODE_OPTIONS).toContain("--trace-warnings --import=");
    expect(observation?.environment.PUBLISHED_PAIR_OBSERVER_MODE).toBe("events");
    expect(await readFile(resolve(f.context.packageRoot, "bin", "update-recovery.js"), "utf8")).toBe(f.bytes);
  });
});
