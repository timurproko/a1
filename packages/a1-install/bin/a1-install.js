#!/usr/bin/env node

import { spawn } from "node:child_process";
import { access, lstat, readFile, realpath } from "node:fs/promises";
import { existsSync } from "node:fs";
import { delimiter, dirname, isAbsolute, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const APPLICATION_PACKAGE = "@timurproko/a1";
const COMMAND = "a1";
const PROGRESS_WIDTH = 40;
const DIAGNOSTIC_LIMIT = 8_000;
const PHASES = new Set([
  "Preparing",
  "Resolving version",
  "Resolving packages",
  "Downloading packages",
  "Installing",
  "Activating",
  "Verifying",
]);
const STABLE_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u;
const DEVELOPMENT_VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-dev\.[1-9]\d*$/u;
const VERSION_PATTERN = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-dev\.[1-9]\d*)?$/u;

class InstallationFailure extends Error {
  constructor(reason, details = "", exitCode = 1) {
    super(reason);
    this.name = "InstallationFailure";
    this.reason = reason;
    this.details = details;
    this.exitCode = exitCode;
  }
}

class InstallationCancelled extends InstallationFailure {
  constructor() {
    super("installation cancelled", "", 130);
    this.name = "InstallationCancelled";
  }
}

export function parseArguments(argv) {
  if (!Array.isArray(argv) || argv.length > 8 || argv.some(value => typeof value !== "string" || value.length > 128)) {
    throw new InstallationFailure("invalid command arguments", "", 2);
  }
  let target = { kind: "stable" };
  let verbose = false;
  let help = false;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--help" || value === "-h") {
      help = true;
      continue;
    }
    if (value === "--verbose") {
      if (verbose) throw new InstallationFailure("--verbose was supplied more than once", "", 2);
      verbose = true;
      continue;
    }
    if (value === "--develop") {
      if (target.kind === "version") throw new InstallationFailure("--develop cannot be combined with --version", "", 2);
      if (target.kind !== "stable") throw new InstallationFailure("--develop was supplied more than once", "", 2);
      target = { kind: "develop" };
      continue;
    }
    if (value === "--version") {
      const version = argv[index + 1];
      if (version === undefined || version.startsWith("-")) {
        throw new InstallationFailure("--version requires an exact development version", "", 2);
      }
      if (!DEVELOPMENT_VERSION_PATTERN.test(version)) {
        throw new InstallationFailure("--version requires an exact development version", "", 2);
      }
      if (target.kind === "develop") throw new InstallationFailure("--develop cannot be combined with --version", "", 2);
      if (target.kind !== "stable") throw new InstallationFailure("--version was supplied more than once", "", 2);
      target = { kind: "version", version };
      index += 1;
      continue;
    }
    if (value?.startsWith("-")) throw new InstallationFailure("unsupported option", "", 2);
    throw new InstallationFailure("unexpected argument", "", 2);
  }
  if (help && argv.some(value => !["--help", "-h"].includes(value))) {
    throw new InstallationFailure("--help cannot be combined with another option", "", 2);
  }
  return { target, verbose, help };
}

export function installerHelp() {
  return [
    "a1-install",
    "a1-install --develop",
    "a1-install --version <x.y.z-dev.n>",
    "a1-install --verbose",
    "",
  ].join("\n");
}

export function renderProgressBar(percent) {
  const bounded = Math.min(100, Math.max(0, Math.round(percent)));
  const filled = Math.round((bounded / 100) * PROGRESS_WIDTH);
  const completed = "\u001b[38;2;138;190;183m";
  const gray = "\u001b[38;2;128;128;128m";
  const track = "\u001b[38;2;102;102;102m";
  return `${completed}${"━".repeat(filled)}${track}${"─".repeat(PROGRESS_WIDTH - filled)}${gray} ${bounded}%\u001b[39m`;
}

export function classifyProgressLine(line, fallback = "Installing") {
  const value = String(line).replace(/\r/g, "").trim();
  if (/npm verbose title npm (?:view|show)\b/iu.test(value)) return "Resolving version";
  if (/npm verbose title npm (?:install|ci)\b/iu.test(value)) return "Resolving packages";
  if (/npm http (?:fetch|cache)\b/iu.test(value)) return "Downloading packages";
  if (/npm info run\b/iu.test(value)) return "Installing";
  return PHASES.has(fallback) ? fallback : "Installing";
}

