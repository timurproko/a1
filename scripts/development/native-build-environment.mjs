/**
 * Resolve the native compiler environment without changing the launching shell or persistent PATH.
 * This module intentionally imports only node: builtins so `npm run doctor` can use it before
 * dependencies are installed.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { win32 } from "node:path";
import { locateExecutable, PROBE_TIMEOUT_MS } from "./environment-probe.mjs";

export const MSVC_COMPONENT = "Microsoft.VisualStudio.Component.VC.Tools.x86.x64";
export const VCVARS_SENTINEL = "__A1_VCVARS_ENVIRONMENT__";

function environmentValue(environment, name) {
  const key = Object.keys(environment).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  return key ? environment[key] : undefined;
}

function setEnvironmentValue(environment, name, value) {
  const existing = Object.keys(environment).find(candidate => candidate.toLowerCase() === name.toLowerCase());
  if (existing && existing !== name) delete environment[existing];
  environment[name] = value;
}

function prependPath(environment, directory) {
  const current = environmentValue(environment, "PATH") ?? "";
  const entries = current.split(";").filter(Boolean);
  if (!entries.some(entry => win32.resolve(entry.replace(/^"|"$/gu, "")).toLowerCase() === win32.resolve(directory).toLowerCase())) {
    entries.unshift(directory);
  }
  setEnvironmentValue(environment, "PATH", entries.join(";"));
}

function executableIn(command, options) {
  return options.locate(command, { platform: "win32", env: options.environment, exists: options.exists });
}

function resolveRustTool(name, override, options) {
  if (override?.trim()) {
    const path = executableIn(override.trim(), options);
    return path
      ? { status: "ready", source: "override", path }
      : { status: "invalid-override", source: "override", path: null };
  }
  const fromPath = executableIn(name, options);
  if (fromPath) return { status: "ready", source: "path", path: fromPath };
  const profile = environmentValue(options.environment, "USERPROFILE");
  const canonical = profile ? win32.join(profile, ".cargo", "bin", `${name}.exe`) : null;
  if (canonical && options.exists(canonical)) return { status: "ready", source: "rustup", path: canonical };
  return { status: "missing", source: "missing", path: null };
}

/** Find Cargo and rustc without requiring a new shell after Rustup installation. */
export function resolveWindowsRust(environment, { exists = existsSync, locate = locateExecutable } = {}) {
  const effective = { ...environment };
  const options = { environment: effective, exists, locate };
  const cargo = resolveRustTool("cargo", environmentValue(effective, "CARGO"), options);
  const rustc = resolveRustTool("rustc", environmentValue(effective, "RUSTC"), options);
  for (const tool of [cargo, rustc]) {
    if (tool.source === "rustup" && tool.path) prependPath(effective, win32.dirname(tool.path));
  }
  if (cargo.path) effective.CARGO = cargo.path;
  if (rustc.path) effective.RUSTC = rustc.path;
  return { environment: effective, cargo, rustc };
}

function inside(parent, child) {
  if (!parent || !child) return false;
  const relative = win32.relative(win32.resolve(parent), win32.resolve(child));
  return relative === "" || (!relative.startsWith("..") && !win32.isAbsolute(relative));
}

function isX64Tool(path) {
  return /\\bin\\hostx(?:64|86)\\x64\\[^\\]+\.exe$/iu.test(path ?? "");
}

