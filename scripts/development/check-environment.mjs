#!/usr/bin/env node
/**
 * Report whether this machine can build the repository, and say exactly what to install when it cannot.
 * Runs first in the build chain so a fresh clone fails with a named cause instead of a resolver
 * error, and runs standalone as `npm run doctor`. It imports nothing outside `node:` builtins
 * because the condition it most needs to diagnose is an absent `node_modules`.
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { advisories, blockingFailures, evaluatePrerequisites, formatFailures, formatReport } from "./environment-prerequisites.mjs";
import { locateExecutable, probeVersion } from "./environment-probe.mjs";
import { inspectDependencies } from "./dependency-inspection.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const environment = process.env;
const verbose = process.argv.includes("--report") || environment.A1_BUILD_VERBOSE === "1";

const probes = {};
function probe(command, executable = command) {
  probes[command] = probeVersion(executable, {
    locate: candidate => locateExecutable(candidate, { platform: process.platform, env: environment }),
  });
  return probes[command].version;
}

// Rationale: npm runs this script, so its own banner is already in the environment; spawning the
// shim would cost a shell on Windows to learn something the caller has stated.
function npmVersion() {
  return /\bnpm\/(\d+\.\d+\.\d+)/u.exec(environment.npm_config_user_agent ?? "")?.[1] ?? probe("npm");
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
  dependencies: inspectDependencies(root, manifest),
  probes,
});

if (verbose) process.stdout.write(formatReport(checks, manifest.name));
const blocking = blockingFailures(checks);
if (!verbose) {
  for (const advisory of advisories(checks)) process.stderr.write(`${manifest.name}: ${advisory.detail} (fix: ${advisory.remedy})\n`);
  if (blocking.length > 0) process.stderr.write(formatFailures(checks));
}
if (blocking.length > 0) process.exitCode = 1;
