#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { GHOSTTY_VT_COMMIT } from "./build-terminal-host.mjs";
import { fetchTerminalVt, TERMINAL_VT_DIRECTORY, TERMINAL_VT_PLATFORMS } from "./fetch-terminal-vt.mjs";
import { RELEASE_TARGETS, ZIG_BASELINE_CPU } from "./native-target.mjs";

const repositoryRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const terminalHostBuild = resolve(repositoryRoot, "scripts/development/build-terminal-host.mjs");
const terminalVtSource = resolve(repositoryRoot, "native/terminal-host/vendor/libghostty-vt");
const cacheDirectory = resolve(repositoryRoot, TERMINAL_VT_DIRECTORY);

/** The native identity expected by this checkout's terminal-host build. */
export async function expectedTerminalVtIdentity(platform = process.platform, architecture = process.arch) {
  const target = Object.entries(RELEASE_TARGETS).find(([, value]) => value.platform === platform && value.architecture === architecture);
  if (!target) throw new Error(`the resident terminal host does not support ${platform}-${architecture}`);
  const [cargoTarget, identity] = target;
  return {
    schema: "a1-terminal-vt-v1",
    version: (await readFile(resolve(terminalVtSource, "VERSION"), "utf8")).trim(),
    ghosttyCommit: GHOSTTY_VT_COMMIT,
    cargoTarget,
    zigTarget: identity.zigTarget,
    zigCpu: ZIG_BASELINE_CPU,
  };
}

/** Whether a cached CI library declares the exact native identity this checkout will link. */
export async function terminalVtCacheCompatible(directory, expected) {
  try {
    const manifest = JSON.parse(await readFile(resolve(directory, "terminal-vt.manifest.json"), "utf8"));
    return Object.entries(expected).every(([field, value]) => manifest[field] === value)
      && Array.isArray(manifest.files) && manifest.files.length > 0;
  } catch {
    return false;
  }
}

/** Select a compatible CI-built VT library for every platform whose native lane publishes one. */
export async function selectLocalTerminalVt({
  platform = process.platform,
  architecture = process.arch,
  environment = process.env,
  cache = cacheDirectory,
  branch = gitBranch(),
  fetch = fetchTerminalVt,
} = {}) {
  const explicit = environment.TERMINAL_HOST_PREBUILT_VT?.trim();
  if (explicit) return resolve(explicit);
  await expectedTerminalVtIdentity(platform, architecture);
  const artifactPlatform = `${platform}-${architecture}`;
  // CI exports the library it linked for its three native validation targets. Intel macOS has no
  // native lane, so its local build uses the pinned Zig toolchain instead of inventing an artifact.
  if (!TERMINAL_VT_PLATFORMS.includes(artifactPlatform)) return null;
  const expected = await expectedTerminalVtIdentity(platform, architecture);
  if (existsSync(cache) && await terminalVtCacheCompatible(cache, expected)) return cache;
  try {
    return fetch({ branches: [branch, "develop"], platform: artifactPlatform, target: cache, includeMergedDevelop: true }).target;
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`the normal build needs a verified ${artifactPlatform} terminal library before it can build resident tabs: ${detail}`);
  }
}

export async function prepareLocalTerminalHost(options = {}) {
  const environment = options.environment ?? process.env;
  // CI owns its pinned Zig setup and release artifact assembly. Local Windows builds instead link
  // a manifest-verified library so the quarantined Zig package fetch never runs on the workstation.
  const prebuilt = environment.CI ? null : await selectLocalTerminalVt({ ...options, environment });
  if (prebuilt === null && !environment.CI) requirePinnedZig(environment);
  const childEnvironment = prebuilt === null ? { ...environment } : {
    ...environment,
    TERMINAL_HOST_LOCAL_BUILD: "1",
    TERMINAL_HOST_PREBUILT_VT: prebuilt,
  };
  const result = spawnSync(process.execPath, [terminalHostBuild], {
    cwd: repositoryRoot,
    env: childEnvironment,
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exitCode = result.status ?? 1;
  return result.status ?? 1;
}

function requirePinnedZig(environment) {
  const executable = environment.ZIG?.trim() || "zig";
  const result = spawnSync(executable, ["version"], { env: environment, encoding: "utf8", windowsHide: true });
  if (result.error || result.status !== 0) {
    throw new Error(`the normal resident build requires Zig 0.15.2 for this platform; install the pinned toolchain or set TERMINAL_HOST_PREBUILT_VT to a verified library`);
  }
  if (result.stdout.trim() !== "0.15.2") throw new Error(`the normal resident build requires Zig 0.15.2, but ${executable} reports ${result.stdout.trim() || "an unknown version"}`);
}

function gitBranch() {
  const result = spawnSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd: repositoryRoot, encoding: "utf8", windowsHide: true });
  return result.status === 0 && result.stdout.trim() && result.stdout.trim() !== "HEAD" ? result.stdout.trim() : "develop";
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await prepareLocalTerminalHost();
}
