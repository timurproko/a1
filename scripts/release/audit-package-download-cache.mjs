import crossSpawn from "cross-spawn";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { inspectDownloadCache, packageInstallArguments, verifyInstalledCandidate } from "./package-download-cache.mjs";

const candidate = resolve(valueAfter("--candidate") ?? ".artifacts/validation/package/candidate.tgz");
const output = resolve(valueAfter("--output") ?? ".artifacts/validation/package-download-cache.json");
const candidateBytes = await readFile(candidate);
const root = await mkdtemp(resolve(tmpdir(), "a1-package-cache-audit-"));
const cache = resolve(root, "cache");
const attempts = [];
let cleanup = "passed";
let failure = null;
try {
  for (const kind of ["cold", "warm"]) {
    const prefix = resolve(root, `prefix-${kind}`);
    await mkdir(prefix);
    const before = await inspectDownloadCache(cache);
    const startedAt = Date.now();
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const result = crossSpawn.sync(npm, packageInstallArguments(prefix, candidate, cache, kind === "warm"), {
      cwd: root, env: process.env, windowsHide: true, stdio: "ignore", timeout: 600_000,
    });
    const durationMs = Date.now() - startedAt;
    if (result.status !== 0 || result.error) throw new Error(`package ${kind} cache audit installation failed`);
    const packageRoot = resolve(prefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", "@timurproko", "a1");
    const payload = await verifyInstalledCandidate(candidateBytes, packageRoot);
    const after = await inspectDownloadCache(cache);
    attempts.push({ kind, mode: kind === "cold" ? "prefer-offline-empty-cache" : "offline-same-cache", durationMs,
      prefixFresh: true, cacheBefore: before, cacheAfter: after, payload });
    await persist();
  }
} catch (error) {
  failure = error instanceof Error ? error.message : "package cache audit failed";
  await persist();
  throw error;
} finally {
  try { await rm(root, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
  catch { cleanup = "deferred"; }
  await persist();
}

async function persist() {
  const report = {
    schema: "a1-package-download-cache-audit-v1",
    sourceHead: execFileSync("git", ["rev-parse", "HEAD^{commit}"], { encoding: "utf8" }).trim(),
    platform: process.platform, architecture: process.arch, nodeVersion: process.version,
    npmVersion: crossSpawn.sync(process.platform === "win32" ? "npm.cmd" : "npm", ["--version"], { encoding: "utf8", windowsHide: true }).stdout?.trim() ?? null,
    candidateSha256: createHash("sha256").update(candidateBytes).digest("hex"),
    productionMode: "prefer-offline-with-network-fallback", attempts, cleanup, failure,
  };
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(report, null, 2)}\n`);
}
function valueAfter(name) { const index = process.argv.indexOf(name); return index < 0 ? undefined : process.argv[index + 1]; }