/** Verify that Cargo would reach Microsoft's x64 linker and an initialized Windows SDK. */
export function inspectMsvcEnvironment(environment, { exists = existsSync, locate = locateExecutable } = {}) {
  const compiler = locate("cl", { platform: "win32", env: environment, exists });
  const linker = locate("link", { platform: "win32", env: environment, exists });
  const tools = environmentValue(environment, "VCToolsInstallDir")?.trim();
  const sdk = environmentValue(environment, "WindowsSdkDir")?.trim();
  const libraries = environmentValue(environment, "LIB")?.trim();
  const ready = Boolean(compiler && linker && tools && sdk && libraries
    && inside(tools, compiler) && inside(tools, linker) && isX64Tool(compiler) && isX64Tool(linker));
  return {
    ready,
    compiler,
    linker,
    tools: tools || null,
    sdk: sdk || null,
    reason: ready ? null
      : !tools ? "the Visual Studio C++ environment is not initialized"
        : !compiler ? "cl.exe is unavailable in the Visual Studio C++ environment"
          : !linker || !inside(tools, linker) || !isX64Tool(linker) ? "Microsoft x64 link.exe is not selected in the Visual Studio C++ environment"
            : !inside(tools, compiler) || !isX64Tool(compiler) ? "x64 cl.exe is outside the selected Visual Studio C++ tools"
              : !sdk || !libraries ? "the Windows SDK library environment is not initialized"
                : "the Visual Studio C++ environment is incomplete",
  };
}

