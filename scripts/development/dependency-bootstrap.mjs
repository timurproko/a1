import { randomUUID, createHash } from "node:crypto";
import { lstat, mkdir, readFile, realpath, rmdir, unlink, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { inspectDependencies } from "./dependency-inspection.mjs";
import { runNpm } from "./dependency-process.mjs";

async function configuration(root) {
  let manifestText, lockText, manifest, lock;
  try {
    [manifestText, lockText] = await Promise.all([readFile(join(root, "package.json"), "utf8"), readFile(join(root, "package-lock.json"), "utf8")]);
    manifest = JSON.parse(manifestText); lock = JSON.parse(lockText);
  } catch { throw new Error("Dependency setup needs readable package.json and package-lock.json; repair the checkout before retrying."); }
  if (!manifest || !lock || typeof manifest.name !== "string" || typeof manifest.version !== "string"
    || !/^npm@\d/u.test(manifest.packageManager ?? "") || ![2, 3].includes(lock.lockfileVersion) || !lock.packages?.[""]
    || manifest.name !== lock.name || manifest.version !== lock.version) throw new Error("Dependency setup requires the repository's matching npm manifest and lockfile.");
  for (const section of ["dependencies", "devDependencies", "optionalDependencies"]) {
    const declared = manifest[section] ?? {};
    if (!declared || typeof declared !== "object" || Array.isArray(declared)
      || !isDeepStrictEqual(declared, lock.packages[""][section] ?? {})
      || Object.entries(declared).some(([name, version]) => !/^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/iu.test(name) || typeof version !== "string")) {
      throw new Error("Dependency declarations and lockfile disagree; automatic setup will not rewrite them.");
    }
  }
  return { manifest, fingerprint: createHash("sha256").update(manifestText).update("\0").update(lockText).digest("hex") };
}

async function readiness(root, manifest, npm, signal) {
  const observed = inspectDependencies(root, manifest);
  if (!observed.present) return "node_modules is absent";
  if (observed.missing.length) return `missing packages: ${observed.missing.slice(0, 5).join(", ")}`;
  if (observed.mismatched.length) return `stale packages: ${observed.mismatched.slice(0, 5).map(value => value.name).join(", ")}`;
  if (observed.incomplete.length) return `missing package entry files: ${observed.incomplete.slice(0, 5).join(", ")}`;
  const result = await npm(["ls", "--all", "--json", "--include=dev", "--offline", "--ignore-scripts"], { cwd: root, signal, capture: true });
  let report;
  try { report = JSON.parse(result.stdout); } catch { throw new Error("npm could not inspect the dependency tree. Run npm ls --all to diagnose it; no automatic install was started."); }
  if (!report || typeof report !== "object" || Array.isArray(report)) throw new Error("npm returned an invalid dependency report.");
  if (result.code === 0) return null;
  if (report.error?.code === "ELSPROBLEMS" || Array.isArray(report.problems) && report.problems.length) return "the installed dependency tree is incomplete or invalid";
  throw new Error(`npm dependency inspection failed (exit ${result.code}); diagnose npm ls --all before retrying.`);
}

async function regularDirectory(path) {
  try { await mkdir(path); } catch (error) { if (error.code !== "EEXIST") throw error; }
  const stat = await lstat(path);
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error(`Unsafe dependency setup directory: ${path}`);
}

async function safeDependencyRoot(root) {
  let stat;
  try { stat = await lstat(join(root, "node_modules")); } catch (error) { if (error.code === "ENOENT") return; throw error; }
  if (!stat.isDirectory() || stat.isSymbolicLink()) throw new Error("Automatic dependency repair refuses a linked or non-directory node_modules; inspect its ownership before installing manually.");
}

async function acquire(root, signal, waitMs) {
  const directory = join(root, ".artifacts", "publication-dependencies");
  await regularDirectory(join(root, ".artifacts")); await regularDirectory(directory);
  const path = join(directory, "repair.lock"), token = randomUUID(), started = performance.now();
  for (;;) {
    signal?.throwIfAborted();
    try { await mkdir(path); break; } catch (error) { if (error.code !== "EEXIST") throw error; }
    if (performance.now() - started >= waitMs) throw new Error("Dependency repair is busy or a previous setup left a lock. Inspect .artifacts/publication-dependencies/repair.lock before retrying; no lock was removed.");
    await delay(Math.min(100, waitMs), undefined, { signal });
  }
  const owner = join(path, "owner");
  try { await writeFile(owner, token, { flag: "wx" }); }
  catch (error) { await rmdir(path).catch(() => {}); throw error; }
  return async () => {
    if ((await lstat(path)).isSymbolicLink() || await readFile(owner, "utf8") !== token) throw new Error("Dependency repair lock ownership changed; lock retained.");
    await unlink(owner); await rmdir(path);
  };
}

/** One startup-only repair of the selected checkout; no publication code or third-party package is imported. */
export async function ensurePublicationDependencies({ root = new URL("../..", import.meta.url), signal, log = message => console.error(`[dependencies] ${message}`),
  npm = runNpm, inspect = readiness, lockWaitMs = 180000 } = {}) {
  root = await realpath(root instanceof URL ? fileURLToPath(root) : resolve(root));
  signal?.throwIfAborted();
  const config = await configuration(root);
  const reason = await inspect(root, config.manifest, npm, signal);
  signal?.throwIfAborted();
  let locked = false;
  try { await lstat(join(root, ".artifacts/publication-dependencies/repair.lock")); locked = true; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  if (!reason && !locked) return;
  await safeDependencyRoot(root);
  log(reason ? `${reason}; preparing locked npm ci dependency repair.` : "Waiting for the checkout's dependency setup to settle.");
  const release = await acquire(root, signal, lockWaitMs);
  let settled = true;
  try {
    if ((await configuration(root)).fingerprint !== config.fingerprint) throw new Error("Dependency manifest/lockfile changed while waiting. Retry against the current checkout.");
    if (!await inspect(root, config.manifest, npm, signal)) return;
    await safeDependencyRoot(root); signal?.throwIfAborted();
    const installed = await npm(["ci", "--include=dev", "--no-audit", "--no-fund"], { cwd: root, signal });
    if (installed.code !== 0) throw new Error(`npm ci failed (exit ${installed.code}); publication was not started.`);
    signal?.throwIfAborted();
    if ((await configuration(root)).fingerprint !== config.fingerprint) throw new Error("Dependency manifest/lockfile changed during installation; publication was not started.");
    const remaining = await inspect(root, config.manifest, npm, signal);
    if (remaining) throw new Error(`Dependencies remain incomplete after npm ci: ${remaining}. Publication was not started.`);
    log("Dependencies ready; continuing the original command.");
  } catch (error) { settled = error?.settled !== false; throw error; }
  finally { if (settled) await release(); }
}