export function conciseFailure(stage, diagnostics) {
  const text = String(diagnostics ?? "").toLowerCase();
  if (/e401|e403|unauthorized|authentication|forbidden/u.test(text)) return "registry authentication failed";
  if (/e404|etarget|not found|no matching version/u.test(text)) return stage === "resolve" ? "the selected release was not found" : "npm installation failed";
  if (/eacces|eperm|permission denied|access is denied/u.test(text)) return "permission was denied";
  if (/enotfound|eai_again|econnreset|econnrefused|network|socket|timed? ?out/u.test(text)) return "network access failed";
  if (stage === "resolve") return "could not resolve the selected release";
  if (stage === "update") return "existing installation could not be updated";
  if (stage === "activate") return "activation failed";
  return "npm installation failed";
}

export function sanitizeDiagnostic(value) {
  const safe = String(value ?? "")
    .replace(/\u001B\][^\u0007]*(?:\u0007|\u001B\\)/gu, "")
    .replace(/\u001B(?:[@-_]|\[[0-?]*[ -/]*[@-~])/gu, "")
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F-\u009F]/gu, "");
  const lines = safe
    .split(/\n/u)
    .map(line => line.trim())
    .filter(Boolean)
    .filter(line => !/^(?:authorization|token|password|_auth)\s*[:=]/iu.test(line))
    .map(line => line
      .replace(/(https?:\/\/)[^/@\s]+@/giu, "$1[redacted]@")
      .replace(/([?&](?:token|key|auth|password)=)[^&\s]+/giu, "$1[redacted]")
      .replace(/((?:_authToken|authorization|password|token)\s*[:=]\s*)\S+/giu, "$1[redacted]")
      .replace(/(bearer\s+)\S+/giu, "$1[redacted]"));
  return lines.slice(-4).join(" | ").slice(0, 1_000);
}

class ProgressDisplay {
  constructor(output, enabled, options = {}) {
    this.output = output;
    this.enabled = enabled;
    this.interval = options.interval ?? 200;
    this.current = 0;
    this.shown = -1;
    this.label = "Preparing";
    this.timer = null;
    this.visible = false;
    this.maxWidth = PROGRESS_WIDTH + 6 + 1 + 64;
  }

  set(percent, label, creepTo = percent) {
    if (!this.enabled) return;
    this.stop();
    this.current = Math.max(this.current, percent);
    if (PHASES.has(label)) this.label = label;
    this.shown = -1;
    this.draw();
    if (creepTo <= this.current) return;
    this.timer = setInterval(() => {
      this.current = Math.min(creepTo - 1, this.current + (creepTo - this.current) * 0.04);
      this.draw();
    }, this.interval);
    this.timer.unref?.();
  }

  draw() {
    const rounded = Math.round(this.current);
    if (rounded === this.shown) return;
    this.shown = rounded;
    if (!this.visible) this.output.write("\u001b[?25l");
    this.visible = true;
    this.output.write(`\r${renderProgressBar(rounded)} ${this.label}`);
  }

  finish() {
    if (!this.enabled) return;
    this.stop();
    this.current = 100;
    this.shown = -1;
    this.draw();
    this.clear();
  }

  clear() {
    this.stop();
    if (!this.enabled || !this.visible) return;
    this.output.write(`\r${" ".repeat(this.maxWidth)}\r`);
    this.output.write("\u001b[39m\u001b[?25h");
    this.visible = false;
    this.shown = -1;
  }

  stop() {
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
  }
}

function createDefaultProcessRunner(environment, platform) {
  const npmCli = resolveNpmCli(environment);
  return {
    npm: async (args, callbacks = {}) => await runChild(process.execPath, [npmCli, ...args], { environment, ...callbacks }),
    node: async (entry, args, callbacks = {}) => await runChild(process.execPath, [entry, ...args], { environment, ...callbacks }),
  };

  function resolveNpmCli(env) {
    const declared = env.npm_execpath;
    if (declared) {
      const candidate = /npx-cli\.js$/iu.test(declared) ? resolve(dirname(declared), "npm-cli.js") : declared;
      if (existsSync(candidate)) return candidate;
    }
    for (const directory of String(env.PATH ?? "").split(delimiter)) {
      if (!directory) continue;
      const candidates = [
        resolve(directory, "node_modules", "npm", "bin", "npm-cli.js"),
        resolve(directory, "..", "lib", "node_modules", "npm", "bin", "npm-cli.js"),
      ];
      for (const candidate of candidates) if (existsSync(candidate)) return candidate;
    }
    throw new InstallationFailure("npm is unavailable");
  }
}

