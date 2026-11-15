import { chmod, mkdtemp, mkdir, open, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createPublishedSmokeRunner } from "./published-smoke-processes.mjs";
import { tmpdir } from "node:os";
import { delimiter, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareVersions, resolveInstallerNpmCli, sanitizeDiagnostic } from "../../packages/a1-install/bin/a1-install.js";

const COMMAND_BUDGET_MS = 10 * 60_000;
/**
 * The published updater waits fifteen minutes for its protected-replacement worker before it cancels
 * and reports. On the hosted Windows runner the replacement alone needs several minutes, so the smoke
 * must outlast that deadline or it kills the updater before the updater can say what happened.
 */
const WINDOWS_UPDATE_BUDGET_MS = 20 * 60_000;

/** The deadline the predecessor update command receives on a platform. */
export function updateCommandBudgetMs(platform = process.platform) {
  return platform === "win32" ? WINDOWS_UPDATE_BUDGET_MS : COMMAND_BUDGET_MS;
}

/** Run published installation in disposable prefixes and retain safe evidence on either outcome. */
export async function smokePublishedInstaller({
  environment = process.env, createRunner = createPublishedSmokeRunner,
  removeFixture = root => rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }),
  writeDiagnostic = text => process.stderr.write(text),
} = {}) {
  const version = environment.RELEASE_VERSION;
  const channel = environment.RELEASE_CHANNEL;
  const output = resolve(environment.PUBLISHED_INSTALLER_EVIDENCE ?? ".artifacts/validation/published-installer.json");
  let root;
  let runner;
  let stage = "prepare";
  let childOutcome;
  let evidence;
  let primaryError;
  /** Stage name to accumulated child-command milliseconds; dates each phase of a long Windows run. */
  const timings = {};
  const safe = value => {
    let text = String(value ?? "").slice(-16_000);
    for (const [key, secret] of Object.entries(environment)) {
      // Security: credential-like keys are redacted by value; a short ordinary value (such as `root`) would
      // otherwise erase that word from every diagnostic line.
      if (/token|password|secret|auth/iu.test(key) && typeof secret === "string" && secret.length >= 8) text = text.replaceAll(secret, "[redacted]");
    }
    return text.split(/\r?\n/u).map(line => sanitizeDiagnostic(line)).filter(Boolean).slice(-80).join("\n").slice(-8_000);
  };
  const execute = async (command, args, options) => {
    const startedAt = Date.now();
    const result = await runner.run(command, args, options);
    timings[stage] = (timings[stage] ?? 0) + (Date.now() - startedAt);
    childOutcome = {
      status: result.status, signal: result.signal ?? null,
      error: safe(result.error?.message), stdout: safe(result.stdout), stderr: safe(result.stderr),
    };
    if (result.status !== 0 || result.error) throw new Error(safe(result.error?.message || result.stderr || `${stage} failed with ${result.status}`));
    return result;
  };
  try {
    if (typeof version !== "string" || !version || !["latest", "next"].includes(channel)
      || !environment.EXPECTED_INSTALLER_INTEGRITY?.startsWith("sha512-") || !environment.EXPECTED_APPLICATION_INTEGRITY?.startsWith("sha512-")) {
      throw new Error("published installer smoke environment is incomplete");
    }
    const installerSource = JSON.parse(await readFile(resolve("packages", "a1-install", "package.json"), "utf8"));
    const applicationSource = JSON.parse(await readFile(resolve("package.json"), "utf8"));
    root = await realpath(await mkdtemp(resolve(tmpdir(), "a1-published-installer-")));
    runner = createRunner(root);
    const bootstrapPrefix = resolve(root, "bootstrap");
    const applicationPrefix = resolve(root, "application");
    const bootstrapBin = process.platform === "win32" ? bootstrapPrefix : resolve(bootstrapPrefix, "bin");
    const applicationBin = process.platform === "win32" ? applicationPrefix : resolve(applicationPrefix, "bin");
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const installerLauncher = resolve(bootstrapBin, process.platform === "win32" ? "a1-install.cmd" : "a1-install");
    const applicationLauncher = resolve(applicationBin, process.platform === "win32" ? "a1.cmd" : "a1");
    // Security: diagnostics belong only to this fixture, never the runner's shared npm cache.
    const acquisitionEnvironment = { ...environment, npm_config_cache: resolve(root, "npm-cache") };
    stage = "acquire-installer";
    await execute(npm, [
      "install", "--global", "--prefix", bootstrapPrefix, `${installerSource.name}@${version}`,
      "--ignore-scripts", "--no-audit", "--no-fund",
    ], { cwd: root, encoding: "utf8", env: acquisitionEnvironment, windowsHide: true, timeout: 120_000 });

    const installedEnvironment = {
      ...acquisitionEnvironment,
      npm_config_prefix: applicationPrefix,
      A1_CONFIG_DIR: resolve(root, "config"),
      A1_DATA_DIR: resolve(root, "data"),
      A1_RUNTIME_DIR: resolve(root, "runtime"),
      PATH: [applicationBin, bootstrapBin, environment.PATH ?? ""].join(delimiter),
    };
    const bridgeBin = resolve(root, "npm-bridge");
    await mkdir(bridgeBin);
    const bridge = resolve(bridgeBin, "npm-cli.mjs");
    await writeFile(bridge, await readFile(new URL("./published-candidate-npm-bridge.mjs", import.meta.url)));
    const shellQuote = value => `'${value.replaceAll("'", `'"'"'`)}'`;
    await writeFile(resolve(bridgeBin, "npm"), `#!/bin/sh\nexec ${shellQuote(process.execPath)} ${shellQuote(bridge)} "$@"\n`);
    await chmod(resolve(bridgeBin, "npm"), 0o755);
    await writeFile(resolve(bridgeBin, "npm.cmd"), `@echo off\r\n"${process.execPath}" "${bridge}" %*\r\n`);
    installedEnvironment.PUBLISHED_SMOKE_NPM_CLI = resolveInstallerNpmCli(environment);
    installedEnvironment.PUBLISHED_SMOKE_VERSION = version;
    installedEnvironment.PUBLISHED_SMOKE_PACKAGE_NAME = applicationSource.name;
    installedEnvironment.npm_execpath = bridge;
    installedEnvironment.PATH = [bridgeBin, installedEnvironment.PATH].join(delimiter);
    const args = channel === "next" ? ["--develop", version] : [];
    stage = "install-application";
    const installed = await execute(installerLauncher, args, { cwd: root, encoding: "utf8", env: installedEnvironment, windowsHide: true, timeout: COMMAND_BUDGET_MS });
    if (installed.stdout.replace(/\r\n/gu, "\n") !== "a1 successfully installed\n" || installed.stderr !== "") {
      throw new Error("published installer transcript is invalid");
    }

    stage = "verify-manifest";
    const applicationRoot = resolve(applicationPrefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", ...applicationSource.name.split("/"));
    const installedManifest = JSON.parse(await readFile(resolve(applicationRoot, "package.json"), "utf8"));
    if (installedManifest.name !== applicationSource.name || installedManifest.version !== version) {
      throw new Error("published installer selected the wrong application package");
    }
    stage = "launch-application";
    await execute(applicationLauncher, ["version"], { cwd: root, encoding: "utf8", env: installedEnvironment, windowsHide: true, timeout: 30_000 });

    await execute(applicationLauncher, ["--help"], { cwd: root, encoding: "utf8", env: installedEnvironment, windowsHide: true, timeout: 30_000 });

    // Rationale: a second prefix proves predecessor-owned replacement, not merely a fresh install.
    stage = "resolve-predecessor";
    const predecessor = await execute(npm, ["view", `${applicationSource.name}@${channel}`, "version", "--json"], {
      cwd: root, encoding: "utf8", env: acquisitionEnvironment, windowsHide: true, timeout: 30_000,
    });
    let predecessorVersion = JSON.parse(predecessor.stdout);
    if (predecessorVersion === version) {
      const published = await execute(npm, ["view", applicationSource.name, "versions", "--json"], {
        cwd: root, encoding: "utf8", env: acquisitionEnvironment, windowsHide: true, timeout: 30_000,
      });
      const candidates = JSON.parse(published.stdout);
      if (!Array.isArray(candidates)) throw new Error("invalid published predecessor inventory");
      predecessorVersion = candidates.filter(value => typeof value === "string" && /^\d+\.\d+\.\d+(?:-dev\.[1-9]\d*)?$/u.test(value)
        && (channel === "next" ? value.includes("-dev.") : !value.includes("-")) && compareVersions(value, version) < 0)
        .sort(compareVersions).at(-1);
    }
    if (typeof predecessorVersion !== "string" || !/^\d+\.\d+\.\d+(?:-dev\.[1-9]\d*)?$/u.test(predecessorVersion)) throw new Error("invalid published predecessor version");
    if (predecessorVersion === version) throw new Error("published candidate is already advertised; predecessor update smoke requires a distinct public predecessor");
    const updatePrefix = resolve(root, "update-application");
    const updateBin = process.platform === "win32" ? updatePrefix : resolve(updatePrefix, "bin");
    const updateEnvironment = {
      ...installedEnvironment, npm_config_prefix: updatePrefix,
      A1_CONFIG_DIR: resolve(root, "update-config"), A1_DATA_DIR: resolve(root, "update-data"), A1_RUNTIME_DIR: resolve(root, "update-runtime"),
      PUBLISHED_SMOKE_VERSION: predecessorVersion,
      PATH: [bridgeBin, updateBin, bootstrapBin, environment.PATH ?? ""].join(delimiter),
    };
    stage = "install-predecessor";
    await execute(installerLauncher, channel === "next" ? ["--develop", predecessorVersion] : [], {
      cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: COMMAND_BUDGET_MS,
    });
    stage = "update-predecessor";
    updateEnvironment.PUBLISHED_SMOKE_VERSION = version;
    const updateLauncher = resolve(updateBin, process.platform === "win32" ? "a1.cmd" : "a1");
    await execute(updateLauncher, ["update", ...(channel === "next" ? ["--develop", version] : ["--release"])], {
      cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: updateCommandBudgetMs(),
    });
    stage = "launch-updated-application";
    const updatedRoot = resolve(updatePrefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", ...applicationSource.name.split("/"));
    const updatedManifest = JSON.parse(await readFile(resolve(updatedRoot, "package.json"), "utf8"));
    if (updatedManifest.name !== applicationSource.name || updatedManifest.version !== version) throw new Error("predecessor update selected the wrong application package");
    await execute(updateLauncher, ["--help"], { cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: 30_000 });

    evidence = {
      schema: "a1-published-installer-smoke-v1",
      outcome: "success",
      predecessorVersion,
      updateVerified: true,
      platform: process.platform,
      architecture: process.arch,
      nodeVersion: process.version,
      registry: {
        application: { name: applicationSource.name, version, integrity: environment.EXPECTED_APPLICATION_INTEGRITY },
        installer: { name: installerSource.name, version, integrity: environment.EXPECTED_INSTALLER_INTEGRITY },
      },
      transcript: "a1 successfully installed\n",
      installedVersion: installedManifest.version,
      timings,
      launcherVerified: true,
      activationVerified: true,
    };
  } catch (error) {
    primaryError = new Error(safe(error instanceof Error ? error.message : error), { cause: error });
    // Rationale: the live process set is read before settlement stops it; a stalled update is
    // otherwise indistinguishable from one that was already gone.
    const processes = root && runner?.inventory
      ? await runner.inventory().then(rows => rows.slice(0, 40).map(row => ({
        pid: row.pid, parent: row.parent, start: row.start, executable: safe(row.executable), argv: safe(row.argv?.join(" ")),
      }))).catch(inventoryError => ({ error: safe(inventoryError instanceof Error ? inventoryError.message : inventoryError) }))
      : [];
    evidence = {
      schema: "a1-published-installer-smoke-v1", outcome: "failure", stage,
      platform: process.platform, architecture: process.arch, nodeVersion: process.version,
      version, channel, error: primaryError.message,
      child: childOutcome,
      timings,
      processes,
      processHistory: runner?.history ? sanitizedHistory(runner.history(), safe) : null,
      updateRecords: root ? await updateRecordTails(root, safe).catch(error => ({ error: safe(error.message) })) : {},
      npmLogs: root ? await npmLogIdentities(resolve(root, "npm-cache", "_logs")).catch(() => []) : [],
      npmDiagnostics: root ? await npmDiagnosticTails(resolve(root, "npm-cache", "_logs"), safe)
        .catch(error => [safe(`npm diagnostics unavailable: ${error.message}`)]) : [],
      launcherVerified: false, activationVerified: false,
    };
  }
  if (root) {
    try {
      await runner?.close();
      await removeFixture(root);
    } catch (error) {
      const cleanupError = safe(error instanceof Error ? error.message : error);
      if (!primaryError) {
        primaryError = new Error(cleanupError, { cause: error });
        evidence = { ...evidence, outcome: "failure", stage: "cleanup", error: cleanupError, launcherVerified: false, activationVerified: false };
      }
      evidence.cleanup = { error: cleanupError };
    }
  }
  const diagnostic = (title, message) => {
    const text = safe(message).replace(/\r?\n/gu, " | ").slice(0, 1_000);
    // Security: percent and line breaks must never inject another Actions workflow command.
    writeDiagnostic(environment.GITHUB_ACTIONS === "true"
      ? `::error title=${title}::${text.replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A")}\n`
      : `${title}: ${text}\n`);
  };
  if (primaryError) {
    diagnostic("Published installer smoke", `${evidence.stage}: ${evidence.error}`);
    if (evidence.cleanup && evidence.stage !== "cleanup") diagnostic("Published installer smoke cleanup", `secondary cleanup failure: ${evidence.cleanup.error}`);
  }
  try {
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`);
  } catch (error) {
    if (!primaryError) {
      const failure = new Error(safe(error instanceof Error ? error.message : error), { cause: error });
      diagnostic("Published installer smoke", `write-evidence: ${failure.message}`);
      throw failure;
    }
    diagnostic("Published installer smoke evidence", `secondary evidence write failure: ${error instanceof Error ? error.message : error}`);
    throw primaryError;
  }
  if (primaryError) throw primaryError;
  process.stdout.write(`Published installer smoke passed on ${process.platform}/${process.arch}.\n`);
}

/** Sampled sightings with arguments reduced to safe text; the last sighting dates each disappearance. */
function sanitizedHistory(history, safe) {
  return {
    samples: history.samples, errors: history.errors, lastError: history.lastError === null ? null : safe(history.lastError),
    rows: history.rows.slice(0, 80).map(row => ({
      pid: row.pid, parent: row.parent, start: row.start, firstSeen: row.firstSeen, lastSeen: row.lastSeen,
      executable: safe(row.executable), argv: safe(row.argv.join(" ")),
    })),
  };
}

async function npmDiagnosticTails(directory, safe) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const tails = [];
  for (const entry of entries.filter(entry => entry.isFile() && entry.name.endsWith(".log")).sort((left, right) => right.name.localeCompare(left.name)).slice(0, 3)) {
    const tail = await fileTail(resolve(directory, entry.name), safe);
    if (tail !== null) tails.push(tail.tail);
  }
  return tails;
}

/** Newest npm logs by name, size, and modification time; the names date each npm invocation. */
async function npmLogIdentities(directory) {
  const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
  const identities = [];
  for (const entry of entries.filter(entry => entry.isFile() && entry.name.endsWith(".log")).sort((left, right) => right.name.localeCompare(left.name)).slice(0, 10)) {
    const metadata = await stat(resolve(directory, entry.name)).catch(() => null);
    if (metadata) identities.push({ name: entry.name, size: metadata.size, mtime: metadata.mtime.toISOString() });
  }
  return identities;
}

/** The updater's journal and recovery-capsule records from every product data directory in the fixture. */
async function updateRecordTails(root, safe) {
  const records = {};
  for (const dataDirectory of ["data", "update-data"]) {
    const candidates = [resolve(root, dataDirectory, "update-transaction.json")];
    const capsuleRoot = resolve(root, dataDirectory, "update-recovery");
    for (const entry of await readdir(capsuleRoot, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory()) continue;
      // Rationale: the capsule manifest only repeats fixture paths; the owner, result, cancellation,
      // and start-lease records say what the detached replacement actually did.
      for (const name of ["owner.json", "result.json", "cancel.json", "worker-starting.lock"]) candidates.push(resolve(capsuleRoot, entry.name, name));
    }
    for (const path of candidates) {
      const tail = await fileTail(path, safe);
      if (tail !== null) records[relative(root, path).replaceAll("\\", "/")] = tail;
    }
  }
  return records;
}

async function fileTail(path, safe) {
  const file = await open(path, "r").catch(() => null);
  if (!file) return null;
  try {
    const { size, mtime } = await file.stat();
    const buffer = Buffer.alloc(Math.min(size, 16_000));
    const { bytesRead } = await file.read(buffer, 0, buffer.length, Math.max(0, size - buffer.length));
    return { size, mtime: mtime.toISOString(), tail: safe(buffer.subarray(0, bytesRead).toString("utf8")) };
  } finally { await file.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await smokePublishedInstaller(); }
  catch (error) { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; }
}
