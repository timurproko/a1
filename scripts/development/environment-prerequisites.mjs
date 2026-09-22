/**
 * Decide whether a working copy can build, from observations a caller has already gathered.
 * The build chain compiles a Rust crate and the release chain shells out to git, so a clone on a
 * machine without those tools fails deep inside them with no statement of what the machine lacks.
 * This module owns the contract and the wording; probing the machine belongs to its callers.
 */

import { probeFailureDetail } from "./environment-probe.mjs";

export const CARGO_RANGE = ">=1.85";

/**
 * Blocking prerequisites make the build physically impossible; advisory ones are contract
 * mismatches that still produce artifacts, so they are reported without failing a build.
 */
export const BLOCKING = "required";
export const ADVISORY = "advisory";

const COMPARATOR = /^(>=|<=|>|<|=)?\s*v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/u;

/** Read the leading `major.minor.patch` of a tool banner, tolerating absent minor and patch parts. */
export function parseVersion(text) {
  const match = COMPARATOR.exec(String(text ?? "").trim());
  if (!match || match[1]) return null;
  return [Number(match[2]), Number(match[3] ?? 0), Number(match[4] ?? 0)];
}

/**
 * Compatibility: the engine and Cargo contracts use only space-separated comparators over
 * possibly partial versions, so an exact reader for that shape keeps the check dependency-free
 * and therefore usable before `node_modules` exists — which is when it is needed most.
 */
export function satisfiesRange(version, range) {
  const parsed = parseVersion(version);
  if (!parsed) return false;
  const comparators = String(range).trim().split(/\s+/u).filter(Boolean);
  if (comparators.length === 0) return false;
  return comparators.every(comparator => {
    const match = COMPARATOR.exec(comparator);
    if (!match) return false;
    const bound = [Number(match[2]), Number(match[3] ?? 0), Number(match[4] ?? 0)];
    const order = compare(parsed, bound);
    switch (match[1] ?? "=") {
      case ">=": return order >= 0;
      case ">": return order > 0;
      case "<=": return order <= 0;
      case "<": return order < 0;
      default: return order === 0;
    }
  });
}

function compare(left, right) {
  for (let index = 0; index < 3; index += 1) {
    if (left[index] !== right[index]) return left[index] < right[index] ? -1 : 1;
  }
  return 0;
}

/**
 * Turn one set of observations into the ordered prerequisite verdicts, most fundamental first.
 * Every failing verdict carries the exact command that repairs it, because the reader is by
 * definition someone whose environment has never worked.
 */
export function evaluatePrerequisites(observation) {
  const platform = observation.platform ?? "linux";
  return [
    dependencyCheck(observation),
    cargoCheck(observation, platform),
    rustcCheck(observation, cargoRemedy(platform)),
    gitCheck(observation, platform),
    githubCliCheck(observation, platform),
    nodeCheck(observation),
    packageManagerCheck(observation),
  ].map(check => {
    const probe = observation.probes?.[check.id];
    const detail = probe && probeFailureDetail(check.id, probe);
    if (!detail) return check;
    return { ...check, severity: ["gh", "npm"].includes(check.id) ? ADVISORY : check.severity, satisfied: false, detail,
      remedy: `run \`${check.id} --version\` directly to diagnose the toolchain before retrying the build` };
  });
}

function dependencyCheck({ dependencies }) {
  const missing = dependencies?.missing ?? [];
  const mismatched = dependencies?.mismatched ?? [];
  const remedy = "npm ci";
  if (!dependencies?.present) {
    return failure("dependencies", "Dependencies", BLOCKING, "node_modules is absent; no declared dependency can resolve", remedy);
  }
  if (missing.length > 0) {
    const names = missing.slice(0, 5).join(", ");
    const rest = missing.length > 5 ? `, and ${missing.length - 5} more` : "";
    return failure("dependencies", "Dependencies", BLOCKING, `${missing.length} declared dependencies are not installed: ${names}${rest}`, remedy);
  }
  if (mismatched.length > 0) {
    const detail = mismatched.slice(0, 5).map(entry => `${entry.name} ${entry.actual} installed, ${entry.expected} declared`).join("; ");
    return failure("dependencies", "Dependencies", BLOCKING, `node_modules is stale: ${detail}`, remedy);
  }
  return success("dependencies", "Dependencies", `${dependencies.declared} declared dependencies installed`);
}

function cargoRemedy(platform) {
  return platform === "win32"
    ? "winget install Rustlang.Rustup, then open a new shell so %USERPROFILE%\\.cargo\\bin is on PATH"
    : "curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh, then open a new shell so ~/.cargo/bin is on PATH";
}

function cargoCheck({ cargo }, platform) {
  const remedy = cargoRemedy(platform);
  if (!cargo) return failure("cargo", "Rust toolchain", BLOCKING, `cargo is not on PATH; the build compiles native/process-guardian and needs Cargo ${CARGO_RANGE}`, remedy);
  if (!satisfiesRange(cargo, CARGO_RANGE)) {
    return failure("cargo", "Rust toolchain", BLOCKING, `cargo ${cargo} is older than the required ${CARGO_RANGE}`, "rustup update stable");
  }
  return success("cargo", "Rust toolchain", `cargo ${cargo}`);
}