async function runChild(command, args, options) {
  return await new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, args, {
      env: { ...options.environment, NO_UPDATE_NOTIFIER: "1", npm_config_update_notifier: "false" },
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    options.onChild?.(child);
    let stdout = "";
    let stderr = "";
    let stdoutPending = "";
    let stderrPending = "";
    const consume = (stream, chunk, callback) => {
      const combined = `${stream}${chunk}`.slice(-DIAGNOSTIC_LIMIT);
      const lines = combined.split(/\r?\n/u);
      const pending = lines.pop() ?? "";
      for (const line of lines) callback?.(line);
      return pending;
    };
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", chunk => {
      stdout = `${stdout}${chunk}`.slice(-DIAGNOSTIC_LIMIT);
      stdoutPending = consume(stdoutPending, chunk, options.onStdoutLine);
    });
    child.stderr?.on("data", chunk => {
      stderr = `${stderr}${chunk}`.slice(-DIAGNOSTIC_LIMIT);
      stderrPending = consume(stderrPending, chunk, options.onStderrLine);
    });
    let settled = false;
    child.once("error", error => {
      if (settled) return;
      settled = true;
      rejectPromise(error);
    });
    child.once("close", (code, signal) => {
      if (settled) return;
      settled = true;
      if (stdoutPending) options.onStdoutLine?.(stdoutPending);
      if (stderrPending) options.onStderrLine?.(stderrPending);
      resolvePromise({ code, signal, stdout, stderr });
    });
  });
}

function targetSpec(target) {
  if (target.kind === "develop") return `${APPLICATION_PACKAGE}@next`;
  if (target.kind === "version") return `${APPLICATION_PACKAGE}@${target.version}`;
  return `${APPLICATION_PACKAGE}@latest`;
}

function updateArguments(target) {
  if (target.kind === "develop") return ["update", "--develop"];
  if (target.kind === "version") return ["update", "--develop", target.version];
  return ["update"];
}

function parseResolvedVersion(stdout, target) {
  const text = String(stdout).trim();
  let value = text;
  try {
    const parsed = JSON.parse(text);
    if (typeof parsed === "string") value = parsed;
    else if (Array.isArray(parsed) && typeof parsed[0] === "string") value = parsed[0];
  } catch {
    // Compatibility: npm can return the plain version when a registry overrides JSON formatting.
  }
  value = value.trim();
  if (!VERSION_PATTERN.test(value)) throw new InstallationFailure("could not resolve the selected release", text);
  if (target.kind === "stable" && !STABLE_VERSION_PATTERN.test(value)) throw new InstallationFailure("could not resolve the selected release", text);
  if (target.kind === "develop" && !DEVELOPMENT_VERSION_PATTERN.test(value)) throw new InstallationFailure("could not resolve the selected release", text);
  if (target.kind === "version" && value !== target.version) throw new InstallationFailure("the selected release was not found", text);
  return value;
}

function packageRootFor(globalRoot) {
  return resolve(globalRoot, ...APPLICATION_PACKAGE.split("/"));
}

async function readExistingManifest(packageRoot) {
  let metadata;
  try { metadata = await lstat(packageRoot); }
  catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new InstallationFailure("existing installation ownership could not be verified", String(error));
  }
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new InstallationFailure("existing installation ownership could not be verified");
  }
  const manifest = await readManifest(packageRoot);
  if (manifest === null) throw new InstallationFailure("existing installation ownership could not be verified");
  return manifest;
}

async function readManifest(packageRoot) {
  try {
    return JSON.parse(await readFile(resolve(packageRoot, "package.json"), "utf8"));
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return null;
    throw new InstallationFailure("the installed package is incomplete", String(error));
  }
}

function launcherPaths(globalRoot, platform) {
  if (platform === "win32") {
    const prefix = dirname(globalRoot);
    return [resolve(prefix, COMMAND), resolve(prefix, `${COMMAND}.cmd`), resolve(prefix, `${COMMAND}.ps1`)];
  }
  const prefix = dirname(dirname(globalRoot));
  return [resolve(prefix, "bin", COMMAND)];
}

