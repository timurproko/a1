/** Base-controlled, dependency-free selection and freshness checks for PR-attached complete regression. */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseImplementation } from "../governance/openspec-archive-policy.mjs";

const SHA = /^[0-9a-f]{40}$/u;
const DOCUMENT = path => path === "README.md" || path.startsWith("docs/") || path.startsWith("openspec/");
const PROVENANCE_SCHEMA = "a1-regression-triage-provenance-v1";
const PROVENANCE_PATH = /^(?:openspec\/changes\/fix-nightly-regression-[^/]+|openspec\/changes\/archive\/\d{4}-\d{2}-\d{2}-fix-nightly-regression-[^/]+)\/regression-provenance\.json$/u;
const TRIAGE_APP = Object.freeze({ login: "openspec-ci[bot]", id: 329165293, type: "Bot" });

/** Canonical input digest; artifacts contain identities, not the potentially sensitive PR body. */
export function digest(value) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }

/** Capture all metadata capable of changing selection; unrelated labels still invalidate old decisions safely. */
export function pullIdentity(pull) {
  if (!pull || !Number.isSafeInteger(pull.number) || pull.number < 1 || !SHA.test(pull.head?.sha ?? "") || !SHA.test(pull.base?.sha ?? "")
    || pull.base?.ref !== "develop" || typeof pull.head?.ref !== "string" || typeof pull.draft !== "boolean" || pull.state !== "open"
    || typeof pull.user?.login !== "string" || !Number.isSafeInteger(pull.user?.id) || typeof pull.user?.type !== "string") throw new Error("invalid or closed full-regression PR identity");
  return { pr: pull.number, head: pull.head.sha, base: pull.base.sha, branch: pull.head.ref, draft: pull.draft,
    repository: pull.base.repo?.full_name, author: { login: pull.user.login, id: pull.user.id, type: pull.user.type },
    bodyDigest: digest(pull.body ?? "") };
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

function exactKeys(value, keys, label) {
  if (!value || typeof value !== "object" || Array.isArray(value) || JSON.stringify(Object.keys(value).sort()) !== JSON.stringify([...keys].sort())) throw new Error(`invalid ${label}`);
}

/** Validate the generated marker before deciding whether its source and author qualify. */
export function parseRepairProvenance(value) {
  exactKeys(value, ["schema", "candidate", "sources"], "regression-triage provenance");
  if (value.schema !== PROVENANCE_SCHEMA) throw new Error("invalid regression-triage provenance schema");
  exactKeys(value.candidate, ["branch", "change"], "regression-triage candidate");
  if (!/^fix\/nightly-regression-[\w.-]+$/u.test(value.candidate.branch) || !/^fix-nightly-regression-[\w.-]+$/u.test(value.candidate.change)) throw new Error("invalid regression-triage candidate identity");
  if (!Array.isArray(value.sources) || value.sources.length < 1 || value.sources.length > 32) throw new Error("invalid regression-triage sources");
  const sources = value.sources.map(source => {
    exactKeys(source, ["workflowName", "workflowFile", "runId", "runNumber", "attempt", "event", "conclusion", "headBranch", "headSha", "url", "createdAt"], "regression-triage source");
    if (!["Full regression", "Release"].includes(source.workflowName) || !["full-regression.yml", "release.yml"].includes(source.workflowFile)
      || (source.workflowName === "Full regression") !== (source.workflowFile === "full-regression.yml")
      || !Number.isSafeInteger(source.runId) || source.runId < 1 || !Number.isSafeInteger(source.runNumber) || source.runNumber < 1
      || !Number.isSafeInteger(source.attempt) || source.attempt < 1 || !["schedule", "workflow_dispatch"].includes(source.event)
      || !["failure", "success"].includes(source.conclusion) || source.headBranch !== "develop" || !SHA.test(source.headSha)
      || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/actions\/runs\/\d+$/u.test(source.url)
      || Number.isNaN(Date.parse(source.createdAt))) throw new Error("invalid regression-triage source identity");
    return { ...source };
  });
  return { schema: value.schema, candidate: { ...value.candidate }, sources };
}

function generatedFailedRegressionRepair(pull, identity, provenance) {
  const link = parseImplementation(pull.body ?? "");
  if (!link && (pull.body ?? "").includes("openspec-implementation")) throw new Error("ambiguous implementation association");
  if (provenance === null) return false;
  const parsed = parseRepairProvenance(provenance);
  const app = identity.author.login === TRIAGE_APP.login && identity.author.id === TRIAGE_APP.id && identity.author.type === TRIAGE_APP.type;
  const candidate = parsed.candidate.branch === identity.branch && parsed.candidate.change === link?.change;
  const failedFull = parsed.sources.some(source => source.workflowName === "Full regression" && source.workflowFile === "full-regression.yml" && source.conclusion === "failure");
  return app && candidate && failedFull;
}

/** Keep ordinary cadence except for a trusted CI-created repair of a failed Full regression. */
export function selectFullRegression({ pull, paths, versionOnly = false, mergeBase, provenance = null }) {
  const identity = pullIdentity(pull);
  if (!SHA.test(mergeBase ?? "") || !Array.isArray(paths) || paths.length === 0 || paths.length > 8192
    || paths.some(path => typeof path !== "string" || !path || path.length > 1024 || /[\x00-\x1f\\]/u.test(path)
      || path.startsWith("/") || path.split("/").some(part => part === ".." || part === "." || !part))) throw new Error("incomplete full-regression comparison");
  const repair = generatedFailedRegressionRepair(pull, identity, provenance);
  const docsOnly = paths.every(DOCUMENT);
  const planning = identity.draft && docsOnly;
  const selected = repair && !planning;
  const value = { schema: "a1-pr-full-regression-selection-v2", ...identity, mergeBase, selected,
    reasons: selected ? ["generated-failed-full-regression-repair"] : [planning ? "planning-only-draft" : docsOnly ? "docs-only" : versionOnly ? "version-only" : "ordinary-cadence"],
    comparisonDigest: digest({ paths, versionOnly, provenance }) };
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

function repairProvenance(repo, head, paths) {
  const existing = [];
  for (const path of [...new Set(paths.filter(path => PROVENANCE_PATH.test(path)))]) {
    try { existing.push({ path, value: JSON.parse(git(repo, ["show", `${head}:${path}`])) }); }
    catch (error) {
      if (!/exists on disk|does not exist|path .* exists|unknown revision|bad object|invalid object/i.test(String(error?.stderr ?? error?.message ?? ""))) throw error;
    }
  }
  if (existing.length > 1) throw new Error("ambiguous regression-triage provenance");
  return existing[0]?.value ?? null;
}

/** Verify that at least one marker source is the actual failed Full regression run GitHub recorded. */
export async function verifyFailedRegressionSource(repository, provenance, token, request = fetch) {
  if (!/^[\w.-]+\/[\w.-]+$/u.test(repository ?? "")) throw new Error("invalid GitHub repository identity");
  const parsed = parseRepairProvenance(provenance);
  const candidates = parsed.sources.filter(source => source.workflowName === "Full regression" && source.workflowFile === "full-regression.yml" && source.conclusion === "failure");
  if (!candidates.length) throw new Error("generated repair has no failed Full regression source");
  for (const source of candidates) {
    const response = await request(`https://api.github.com/repos/${repository}/actions/runs/${source.runId}`, {
      headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" }, signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`full-regression source unavailable (${response.status})`);
    const declared = Number(response.headers.get("content-length") ?? 0);
    if (Number.isFinite(declared) && declared > 1024 * 1024) throw new Error("full-regression source exceeds its bound");
    const text = await response.text();
    if (Buffer.byteLength(text) > 1024 * 1024) throw new Error("full-regression source exceeds its bound");
    const run = JSON.parse(text);
    if (run.name === source.workflowName && run.path === `.github/workflows/${source.workflowFile}` && run.id === source.runId && run.run_number === source.runNumber
      && run.run_attempt === source.attempt && run.event === source.event && run.status === "completed" && run.conclusion === source.conclusion
      && run.head_branch === source.headBranch && run.head_sha === source.headSha && run.html_url === source.url && run.created_at === source.createdAt) return source;
  }
  throw new Error("generated failed Full regression provenance does not match GitHub");
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

function repositorySelectionInputs(repo, pull) {
  const identity = pullIdentity(pull);
  const mergeBase = git(repo, ["merge-base", identity.base, identity.head]).trim();
  if (!SHA.test(mergeBase)) throw new Error("invalid comparison merge base");
  const paths = changedPaths(git(repo, ["diff", "--name-status", "-z", "--find-renames", mergeBase, identity.head]));
  return { mergeBase, paths, provenance: repairProvenance(repo, identity.head, paths), versionOnly: versionOnlyComparison(repo, mergeBase, identity.head, paths) };
}

/** Full Git comparison preserves renamed provenance and avoids API file-list truncation. */
export function selectFromRepository(repo, pull) {
  return selectFullRegression({ pull, ...repositorySelectionInputs(repo, pull) });
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const expected = pullIdentity(event.pull_request);
  const pull = await readCurrentPull(process.env.GITHUB_REPOSITORY, expected.pr, process.env.GITHUB_TOKEN);
  if (digest(expected) !== digest(pullIdentity(pull))) throw new Error("PR changed since this event; await its current run");
  const inputs = repositorySelectionInputs(process.cwd(), pull);
  const current = selectFullRegression({ pull, ...inputs });
  if (current.selected) await verifyFailedRegressionSource(process.env.GITHUB_REPOSITORY, inputs.provenance, process.env.GITHUB_TOKEN);
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