/**
 * Rationale: rustup installs cargo and rustc together, so an absent cargo makes the toolchain
 * install the fix for both. Only a working cargo beside a missing rustc is a partial toolchain
 * worth repairing with rustup itself, which is by then guaranteed to be present.
 */
function rustcCheck({ rustc, cargo }, toolchainRemedy) {
  if (rustc) return success("rustc", "Rust compiler", `rustc ${rustc}`);
  const remedy = cargo ? "rustup toolchain install stable" : toolchainRemedy;
  return failure("rustc", "Rust compiler", BLOCKING, "rustc is not on PATH; Cargo cannot compile the native crate without it", remedy);
}

function gitCheck({ git }, platform) {
  const remedy = platform === "win32" ? "winget install Git.Git" : "install git with the system package manager";
  if (!git) return failure("git", "Git", BLOCKING, "git is not on PATH; governance and release scripts read repository state through it", remedy);
  return success("git", "Git", `git ${git}`);
}

/**
 * Rationale: the release and pull request paths drive GitHub exclusively through the `gh` CLI, so a
 * machine without it can build and test but cannot publish. That makes it an advisory rather than a
 * blocker, reported before the attempt instead of as a spawn failure part-way through a release.
 */
function githubCliCheck({ githubCli }, platform) {
  const remedy = platform === "win32"
    ? "winget install GitHub.cli, then run gh auth login"
    : "install the GitHub CLI, then run gh auth login";
  if (!githubCli) return failure("gh", "GitHub CLI", ADVISORY, "gh is not on PATH; the release and pull request workflows drive GitHub through it", remedy);
  return success("gh", "GitHub CLI", `gh ${githubCli}`);
}

function nodeCheck({ node, engines }) {
  if (!engines) return success("node", "Node.js", `${node} (no engine contract declared)`);
  if (!satisfiesRange(node, engines)) {
    return failure("node", "Node.js", ADVISORY, `${node} is outside the declared engine contract ${engines}`,
      "switch to a supported release, for example `fnm use 24` or `nvm use 24`");
  }
  return success("node", "Node.js", `${node} satisfies ${engines}`);
}

function packageManagerCheck({ npm, packageManager }) {
  const declared = /^npm@(\d+)/u.exec(String(packageManager ?? ""))?.[1];
  if (!declared) return success("npm", "npm", "no npm version is pinned by packageManager");
  if (!npm) return success("npm", "npm", `could not be determined; ${packageManager} is declared`);
  const major = parseVersion(npm)?.[0];
  if (String(major) !== declared) {
    return failure("npm", "npm", ADVISORY, `npm ${npm} does not match the declared major of ${packageManager}`, `npm install --global npm@${declared}`);
  }
  return success("npm", "npm", `npm ${npm} matches ${packageManager}`);
}

function success(id, label, detail) {
  return { id, label, severity: BLOCKING, satisfied: true, detail, remedy: null };
}

function failure(id, label, severity, detail, remedy) {
  return { id, label, severity, satisfied: false, detail, remedy };
}

/** Select the verdicts that must stop a build, leaving advisories to be reported only. */
export function blockingFailures(checks) {
  return checks.filter(check => !check.satisfied && check.severity === BLOCKING);
}

/** Select the verdicts worth stating without failing anything. */
export function advisories(checks) {
  return checks.filter(check => !check.satisfied && check.severity === ADVISORY);
}

/** Render every verdict as an aligned report for a reader who asked for the full picture. */
export function formatReport(checks, packageName) {
  const width = Math.max(...checks.map(check => check.label.length));
  const lines = [`Environment prerequisites for ${packageName}`, ""];
  for (const check of checks) {
    const state = check.satisfied ? "ok  " : check.severity === BLOCKING ? "FAIL" : "warn";
    lines.push(`  ${state}  ${check.label.padEnd(width)}  ${check.detail}`);
    if (check.remedy) lines.push(`${" ".repeat(width + 10)}fix: ${check.remedy}`);
  }
  lines.push("", summary(checks));
  return `${lines.join("\n")}\n`;
}

/** Render only what is wrong, for a build that should say nothing when the machine is ready. */
export function formatFailures(checks) {
  const blocking = blockingFailures(checks);
  const lines = blocking.map(check => `  ${check.label}: ${check.detail}\n    fix: ${check.remedy}`);
  return `Environment prerequisites are not met.\n${lines.join("\n")}\n\nRun \`npm run doctor\` for the full report.\n`;
}

function summary(checks) {
  const blocking = blockingFailures(checks).length;
  const advisory = advisories(checks).length;
  if (blocking === 0 && advisory === 0) return "All prerequisites satisfied.";
  const parts = [];
  if (blocking > 0) parts.push(`${blocking} blocking ${blocking === 1 ? "prerequisite" : "prerequisites"} unmet`);
  if (advisory > 0) parts.push(`${advisory} ${advisory === 1 ? "advisory" : "advisories"}`);
  return `${parts.join(", ")}.`;
}