async function assertLaunchersAbsent(globalRoot, platform) {
  for (const path of launcherPaths(globalRoot, platform)) {
    try {
      await lstat(path);
      throw new InstallationFailure("existing installation ownership could not be verified");
    } catch (error) {
      if (error && typeof error === "object" && error.code === "ENOENT") continue;
      if (error instanceof InstallationFailure) throw error;
      throw new InstallationFailure("existing installation ownership could not be verified", String(error));
    }
  }
}

async function verifyLaunchers(globalRoot, platform) {
  const paths = launcherPaths(globalRoot, platform);
  const entry = resolve(packageRootFor(globalRoot), "bin", "cli.js");
  const expectedSuffix = `${APPLICATION_PACKAGE}/bin/cli.js`;
  for (const path of paths) {
    try {
      const metadata = await lstat(path);
      if (metadata.isSymbolicLink()) {
        if (normalizePath(await realpath(path), platform) !== normalizePath(entry, platform)) throw new Error("launcher target differs");
      } else if (metadata.isFile()) {
        const content = await readFile(path, "utf8");
        if (content.length > 32_768 || !content.replaceAll("\\", "/").includes(expectedSuffix)) throw new Error("launcher content differs");
      } else throw new Error("not a file");
    } catch (error) {
      throw new InstallationFailure("launcher verification failed", String(error));
    }
  }
  return paths;
}

function normalizePath(value, platform) {
  const normalized = resolve(value);
  return platform === "win32" ? normalized.toLowerCase() : normalized;
}

async function verifyCommandResolution(expected, environment, platform) {
  const names = platform === "win32" ? ["a1.com", "a1.exe", "a1.bat", "a1.cmd", "a1.ps1", "a1"] : ["a1"];
  let selected = null;
  for (const directory of String(environment.PATH ?? "").split(delimiter)) {
    if (!directory) continue;
    for (const name of names) {
      const candidate = resolve(directory, name);
      try {
        await access(candidate);
        selected = candidate;
        break;
      } catch { /* Rationale: keep searching the remaining PATH candidates. */ }
    }
    if (selected) break;
  }
  if (!selected) throw new InstallationFailure("the installed command is not active in this shell");
  const expectedNormalized = new Set(expected.map(path => normalizePath(path, platform)));
  if (!expectedNormalized.has(normalizePath(selected, platform))) {
    // Platform: Unix npm launchers are symlinks; lexical launcher ownership is authoritative,
    // while canonical comparison also accepts shells that return the resolved target.
    try {
      const selectedReal = normalizePath(await realpath(selected), platform);
      const expectedReal = new Set(await Promise.all(expected.map(async path => normalizePath(await realpath(path), platform))));
      if (expectedReal.has(selectedReal)) return;
    } catch { /* Rationale: report the stable public reason below. */ }
    throw new InstallationFailure("another command takes precedence");
  }
}

async function verifyInstalledPackage(packageRoot, targetVersion) {
  const manifest = await readManifest(packageRoot);
  if (manifest === null) throw new InstallationFailure("the installed package is incomplete");
  if (manifest.name !== APPLICATION_PACKAGE) throw new InstallationFailure("the installed package identity is invalid");
  if (manifest.version !== targetVersion) throw new InstallationFailure("the installed version does not match the selected release");
  if (!Array.isArray(manifest.updateActivationContracts) || !manifest.updateActivationContracts.includes("activate-v1")) {
    throw new InstallationFailure("activation failed", "the selected release does not declare the required activation contract");
  }
  return manifest;
}

