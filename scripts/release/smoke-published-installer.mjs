import { execFile as execFileCallback } from "node:child_process";
import { chmod, lstat, mkdtemp, mkdir, open, readFile, readdir, realpath, rm, stat, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { createPublishedSmokeRunner } from "./published-smoke-processes.mjs";
import { prepareLegacyRecoveryObservation } from "./published-predecessor-recovery.mjs";
import { tmpdir } from "node:os";
import { delimiter, dirname, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareVersions, resolveInstallerNpmCli, sanitizeDiagnostic } from "../../packages/a1-install/bin/a1-install.js";

const execFile = promisify(execFileCallback);
const COMMAND_BUDGET_MS = 10 * 60_000;
const UPDATE_BUDGET_MS = 5 * 60_000;

/** Bound a stalled predecessor update independently of its older internal recovery deadline. */
export function updateCommandBudgetMs() {
  return UPDATE_BUDGET_MS;
}

/** Run published installation in disposable prefixes and retain safe evidence on either outcome. */
export async function smokePublishedInstaller({
  environment = process.env, createRunner = createPublishedSmokeRunner,
  removeFixture = root => rm(root, { recursive: true, force: true, maxRetries: 4, retryDelay: 200 }),
  writeDiagnostic = text => process.stderr.write(text),
  writeProgress = text => process.stdout.write(text),
  readSystemEvents = readWindowsSystemEvents,
  prepareRecoveryObservation = prepareLegacyRecoveryObservation,
} = {}) {
  const version = environment.RELEASE_VERSION;
  const channel = environment.RELEASE_CHANNEL;
  const output = resolve(environment.PUBLISHED_INSTALLER_EVIDENCE ?? ".artifacts/validation/published-installer.json");
  const startedAt = new Date().toISOString();
  let root;
  let runner;
  let stage = "prepare";
  let childOutcome;
  let evidence;
  let primaryError;
  let applicationPackageName = "";
  let predecessorUpdate = null;
  let upgradeMethod = "predecessor-update";
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
    writeProgress(`[published installer] ${stage} started\n`);
    const result = await runner.run(command, args, options);
    const durationMs = Date.now() - startedAt;
    timings[stage] = (timings[stage] ?? 0) + durationMs;
    writeProgress(`[published installer] ${stage} ${result.status === 0 && !result.error ? "passed" : "failed"} (${durationMs}ms)\n`);
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
    applicationPackageName = applicationSource.name;
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
    const updatedRoot = resolve(updatePrefix, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules", ...applicationSource.name.split("/"));
    updateEnvironment.PUBLISHED_SMOKE_VERSION = version;
    const observation = await prepareRecoveryObservation({ root, packageRoot: updatedRoot, dataDir: updateEnvironment.A1_DATA_DIR, version, environment: updateEnvironment });
    stage = "update-predecessor";
    const updateLauncher = resolve(updateBin, process.platform === "win32" ? "a1.cmd" : "a1");
    try {
      await execute(updateLauncher, ["update", ...(channel === "next" ? ["--develop", version] : ["--release"])], {
        cwd: root, encoding: "utf8", env: observation?.environment ?? updateEnvironment, windowsHide: true, timeout: updateCommandBudgetMs(),
        ...(observation ? { failureProbe: async () => {
          const crash = await observation.readFailure();
          return crash ? new Error(`legacy recovery owner exited after ${crash.code} ${crash.syscall} owner.json`) : null;
        } } : {}),
      });
    } catch (error) {
      const crash = await observation?.readFailure().catch(() => null);
      predecessorUpdate = { outcome: "failure", error: safe(error instanceof Error ? error.message : error), child: childOutcome, crash: crash ?? null };
      if (!crash || childOutcome.signal || !runner.inventory) throw error;
      // Invariant: preserve the failed attempt, then stop every writer before the installer touches its prefix.
      predecessorUpdate.processes = (await runner.inventory()).slice(0, 40).map(row => ({
        pid: row.pid, parent: row.parent, start: row.start, executable: safe(row.executable), argv: safe(row.argv?.join(" ")),
      }));
      predecessorUpdate.updateRecords = await updateRecordTails(root, safe);
      stage = "settle-legacy-predecessor";
      await runner.close();
      runner = createRunner(root);
      upgradeMethod = "installer-recovery";
      writeProgress("[published installer] authenticated legacy heartbeat failure; recovering with the published installer after process settlement\n");
      stage = "recover-predecessor-with-installer";
      const recovered = await execute(installerLauncher, [...args, "--repair", resolve(dirname(crash.ownerPath), "capsule.json")], { cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: COMMAND_BUDGET_MS });
      if (recovered.stdout.replace(/\r\n/gu, "\n") !== "a1 successfully installed\n" || recovered.stderr !== "") throw new Error("published recovery installer transcript is invalid");
    }
    stage = "launch-updated-application";
    const updatedManifest = JSON.parse(await readFile(resolve(updatedRoot, "package.json"), "utf8"));
    if (updatedManifest.name !== applicationSource.name || updatedManifest.version !== version) throw new Error("predecessor update selected the wrong application package");
    if (upgradeMethod === "installer-recovery") {
      const state = JSON.parse(await readFile(resolve(updateEnvironment.A1_DATA_DIR, "release-state.json"), "utf8"));
      if (state.releases?.[state.references?.active]?.packageVersion !== version) throw new Error("installer recovery did not activate the exact candidate");
      const launched = await execute(updateLauncher, ["version"], { cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: 30_000 });
      if (!launched.stdout.includes(version)) throw new Error("recovered launcher reported the wrong version");
    }
    await execute(updateLauncher, ["--help"], { cwd: root, encoding: "utf8", env: updateEnvironment, windowsHide: true, timeout: 30_000 });

    evidence = {
      schema: "a1-published-installer-smoke-v1",
      outcome: "success",
      predecessorVersion,
      upgradeMethod,
      predecessorUpdate,
      updateVerified: upgradeMethod === "predecessor-update",
      installerRecoveryVerified: upgradeMethod === "installer-recovery",
      upgradeVerified: true,
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
      upgradeMethod, predecessorUpdate,
      child: childOutcome,
      timings,
      processes,
      processHistory: runner?.history ? sanitizedHistory(runner.history(), safe) : null,
      // Rationale: a detached tree that vanishes on the hosted runner but not locally is named by the
      // machine's own records (antimalware remediation, application crash, shutdown), not by npm's.
      systemEvents: await readSystemEvents(startedAt).then(events => sanitizedSystemEvents(events, safe))
        .catch(error => ({ error: safe(error instanceof Error ? error.message : error) })),
      replacementState: root ? await replacementState(root, applicationPackageName, safe).catch(error => ({ error: safe(error.message) })) : {},
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
  process.stdout.write(`Published installer smoke passed on ${process.platform}/${process.arch}${upgradeMethod === "installer-recovery" ? " via explicit installer recovery (legacy direct update failed)" : ""}.\n`);
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

const WINDOWS_EVENT_QUERY = `
$ErrorActionPreference = 'SilentlyContinue'
$since = [datetime]::Parse('__SINCE__').ToUniversalTime()
$rows = @()
$rows += @(Get-WinEvent -FilterHashtable @{LogName='Microsoft-Windows-Windows Defender/Operational'; StartTime=$since} -MaxEvents 40)
$rows += @(Get-WinEvent -FilterHashtable @{LogName='Application'; ProviderName=@('Application Error','Windows Error Reporting','.NET Runtime'); StartTime=$since} -MaxEvents 40)
$rows += @(Get-WinEvent -FilterHashtable @{LogName='System'; Id=@(7031,7034,1074,6008); StartTime=$since} -MaxEvents 20)
$events = @($rows | Where-Object { $_ } | Select-Object @{n='log';e={$_.LogName}},@{n='id';e={$_.Id}},@{n='time';e={$_.TimeCreated.ToUniversalTime().ToString('o')}},@{n='provider';e={$_.ProviderName}},@{n='message';e={if ($_.Message) { $_.Message.Substring(0, [Math]::Min(600, $_.Message.Length)) } else { '' }}})
$status = Get-MpComputerStatus | Select-Object RealTimeProtectionEnabled, BehaviorMonitorEnabled, AntivirusEnabled, AntivirusSignatureVersion, AMEngineVersion
$json = @{ events = $events; antimalware = $status } | ConvertTo-Json -Compress -Depth 4
[Console]::Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($json)))
`;

/**
 * Windows records since the fixture began: antimalware detections and actions, application crashes and
 * error reports, service failures and shutdowns, plus the antimalware status. Empty elsewhere.
 */
export async function readWindowsSystemEvents(since, { platform = process.platform, execute = execFile } = {}) {
  if (platform !== "win32") return { events: [], antimalware: null };
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/u.test(since)) throw new Error("invalid system event window");
  // Security: the window is validated above, so substituting it is safe; the encoded form survives quoting and line breaks.
  const script = Buffer.from(WINDOWS_EVENT_QUERY.replace("__SINCE__", since), "utf16le").toString("base64");
  const { stdout } = await execute("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-EncodedCommand", script], {
    encoding: "utf8", windowsHide: true, timeout: 30_000, maxBuffer: 8 * 1024 * 1024,
  });
  const parsed = JSON.parse(Buffer.from(stdout.trim(), "base64").toString("utf8") || "{}");
  const events = Array.isArray(parsed.events) ? parsed.events : parsed.events ? [parsed.events] : [];
  return { events, antimalware: parsed.antimalware ?? null };
}

function sanitizedSystemEvents(records, safe) {
  const events = (records?.events ?? []).slice(0, 100).map(event => ({
    log: safe(event.log), id: event.id, time: event.time, provider: safe(event.provider), message: safe(event.message).slice(0, 600),
  }));
  return { events, antimalware: records?.antimalware ?? null };
}

/** How far npm got in each prefix: retired trees, the installed manifest version, and what the launchers run. */
async function replacementState(root, packageName, safe) {
  const state = {};
  const scope = packageName.split("/")[0];
  for (const prefix of ["application", "update-application"]) {
    const prefixRoot = resolve(root, prefix);
    const modules = resolve(prefixRoot, ...(process.platform === "win32" ? [] : ["lib"]), "node_modules");
    const entries = await readdir(modules).catch(() => null);
    if (entries === null) continue;
    const manifest = await readFile(resolve(modules, ...packageName.split("/"), "package.json"), "utf8")
      .then(text => JSON.parse(text).version ?? null).catch(() => null);
    const launchers = {};
    const launcherRoot = process.platform === "win32" ? prefixRoot : resolve(prefixRoot, "bin");
    for (const name of process.platform === "win32" ? ["a1", "a1.cmd", "a1.ps1"] : ["a1"]) {
      const metadata = await lstat(resolve(launcherRoot, name)).catch(() => null);
      if (!metadata) continue;
      launchers[name] = metadata.isSymbolicLink()
        ? { link: safe(await realpath(resolve(launcherRoot, name)).catch(() => "unresolved")) }
        : { content: safe((await readFile(resolve(launcherRoot, name), "utf8").catch(() => "")).slice(0, 600)) };
    }
    state[prefix] = {
      retired: entries.filter(entry => entry.startsWith(".")).slice(0, 20),
      scoped: entries.includes(scope),
      installedVersion: manifest,
      launchers,
    };
  }
  return state;
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
