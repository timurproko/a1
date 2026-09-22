/** Base-controlled, dependency-free selection and freshness checks for PR-attached complete regression. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseImplementation } from "../governance/openspec-archive-policy.mjs";

const SHA = /^[0-9a-f]{40}$/u;
const LABEL = "ci:full-regression";
const PREFIXES = ["scripts/release/", "scripts/development/", "scripts/pi/", "src/foundation/release/", "test/foundation/release/", "test/support/", "test/fixtures/", "native/", "bin/", "config/", ".github/workflows/", ".github/actions/"];
const EXACT = new Set([".github/workflows/ci.yml", ".github/workflows/full-regression.yml", ".github/workflows/full-regression-shared.yml", ".github/workflows/release.yml",
  "package.json", "package-lock.json", ".npmrc", "tsconfig.json", "tsconfig.build.json", "tsconfig.bin.json", "vitest.config.ts",
  "config/validation-suites.json", "config/validation-ownership.json", "config/integration-owners.json", "config/integration-impact-policy.json",
  "src/cli/dispatch.ts", "src/cli/version-stats.ts", "test/cli/update-cli.test.ts", "test/cli/version-stats.test.ts",
  "scripts/clean.mjs", "scripts/governance/candidate-evidence.mjs", "scripts/governance/acceptance-validation-route.mjs"]);
const DOCUMENT = path => path === "README.md" || path.startsWith("docs/") || path.startsWith("openspec/");

/** Canonical input digest; artifacts contain identities, not the potentially sensitive PR body. */
export function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

/** Capture all metadata capable of changing selection; unrelated labels still invalidate old decisions safely. */
export function pullIdentity(pull) {
  if (!pull || !Number.isSafeInteger(pull.number) || pull.number < 1 || !SHA.test(pull.head?.sha ?? "") || !SHA.test(pull.base?.sha ?? "")
    || pull.base?.ref !== "develop" || typeof pull.head?.ref !== "string" || typeof pull.draft !== "boolean" || pull.state !== "open"
    || !Array.isArray(pull.labels) || pull.labels.some(label => typeof label?.name !== "string")) throw new Error("invalid or closed full-regression PR identity");
  return { pr: pull.number, head: pull.head.sha, base: pull.base.sha, branch: pull.head.ref, draft: pull.draft,
    repository: pull.base.repo?.full_name, labels: pull.labels.map(label => label.name).sort(), bodyDigest: digest(pull.body ?? "") };
}

/** Parse the complete NUL-delimited Git comparison, preserving renamed-from paths and rejecting unsafe inputs. */
export function changedPaths(text) {
  const fields = text.split("\0");
  if (fields.pop() !== "") throw new Error("truncated Git comparison");
  const paths = [];
  while (fields.length) {
    const status = fields.shift();
    if (!/^(?:[AMDTUXB]|[RC]\d{1,3})$/u.test(status ?? "")) throw new Error("invalid Git comparison status");
    for (let count = /^[RC]/u.test(status) ? 2 : 1; count > 0; count--) {
      const path = fields.shift();
      if (typeof path !== "string" || !path || path.length > 1024 || /[\x00-\x1f\\]/u.test(path)
        || path.startsWith("/") || path.split("/").some(part => part === ".." || part === "." || !part)) throw new Error("invalid Git comparison path");
      paths.push(path);
    }
    if (paths.length > 8192) throw new Error("full-regression comparison exceeds its bound");
  }
  return [...new Set(paths)].sort();
}

function repairAssociation(body, historyPaths, branch) {
  const link = parseImplementation(body);
  if (!link && body.includes("openspec-implementation")) throw new Error("ambiguous implementation association");
  const change = link?.change ?? "";
  return branch.startsWith("fix/nightly-regression-") || change.startsWith("fix-nightly-regression-")
    || historyPaths.some(path => /(?:^|\/)\d{4}-\d{2}-\d{2}-fix-nightly-regression-|(?:^|\/)fix-nightly-regression-/u.test(path));
}