async function activateInstalled(runner, packageRoot, targetVersion, progress, setActiveChild, isCancelled) {
  const entry = resolve(packageRoot, "bin", "activate.js");
  try { await access(entry); } catch { throw new InstallationFailure("activation failed", "activation entry is missing"); }
  let completed = false;
  let failure = "";
  let relay = Promise.resolve();
  const result = await runner.node(entry, ["--target-version", targetVersion], {
    onChild: setActiveChild,
    onStdoutLine: line => {
      relay = relay.then(async () => {
        let event;
        try { event = JSON.parse(line); } catch { failure ||= "activation returned an invalid event"; return; }
        if (event?.event === "materializing" && Number.isFinite(event.completed) && Number.isFinite(event.total)) {
          const ratio = event.total > 0 ? Math.min(1, event.completed / event.total) : 0;
          progress.set(76 + ratio * 14, "Activating");
        } else if (event?.event === "phase") {
          if (event.phase === "materialized") progress.set(90, "Activating", 93);
          else if (event.phase === "certified") progress.set(94, "Activating", 96);
          else if (event.phase === "active-reference-committed") progress.set(98, "Verifying", 99);
          else failure ||= "activation returned an invalid phase";
        } else if (event?.event === "warmup") {
          if (event.state === "started") progress.set(96, "Activating", 97);
          else if (event.state === "completed") progress.set(97, "Verifying", 98);
          else failure ||= "activation returned an invalid warmup state";
        } else if (event?.event === "completed") completed = true;
        else if (event?.event === "failed" && typeof event.message === "string") failure ||= event.message;
        else failure ||= "activation returned an invalid event";
      });
    },
  });
  await relay;
  setActiveChild(null);
  if (isCancelled()) throw new InstallationCancelled();
  if (result.code !== 0 || failure || !completed) {
    throw new InstallationFailure("activation failed", failure || result.stderr || `exit ${result.code ?? result.signal ?? "unknown"}`);
  }
}