function safeInstallationPath(value) {
  const path = value.split(/\r?\n/u).map(line => line.trim()).find(Boolean) ?? "";
  return path && !/[\r\n"&|<>]/u.test(path) ? path : null;
}

function queryVisualStudio(vswhere, requires, options) {
  const arguments_ = ["-latest", "-products", "*"];
  if (requires) arguments_.push("-requires", MSVC_COMPONENT);
  arguments_.push("-utf8", "-format", "value", "-property", "installationPath");
  const result = options.spawn(vswhere, arguments_, {
    encoding: "utf8", windowsHide: true, timeout: PROBE_TIMEOUT_MS, env: options.environment,
  });
  if (result.error) return { status: result.error.code === "ETIMEDOUT" ? "timeout" : "spawn-error", path: null };
  if (result.status !== 0) return { status: "exit", path: null };
  const path = typeof result.stdout === "string" ? safeInstallationPath(result.stdout) : null;
  return { status: path ? "ok" : "empty", path };
}

/** Parse only the environment emitted after the private vcvars sentinel. */
export function parseVcvarsEnvironment(stdout, sentinel = VCVARS_SENTINEL) {
  if (typeof stdout !== "string") return null;
  const marker = stdout.split(/\r?\n/u).findIndex(line => line.trim() === sentinel);
  if (marker < 0) return null;
  const environment = {};
  for (const line of stdout.split(/\r?\n/u).slice(marker + 1)) {
    const equals = line.indexOf("=");
    if (equals <= 0) continue;
    const key = line.slice(0, equals);
    if (!/^[A-Za-z_][A-Za-z0-9_()]*$/u.test(key)) continue;
    environment[key] = line.slice(equals + 1);
  }
  return Object.keys(environment).length > 0 ? environment : null;
}

function mergeWindowsEnvironment(base, captured) {
  const merged = { ...base };
  for (const [key, value] of Object.entries(captured)) setEnvironmentValue(merged, key, value);
  return merged;
}

function findVswhere(environment, exists, locate) {
  const programFiles = environmentValue(environment, "ProgramFiles(x86)");
  const standard = programFiles ? win32.join(programFiles, "Microsoft Visual Studio", "Installer", "vswhere.exe") : null;
  if (standard && exists(standard)) return standard;
  return locate("vswhere", { platform: "win32", env: environment, exists });
}

/** Discover a complete stable Visual Studio install and import its x64 child environment. */
export function resolveWindowsMsvc(environment, {
  exists = existsSync,
  locate = locateExecutable,
  spawn = spawnSync,
} = {}) {
  const current = inspectMsvcEnvironment(environment, { exists, locate });
  if (current.ready) return { environment: { ...environment }, msvc: { status: "ready", source: "environment", ...current } };

  const vswhere = findVswhere(environment, exists, locate);
  if (!vswhere) {
    return { environment: { ...environment }, msvc: { status: "missing-installation", source: "missing", ...current } };
  }
  const options = { environment, spawn };
  const complete = queryVisualStudio(vswhere, true, options);
  if (complete.status !== "ok") {
    if (complete.status !== "empty") {
      return { environment: { ...environment }, msvc: { status: "probe-failed", source: "vswhere", probeStatus: complete.status, ...current } };
    }
    const anyInstallation = queryVisualStudio(vswhere, false, options);
    const status = anyInstallation.status === "ok" ? "missing-workload"
      : anyInstallation.status === "empty" ? "missing-installation" : "probe-failed";
    return { environment: { ...environment }, msvc: { status, source: "vswhere", probeStatus: anyInstallation.status, ...current } };
  }

  const vcvars = win32.join(complete.path, "VC", "Auxiliary", "Build", "vcvars64.bat");
  if (!exists(vcvars)) {
    return { environment: { ...environment }, msvc: { status: "missing-workload", source: "vswhere", ...current } };
  }
  const command = `call "${vcvars}" amd64 >nul && echo ${VCVARS_SENTINEL} && set`;
  const systemRoot = environmentValue(environment, "SystemRoot");
  const standardCommandInterpreter = systemRoot ? win32.join(systemRoot, "System32", "cmd.exe") : null;
  const commandInterpreter = standardCommandInterpreter && exists(standardCommandInterpreter)
    ? standardCommandInterpreter : locate("cmd", { platform: "win32", env: environment, exists });
  if (!commandInterpreter) {
    return { environment: { ...environment }, msvc: { status: "initialization-failed", source: "vcvars", probeStatus: "cmd-missing", ...current } };
  }
  const result = spawn(commandInterpreter, ["/d", "/u", "/s", "/c", command], {
    encoding: "utf16le", windowsHide: true, windowsVerbatimArguments: true,
    timeout: PROBE_TIMEOUT_MS, env: environment,
  });
  if (result.error || result.status !== 0) {
    const probeStatus = result.error?.code === "ETIMEDOUT" ? "timeout" : result.error ? "spawn-error" : "exit";
    return { environment: { ...environment }, msvc: { status: "initialization-failed", source: "vcvars", probeStatus, ...current } };
  }
  const captured = parseVcvarsEnvironment(result.stdout);
  if (!captured) {
    return { environment: { ...environment }, msvc: { status: "initialization-failed", source: "vcvars", probeStatus: "invalid-environment", ...current } };
  }
  const effective = mergeWindowsEnvironment(environment, captured);
  const initialized = inspectMsvcEnvironment(effective, { exists, locate });
  if (!initialized.ready) {
    return { environment: effective, msvc: { status: "initialization-failed", source: "vcvars", probeStatus: "incomplete-environment", ...initialized } };
  }
  return { environment: effective, msvc: { status: "ready", source: "discovered", ...initialized } };
}

/** Reject a direct native build before Cargo when Windows discovery did not produce usable tools. */
export function requireNativeBuildEnvironment(resolved) {
  if (resolved.msvc.status === "not-required") return resolved.environment;
  const blockers = [];
  if (resolved.cargo.status !== "ready") blockers.push("Rust/Cargo");
  if (resolved.rustc.status !== "ready") blockers.push("rustc");
  if (resolved.msvc.status !== "ready") blockers.push("Microsoft C++ x64 tools and Windows SDK");
  if (blockers.length > 0) {
    throw new Error(`Windows native build prerequisites are unavailable: ${blockers.join(", ")}. Run \`npm run doctor\` for the ordered setup steps.`);
  }
  return resolved.environment;
}

/** Resolve every host-native tool needed by Cargo and return an environment for child processes. */
export function resolveNativeBuildEnvironment({
  platform = process.platform,
  environment = process.env,
  exists = existsSync,
  locate = locateExecutable,
  spawn = spawnSync,
} = {}) {
  if (platform !== "win32") {
    return {
      environment: { ...environment },
      cargo: { status: "unresolved", source: environment.CARGO ? "override" : "path", path: environment.CARGO ?? null },
      rustc: { status: "unresolved", source: environment.RUSTC ? "override" : "path", path: environment.RUSTC ?? null },
      msvc: { status: "not-required", source: "platform" },
    };
  }
  const rust = resolveWindowsRust(environment, { exists, locate });
  const windows = resolveWindowsMsvc(rust.environment, { exists, locate, spawn });
  return { environment: windows.environment, cargo: rust.cargo, rustc: rust.rustc, msvc: windows.msvc };
}
