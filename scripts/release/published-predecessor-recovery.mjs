import { createHash } from "node:crypto";
import { lstat, mkdir, readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";

// Compatibility: exact unmodified recovery.js served by published 0.2.7-dev.1307. Unknown
// implementations never receive this exception, even if their error text looks similar.
const LEGACY_RECOVERY_DIGESTS = new Set(["1afca5ea1e2b81c77367fb842e37e78ed35d3bd06b69ec8cd7421ffb7259b13d"]);
const digest = bytes => createHash("sha256").update(bytes).digest("hex");
const same = (left, right) => typeof left === "string" && typeof right === "string" && resolve(left).toLowerCase() === resolve(right).toLowerCase();
const uuid = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu;

/** Authenticate a known immutable worker's actual heartbeat crash, not a timeout or message match. */
export async function readLegacyHeartbeatCrash({ directory, packageRoot, dataDir, version, knownDigests = LEGACY_RECOVERY_DIGESTS }) {
  const entries = await readdir(directory, { withFileTypes: true });
  const recoveryRoot = resolve(dataDir, "update-recovery");
  for (const entry of entries.filter(entry => entry.isFile() && /^\d+\.jsonl$/u.test(entry.name)).slice(0, 100)) {
    const path = resolve(directory, entry.name);
    if ((await lstat(path)).size > 64_000) continue;
    const events = (await readFile(path, "utf8")).split(/\r?\n/u).flatMap(line => {
      try { const value = JSON.parse(line); return value && typeof value === "object" ? [value] : []; } catch { return []; }
    });
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      const error = event.errorDetails;
      const start = events.slice(0, index).findLast(row => row.event === "start");
      const exit = events.slice(index + 1).find(row => row.event === "exit");
      if (event.event !== "uncaught" || !start?.worker || start.entry !== "recovery.js" || exit?.code !== 1
        || !Number.isSafeInteger(event.pid) || event.pid <= 0 || entry.name !== `${event.pid}.jsonl`
        || start.pid !== event.pid || exit.pid !== event.pid || !["EPERM", "EACCES", "EBUSY"].includes(error?.code)) continue;
      const ownerPath = error.syscall === "rename" ? error.dest : error.syscall === "unlink" ? error.path : null;
      if (typeof ownerPath !== "string" || basename(ownerPath) !== "owner.json") continue;
      const capsuleRoot = dirname(resolve(ownerPath));
      const transactionId = basename(capsuleRoot);
      if (!uuid.test(transactionId) || !same(dirname(capsuleRoot), recoveryRoot)) continue;
      if (error.syscall === "rename" && (typeof error.path !== "string" || !same(dirname(error.path), capsuleRoot)
        || !new RegExp(`^owner\\.json\\.${event.pid}\\.[a-f0-9-]{36}\\.tmp$`, "iu").test(basename(error.path)))) continue;
      try {
        // Security: reject directory aliases and copied authority from any other package or transaction.
        if (!same(await realpath(capsuleRoot), capsuleRoot)) continue;
        const capsule = JSON.parse(await readFile(resolve(capsuleRoot, "capsule.json"), "utf8"));
        const recoveryEntry = resolve(capsuleRoot, "recovery.js");
        const metadata = await lstat(recoveryEntry);
        if (!metadata.isFile() || metadata.isSymbolicLink() || capsule.schema !== "a1-update-recovery-v1"
          || capsule.transactionId !== transactionId || capsule.targetVersion !== version
          || !same(capsule.packageRoot, packageRoot) || !same(capsule.ownerPath, ownerPath)
          || !same(capsule.recoveryEntry, recoveryEntry) || !same(capsule.resultPath, resolve(capsuleRoot, "result.json"))
          || !knownDigests.has(capsule.recoveryEntryDigest) || digest(await readFile(recoveryEntry)) !== capsule.recoveryEntryDigest
          || await lstat(resolve(capsuleRoot, "cancel.json")).catch(error => { if (error.code === "ENOENT") return null; throw error; })
          || await lstat(capsule.resultPath).catch(error => { if (error.code === "ENOENT") return null; throw error; })) continue;
        return { pid: event.pid, transactionId, recoveryEntryDigest: capsule.recoveryEntryDigest, code: error.code, syscall: error.syscall, ownerPath };
      } catch { /* Invariant: unavailable or malformed authority never authorizes installer recovery. */ }
    }
  }
  return null;
}

/** Observe only an authenticated legacy Windows predecessor; never patch or suppress its failure. */
export async function prepareLegacyRecoveryObservation({ root, packageRoot, dataDir, version, environment, platform = process.platform, knownDigests = LEGACY_RECOVERY_DIGESTS }) {
  if (platform !== "win32") return null;
  const source = await readFile(resolve(packageRoot, "bin", "update-recovery.js")).catch(() => null);
  if (!source || !knownDigests.has(digest(source))) return null;
  const directory = resolve(root, "legacy-update-observer");
  await mkdir(directory, { mode: 0o700 });
  const observer = new URL("./published-pair-observer.mjs", import.meta.url).href;
  return {
    environment: {
      ...environment, PUBLISHED_PAIR_OBSERVER_DIR: directory, PUBLISHED_PAIR_OBSERVER_MODE: "events",
      NODE_OPTIONS: `${environment.NODE_OPTIONS ?? ""} --import=${observer}`.trim(),
    },
    readFailure: () => readLegacyHeartbeatCrash({ directory, packageRoot, dataDir, version, knownDigests }),
  };
}