export async function runInstaller(argv, options = {}) {
  const stdout = options.stdout ?? process.stdout;
  const stderr = options.stderr ?? process.stderr;
  const environment = options.environment ?? process.env;
  const platform = options.platform ?? process.platform;
  const parsed = parseArguments(argv);
  if (parsed.help) {
    stdout.write(installerHelp());
    return 0;
  }
  if (!/^v?(?:22\.(?:19|[2-9]\d)|2[3-4]\.\d+)\./u.test(process.version)) {
    throw new InstallationFailure("Node.js 22.19.0 or newer is required");
  }

  const progress = options.progress ?? new ProgressDisplay(stdout, options.tty ?? stdout.isTTY === true, options.progressOptions);
  const runner = options.runner ?? createDefaultProcessRunner(environment, platform);
  let activeChild = null;
  let killTimer = null;
  let cancelled = options.signal?.aborted === true;
  const stopActiveChild = () => {
    try { activeChild?.kill("SIGTERM"); } catch { /* Rationale: cancellation continues to terminal restoration. */ }
    if (activeChild && killTimer === null) {
      killTimer = setTimeout(() => {
        try { activeChild?.kill("SIGKILL"); } catch { /* Rationale: the owned child may already have exited. */ }
      }, 5_000);
      killTimer.unref?.();
    }
  };
  const setActiveChild = child => {
    activeChild = child;
    if (child === null && killTimer !== null) { clearTimeout(killTimer); killTimer = null; }
    else if (child !== null && cancelled) stopActiveChild();
  };
  const cancel = () => {
    cancelled = true;
    stopActiveChild();
  };
  if (options.handleSignals !== false) {
    process.once("SIGINT", cancel);
    process.once("SIGTERM", cancel);
  }
  options.signal?.addEventListener("abort", cancel, { once: true });

  try {
    progress.set(3, "Preparing", 10);
    let phase = "Resolving version";
    const resolveResult = await runner.npm([
      "view", targetSpec(parsed.target), "version", "--json", "--loglevel=verbose", "--no-fund", "--no-audit",
    ], {
      onChild: setActiveChild,
      onStderrLine: line => { phase = classifyProgressLine(line, phase); progress.set(10, phase, 18); },
    });
    setActiveChild(null);
    if (cancelled) throw new InstallationCancelled();
    if (resolveResult.code !== 0) throw new InstallationFailure(conciseFailure("resolve", resolveResult.stderr), resolveResult.stderr);
    const targetVersion = parseResolvedVersion(resolveResult.stdout, parsed.target);
    progress.set(18, "Resolving packages", 24);

    const rootResult = await runner.npm(["root", "--global", "--loglevel=error", "--no-fund", "--no-audit"], { onChild: setActiveChild });
    setActiveChild(null);
    if (cancelled) throw new InstallationCancelled();
    const globalRoot = rootResult.stdout.trim();
    if (rootResult.code !== 0 || !globalRoot || !isAbsolute(globalRoot)) {
      throw new InstallationFailure("the npm global installation cannot be verified", rootResult.stderr || rootResult.stdout);
    }
    const packageRoot = packageRootFor(globalRoot);
    const existing = await readExistingManifest(packageRoot);
    if (existing !== null && existing.name !== APPLICATION_PACKAGE) {
      throw new InstallationFailure("existing installation ownership could not be verified");
    }

    if (existing !== null) {
      const cli = resolve(packageRoot, "bin", "cli.js");
      try {
        await access(cli);
        const existingLaunchers = await verifyLaunchers(globalRoot, platform);
        await verifyCommandResolution(existingLaunchers, environment, platform);
      } catch (error) {
        if (error instanceof InstallationFailure && error.reason === "another command takes precedence") throw error;
        throw new InstallationFailure("existing installation ownership could not be verified", error instanceof Error ? error.message : String(error));
      }
      progress.set(24, "Installing", 90);
      const updateResult = await runner.node(cli, updateArguments(parsed.target), { onChild: setActiveChild });
      setActiveChild(null);
      if (cancelled) throw new InstallationCancelled();
      if (updateResult.code !== 0) {
        throw new InstallationFailure(conciseFailure("update", `${updateResult.stderr}\n${updateResult.stdout}`), `${updateResult.stderr}\n${updateResult.stdout}`, updateResult.code ?? 1);
      }
    } else {
      await assertLaunchersAbsent(globalRoot, platform);
      let installPhase = "Resolving packages";
      progress.set(24, installPhase, 70);
      const installResult = await runner.npm([
        "install", "--global", "--loglevel=verbose", "--ignore-scripts", "--no-fund", "--no-audit", "--progress=false",
        `${APPLICATION_PACKAGE}@${targetVersion}`,
      ], {
        onChild: setActiveChild,
        onStdoutLine: line => { installPhase = classifyProgressLine(line, installPhase); progress.set(24, installPhase, 70); },
        onStderrLine: line => { installPhase = classifyProgressLine(line, installPhase); progress.set(24, installPhase, 70); },
      });
      setActiveChild(null);
      if (cancelled) throw new InstallationCancelled();
      if (installResult.code !== 0) {
        throw new InstallationFailure(conciseFailure("install", `${installResult.stderr}\n${installResult.stdout}`), `${installResult.stderr}\n${installResult.stdout}`, installResult.code ?? 1);
      }
      progress.set(72, "Installing", 76);
      await verifyInstalledPackage(packageRoot, targetVersion);
      await activateInstalled(runner, packageRoot, targetVersion, progress, setActiveChild, () => cancelled);
    }

    progress.set(98, "Verifying", 99);
    await verifyInstalledPackage(packageRoot, targetVersion);
    const launchers = await verifyLaunchers(globalRoot, platform);
    await verifyCommandResolution(launchers, environment, platform);
    if (cancelled) throw new InstallationCancelled();
    progress.finish();
    stdout.write("a1 successfully installed\n");
    return 0;
  } catch (error) {
    progress.clear();
    if (cancelled || error instanceof InstallationCancelled) {
      stderr.write("installation cancelled\n");
      return 130;
    }
    const failure = error instanceof InstallationFailure
      ? error
      : new InstallationFailure("unexpected installer failure", error instanceof Error ? error.message : String(error));
    stderr.write(`installation failed: ${failure.reason}\n`);
    if (parsed.verbose) {
      const details = sanitizeDiagnostic(failure.details);
      if (details) stderr.write(`Details: ${details}\n`);
    }
    return failure.exitCode;
  } finally {
    progress.clear();
    if (options.handleSignals !== false) {
      process.removeListener("SIGINT", cancel);
      process.removeListener("SIGTERM", cancel);
    }
    options.signal?.removeEventListener("abort", cancel);
    if (killTimer !== null) clearTimeout(killTimer);
  }
}

export async function main(argv = process.argv.slice(2)) {
  try {
    return await runInstaller(argv);
  } catch (error) {
    const failure = error instanceof InstallationFailure
      ? error
      : new InstallationFailure("unexpected installer failure", error instanceof Error ? error.message : String(error));
    process.stderr.write(`installation failed: ${failure.reason}\n`);
    return failure.exitCode;
  }
}

const invoked = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : null;
if (invoked === import.meta.url) process.exitCode = await main();
