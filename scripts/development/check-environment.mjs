#!/usr/bin/env node
/**
 * Report whether this machine can build the repository, and say exactly what to install when it cannot.
 * Runs first in the build chain so a fresh clone fails with a named cause instead of a resolver or
 * Cargo error, and runs standalone as `npm run doctor`. It imports nothing outside `node:` builtins
 * because the condition it most needs to diagnose is an absent `node_modules`.
 */
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { advisories, blockingFailures, evaluatePrerequisites, formatFailures, formatReport } from "./environment-prerequisites.mjs";
import { probeVersion } from "./environment-probe.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const verbose = process.argv.includes("--report") || process.env.A1_BUILD_VERBOSE === "1";

const probes = {};
function probe(command) {
  probes[command] = probeVersion(command);
  return probes[command].version;
}

// Rationale: npm runs this script, so its own banner is already in the environment; spawning the
// shim would cost a shell on Windows to learn something the caller has stated.
function npmVersion() {
  return /\bnpm\/(\d+\.\d+\.\d+)/u.exec(process.env.npm_config_user_agent ?? "")?.[1] ?? probe("npm");
}

function inspectDependencies(manifest) {
  const declared = { ...manifest.dependencies, ...manifest.devDependencies };
  const names = Object.keys(declared);
  if (!existsSync(resolve(root, "node_modules"))) return { present: false, declared: names.length, missing: names, mismatched: [] };
  const missing = [];
  const mismatched = [];
  for (const name of names) {
    let installed = null;
    try {
      installed = JSON.parse(readFileSync(resolve(root, "node_modules", name, "package.json"), "utf8"));
    } catch {
      missing.push(name);
      continue;
    }
    // Invariant: every non-optional dependency is pinned exactly, so a differing installed version
    // means node_modules predates the current lockfile rather than legitimately satisfying a range.
    if (/^\d/u.test(declared[name]) && installed.version !== declared[name]) {
      mismatched.push({ name, expected: declared[name], actual: installed.version });
    }
  }
  return { present: true, declared: names.length, missing, mismatched };
}

const manifest = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const checks = evaluatePrerequisites({
  platform: process.platform,
  node: process.version,
  engines: manifest.engines?.node,
  packageManager: manifest.packageManager,
  npm: npmVersion(),
  git: probe("git"),
  githubCli: probe("gh"),
  cargo: probe("cargo"),
  rustc: probe("rustc"),
  dependencies: inspectDependencies(manifest),
  probes,
});

if (verbose) process.stdout.write(formatReport(checks, manifest.name));
const blocking = blockingFailures(checks);
if (!verbose) {
  for (const advisory of advisories(checks)) process.stderr.write(`${manifest.name}: ${advisory.detail} (fix: ${advisory.remedy})\n`);
  if (blocking.length > 0) process.stderr.write(formatFailures(checks));
}
if (blocking.length > 0) process.exitCode = 1;