/** Keep ordinary cadence except for explicit repair, release-impact, or additive maintainer selection. */
export function selectFullRegression({ pull, paths, historyPaths = [], versionOnly = false, mergeBase, bootstrap = false }) {
  const identity = pullIdentity(pull);
  if (!SHA.test(mergeBase ?? "") || !Array.isArray(paths) || paths.length === 0 || paths.length > 8192
    || paths.some(path => typeof path !== "string" || !path || path.length > 1024 || /[\x00-\x1f\\]/u.test(path)
      || path.startsWith("/") || path.split("/").some(part => part === ".." || part === "." || !part))
    || !Array.isArray(historyPaths) || historyPaths.length > 8192 || historyPaths.some(path => typeof path !== "string")) throw new Error("incomplete full-regression comparison");
  const repair = repairAssociation(pull.body ?? "", historyPaths, identity.branch);
  const docsOnly = paths.every(DOCUMENT);
  const planning = identity.draft && docsOnly;
  const reasons = [];
  if (!planning) {
    if (repair) reasons.push("nightly-repair");
    if (identity.labels.includes(LABEL)) reasons.push("maintainer-opt-in");
    if (bootstrap) reasons.push("base-policy-bootstrap");
    else if (!docsOnly && !versionOnly) {
      if (paths.some(path => EXACT.has(path) || PREFIXES.some(prefix => path.startsWith(prefix))
        || /^test\/repository-governance\/(?:release|publication|full-regression|pr-full-regression|validation|regression-triage|environment)/u.test(path))) reasons.push("release-impact");
      if (paths.some(path => !DOCUMENT(path) && !/^(?:src|test|config|\.agents|native|bin)\/|^scripts\/pi\//u.test(path) && !EXACT.has(path) && !PREFIXES.some(prefix => path.startsWith(prefix)))) reasons.push("unknown-operational-input");
    }
  }
  const value = { schema: "a1-pr-full-regression-selection-v1", ...identity, mergeBase, selected: reasons.length > 0,
    reasons: reasons.length ? reasons : [planning ? "planning-only-draft" : docsOnly ? "docs-only" : versionOnly ? "version-only" : "ordinary-cadence"],
    comparisonDigest: digest({ paths, historyPaths, versionOnly }), bootstrap };
  return { ...value, selectionId: digest(value) };
}

/** Reject stale metadata or a selected reusable job that did not succeed; an unselected job must be skipped. */
export function requireFullRegressionSelection(recorded, current, result) {
  if (!recorded || recorded.selectionId !== current.selectionId || digest(recorded) !== digest(current)) throw new Error("full-regression selection is stale or altered");
  const expected = current.selected ? "success" : "skipped";
  if (result !== expected) throw new Error(`full regression must be ${expected}; received ${result ?? "missing"}`);
  return { selected: current.selected, head: current.head, selectionId: current.selectionId };
}

function git(repo, args) {
  return execFileSync("git", ["-c", "core.hooksPath=/dev/null", "-C", repo, ...args], { encoding: "utf8", timeout: 30000, maxBuffer: 8 * 1024 * 1024, windowsHide: true });
}

function versionOnlyComparison(repo, base, head, paths) {
  if (!paths.length || paths.some(path => !["package.json", "package-lock.json"].includes(path))) return false;
  return paths.every(path => {
    const before = JSON.parse(git(repo, ["show", `${base}:${path}`]));
    const after = JSON.parse(git(repo, ["show", `${head}:${path}`]));
    for (const value of [before, after]) {
      if (typeof value.version !== "string") return false;
      delete value.version;
      if (path === "package-lock.json" && value.packages?.[""]) delete value.packages[""].version;
    }
    return JSON.stringify(before) === JSON.stringify(after);
  });
}

/** Read public PR metadata with a bounded request, never run head code with the read token. */
export async function readCurrentPull(repository, number, token, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? "") || !Number.isSafeInteger(number) || number < 1) throw new Error("invalid GitHub pull identity");
  const response = await request(`https://api.github.com/repos/${repository}/pulls/${number}`, {
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`full-regression PR metadata unavailable (${response.status})`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declared) && declared > 1024 * 1024) throw new Error("full-regression PR metadata exceeds its bound");
  const text = await response.text();
  if (Buffer.byteLength(text) > 1024 * 1024) throw new Error("full-regression PR metadata exceeds its bound");
  return JSON.parse(text);
}

/** Full Git comparison and bounded branch history avoid pagination truncation and erased repair scaffolds. */
export function selectFromRepository(repo, pull, bootstrap = false) {
  const identity = pullIdentity(pull);
  const mergeBase = git(repo, ["merge-base", identity.base, identity.head]).trim();
  if (!SHA.test(mergeBase)) throw new Error("invalid comparison merge base");
  const paths = changedPaths(git(repo, ["diff", "--name-status", "-z", "--find-renames", mergeBase, identity.head]));
  const historyFields = git(repo, ["log", "--format=", "--name-only", "-z", `${mergeBase}..${identity.head}`, "--", "openspec/changes/"]).split("\0");
  if (historyFields.length > 8193) throw new Error("full-regression repair history exceeds its bound");
  const historyPaths = [...new Set(historyFields.filter(path => path.includes("fix-nightly-regression-")))].sort();
  return selectFullRegression({ pull, paths, historyPaths, mergeBase, versionOnly: versionOnlyComparison(repo, mergeBase, identity.head, paths), bootstrap });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const expected = pullIdentity(event.pull_request);
  const pull = await readCurrentPull(process.env.GITHUB_REPOSITORY, expected.pr, process.env.GITHUB_TOKEN);
  if (digest(expected) !== digest(pullIdentity(pull))) throw new Error("PR changed since this event; await its current run");
  const current = selectFromRepository(process.cwd(), pull);
  const path = ".artifacts/validation/full-regression-selection.json";
  if (process.argv.includes("--verify")) {
    const recorded = JSON.parse(readFileSync(path, "utf8"));
    requireFullRegressionSelection(recorded, current, process.env.FULL_REGRESSION_RESULT);
  } else {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(current, null, 2)}\n`);
    appendFileSync(process.env.GITHUB_OUTPUT, `selected=${current.selected}\nhead=${current.head}\nbase=${current.base}\nselection-id=${current.selectionId}\n`);
  }
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## PR Full regression\nHead: \`${current.head}\`\nSelected: **${current.selected}** (${current.reasons.join(", ")})\nSelection: \`${current.selectionId}\`\n`);
}
