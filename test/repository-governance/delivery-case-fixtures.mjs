import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createRequire, syncBuiltinESMExports } from "node:module";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, realpath, rm, writeFile, access, readdir, lstat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";
import { discoverRepository, gitRunner } from "../../scripts/governance/local-cleanup-git.mjs";
import { createStateStore } from "../../scripts/governance/local-cleanup-state.mjs";
import { cleanupPreflight } from "../../scripts/governance/local-cleanup-preflight.mjs";
import { archiveReaderFromGet } from "../../scripts/governance/openspec-archive-github.mjs";
import { conditionalAcceptanceBytes, deliveryContentDigest } from "../../scripts/governance/openspec-delivery-policy.mjs";

// Security: these dedicated fixture workers must never inherit a caller's Git repository/index binding.
for (const key of Object.keys(process.env)) if (key.startsWith("GIT_")) delete process.env[key];
const execute = promisify(execFile);
export const repository = "timurproko/a1";
export const toolRoot = fileURLToPath(new URL("../../", import.meta.url));
export const exists = path => access(path).then(() => true, () => false);
export const hash = bytes => createHash("sha256").update(bytes).digest("hex");
export async function temporary(t) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-portable-delivery-")));
  t.after(() => rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  return root;
}
export function implementationBody({ count = 1, checked = false, scenarios = ["The delivered behavior preserves the approved contract in the supported environment."], metadata = { version: 3, change: "example" } } = {}) {
  return `## Proposal\n\nDeliver the approved behavior and its focused verification.\n\n## Implementation\n\n${Array.from({ length: count }, (_, i) => `- [${checked ? "x" : " "}] Preserve outcome ${i + 1} with testing, coverage and [supported notation](https://example.invalid/guide).`).join("\n")}\n\n## Acceptance\n\n${scenarios.map(value => `- ${value}`).join("\n")}\n\n## Automation\n\n<details>\n<summary>Delivery linkage</summary>\n\n\`\`\`openspec-implementation\n${JSON.stringify(metadata)}\n\`\`\`\n\n</details>\n`;
}
export function planningFixture() {
  const calls = [], state = { head: null, files: [], pr: null, lostResponse: false };
  const base = "1".repeat(40), head = "2".repeat(40);
  const effect = (name, fn) => async (...args) => { calls.push({ name, args }); return fn(...args); };
  const remote = {
    baseHead: effect("read-base", () => base), head: effect("read-head", () => state.head),
    matches: effect("read-files", (_repo, sha, files) => sha === state.head && JSON.stringify(files) === JSON.stringify(state.files)),
    createRef: effect("create-ref", (_repo, _branch, sha) => { assert.equal(state.head, null); state.head = sha; }),
    commit: effect("commit", (_repo, _branch, observed, files) => { assert.equal(observed, state.head); state.head = head; state.files = files; return head; }),
    findPr: effect("find-pr", () => state.pr),
    createPr: effect("create-pr", (_repo, _base, _branch, _title, body) => {
      state.pr = { number: 42, draft: true, body }; if (state.lostResponse) throw new Error("response lost"); return state.pr;
    }),
  };
  const input = { repository, base: "develop", baseHead: base, branch: "chore/example", expectedHead: null, change: "example", title: "docs: plan example",
    body: implementationBody(), files: [{ path: "openspec/changes/example/proposal.md", contents: "# Approved proposal\n" }] };
  return { calls, state, remote, input, base, head };
}
export async function gitFixture(t, { declaration = true } = {}) {
  const root = await temporary(t), primary = join(root, "primary"), remote = join(root, "remote.git");
  const git = async (cwd, args) => (await execute("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Fixture", "-c", "user.email=fixture@example.com", "-C", cwd, ...args], { encoding: "utf8" })).stdout.trim();
  await execute("git", ["init", "-b", "develop", primary]); await git(primary, ["config", "core.autocrlf", "false"]);
  await writeFile(join(primary, "README.md"), "published content\n");
  await writeFile(join(primary, ".gitignore"), ".worktrees/\n.artifacts/\nnode_modules/\n.private/\nunknown.log\n");
  if (declaration) {
    await mkdir(join(primary, ".a1"));
    const preflight = "console.log(JSON.stringify({operation:'remove-local',preflight:true,results:[{path:process.argv[1],disposition:'eligible'}]}))";
    const script = fileURLToPath(new URL("../../scripts/governance/local-worktree-cleanup.mjs", import.meta.url));
    await writeFile(join(primary, ".a1/worktree.json"), JSON.stringify({ localRemoval: { preflight: ["node", "-e", preflight, "{worktree}"],
      execute: ["node", script, "remove-local", "--repo", "{primary}", "--path", "{worktree}", "--confirm-local-removal"] } }));
  }
  await git(primary, ["add", "."]); await git(primary, ["commit", "-m", "base"]);
  await execute("git", ["clone", "--bare", primary, remote]);
  await git(primary, ["remote", "add", "origin", `https://github.com/${repository}.git`]);
  await git(primary, ["config", `url.${remote.replaceAll("\\", "/")}.insteadOf`, `https://github.com/${repository}.git`]);
  const path = join(primary, ".worktrees", "task").replaceAll("\\", "/");
  await git(primary, ["worktree", "add", "-b", "fix/task", path]); await git(path, ["push", "origin", "fix/task"]);
  const identity = await discoverRepository(primary), store = createStateStore(identity), calls = [], actual = gitRunner();
  const observedGit = async (cwd, args, options) => { calls.push(args); return actual(cwd, args, options); };
  const preflight = (identity, entry, options) => cleanupPreflight(identity, entry, { ...options, inspectProcesses: async () => [] });
  const options = { identity, store, path, cwd: primary, confirmed: true, git: observedGit, preflight, deadline: Date.now() + 120_000 };
  const runtime = async () => {
    const context = await import("../../src/foundation/lifecycle/session-repository-context.ts");
    const dataDir = join(root, "data"), inspectProcess = async pid => ({ pid, startIdentity: `fixture:${pid}` });
    const create = async (id, pid) => {
      const session = { sessionId: id, sessionFile: join(root, `${id}.jsonl`) };
      await writeFile(session.sessionFile, `${JSON.stringify({ type: "session", id, cwd: primary })}\n`);
      const opts = { dataDir, runtimeId: `runtime-${id}`, inspectProcess };
      await context.registerSessionRepositoryRuntime(session, opts.runtimeId, { pid, startIdentity: `fixture:${pid}` }, opts);
      return { session, opts };
    };
    return { context, self: await create("one", 1001), other: await create("two", 1002) };
  };
  return { root, primary, remote, path, identity, store, git, calls, options, runtime };
}

/** Observe real process requests; never execute a newly introduced destructive process command in these fixtures. */
export async function observeProcesses(operation) {
  const child = createRequire(import.meta.url)("node:child_process"), original = child.execFile, kill = process.kill, calls = [], terminations = [];
  child.execFile = function(command, args, ...rest) {
    calls.push({ command, args });
    if (/^(?:taskkill|kill|killall|pkill)(?:\.exe)?$/i.test(command)) { terminations.push(command); throw new Error("fixture process termination forbidden"); }
    return original.call(this, command, args, ...rest);
  };
  child.execFile[promisify.custom] = (...args) => new Promise((resolve, reject) => child.execFile(...args, (error, stdout, stderr) => {
    if (error) reject(Object.assign(error, { stdout, stderr })); else resolve({ stdout, stderr });
  }));
  process.kill = function(pid, signal) { if (signal !== 0) { terminations.push({ pid, signal }); throw new Error("fixture process termination forbidden"); } return kill.call(process, pid, signal); };
  syncBuiltinESMExports();
  try { return { value: await operation(), calls, terminations }; }
  finally { child.execFile = original; process.kill = kill; syncBuiltinESMExports(); }
}
export async function observeFileWrites(operation) {
  const fs = createRequire(import.meta.url)("node:fs/promises"), original = new Map(), writes = [];
  for (const name of ["writeFile", "appendFile", "copyFile", "cp", "rename"]) {
    original.set(name, fs[name]); fs[name] = (...args) => { writes.push({ name, args }); return original.get(name)(...args); };
  }
  syncBuiltinESMExports();
  try { return { value: await operation(), writes }; }
  finally { for (const [name, fn] of original) fs[name] = fn; syncBuiltinESMExports(); }
}
export async function contentSnapshot(root) {
  const entries = [];
  const walk = async (path, prefix) => {
    for (const item of await readdir(path, { withFileTypes: true })) {
      if (item.name === ".git" && prefix === "") continue;
      const name = `${prefix}${item.name}`, child = join(path, item.name), metadata = await lstat(child);
      if (metadata.isSymbolicLink()) entries.push([name, "link"]);
      else if (item.isDirectory()) await walk(child, `${name}/`);
      else entries.push([name, hash(await readFile(child))]);
    }
  };
  await walk(root, ""); return JSON.stringify(entries.sort());
}

/** Real finalized archive/manifest/tree validation over a strict mocked GitHub transport. */
export async function finalizedRemote() {
  const base = "a".repeat(40), head = "b".repeat(40), archive = "openspec/changes/archive/2026-09-15-example/";
  const scenarios = ["The implemented behavior and synchronized specification survive this exact maintainer integration."];
  const archiveFiles = {
    [`${archive}.openspec.yaml`]: "schema: spec-driven\ncreated: 2026-09-15\n",
    [`${archive}proposal.md`]: "# Proposal\n\nDeliver the approved behavior.\n", [`${archive}design.md`]: "# Design\n\nPreserve the supported behavior.\n",
    [`${archive}tasks.md`]: "## 1. Implementation\n\n- [x] 1.1 Implement and verify the approved behavior.\n",
    [`${archive}specs/example/spec.md`]: "## ADDED Requirements\n\n### Requirement: Example\nThe system SHALL preserve the approved behavior.\n\n#### Scenario: Supported use\n- **WHEN** used\n- **THEN** behavior SHALL remain supported\n",
    [`${archive}implementation-evidence.md`]: "# Evidence\n\nThe isolated fixture contains the implemented behavior.\n",
  };
  const spec = "# example Specification\n\n## Purpose\n\nPreserve approved behavior for supported use through exact finalized integration.\n\n## Requirements\n\n### Requirement: Example\nThe system SHALL preserve the approved behavior.\n\n#### Scenario: Supported use\n- **WHEN** used\n- **THEN** behavior SHALL remain supported\n";
  const manifest = { version: 3, repository, change: "example", sourcePr: 42, archive, acceptanceManifest: `${archive}acceptance.md`, finalizedDate: "2026-09-15", specBaseSha: base,
    acceptanceScenarios: scenarios, archiveDigest: deliveryContentDigest(Object.entries(archiveFiles)), specDigest: deliveryContentDigest([["openspec/specs/example/spec.md", spec]]),
    tasksDigest: hash(archiveFiles[`${archive}tasks.md`]), evidenceDigest: deliveryContentDigest([[`${archive}implementation-evidence.md`, archiveFiles[`${archive}implementation-evidence.md`]]]), knownGaps: [] };
  const metadata = { version: 3, change: "example", archive, acceptanceManifest: `${archive}acceptance.md`, finalizedHead: head };
  const files = { "openspec/config.yaml": "schema: spec-driven\n", "openspec/specs/example/spec.md": spec, ...archiveFiles, [`${archive}acceptance.md`]: conditionalAcceptanceBytes(manifest) };
  const changed = [...Object.keys(archiveFiles), `${archive}acceptance.md`, "openspec/specs/example/spec.md", "src/example.ts"].map(filename => ({ filename, status: "added" }));
  const pull = { number: 42, node_id: "PR_fixture_42", state: "open", merged: false, draft: false, labels: [], changed_files: changed.length,
    body: implementationBody({ checked: true, scenarios, metadata }), auto_merge: null, mergeable: true, mergeable_state: "clean",
    base: { ref: "develop", sha: base, repo: { full_name: repository } }, head: { ref: "feature/example", sha: head, repo: { full_name: repository } } };
  const calls = [], merges = [], comments = [], events = [], blobs = new Map();
  const state = { target: base, behind: false, pending: false, principal: { id: 101, login: "maintainer", type: "User" }, permission: "write", onPull: null, pullReads: 0, proofJobs: [], mergedSha: null };
  const tree = () => ({ truncated: false, tree: Object.entries(files).map(([path, text]) => {
    const bytes = Buffer.from(text), sha = createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex"); blobs.set(sha, bytes); return { path, sha, type: "blob", mode: "100644" };
  }) });
  const get = async path => {
    calls.push(path);
    const prefix = `/repos/${repository}`;
    if (path === `${prefix}/pulls/42`) { state.pullReads++; if (state.onPull) await state.onPull(); return structuredClone(pull); }
    if (path.startsWith(`${prefix}/pulls/42/files?`)) return changed;
    if (path === `${prefix}/git/ref/heads/develop`) return { object: { sha: state.target } };
    if (path === `${prefix}/git/trees/${head}?recursive=1` || state.mergedSha && path === `${prefix}/git/trees/${state.mergedSha}?recursive=1`) return tree();
    const blob = blobs.get(path.split("/").at(-1)); if (blob) return { encoding: "base64", size: blob.length, content: blob.toString("base64") };
    if (path.startsWith(`${prefix}/compare/`)) {
      const [left, right] = path.slice(path.lastIndexOf("/") + 1).split("...");
      return { status: state.behind ? "behind" : left === right ? "identical" : "ahead", behind_by: state.behind ? 1 : 0, merge_base_commit: { sha: state.behind ? head : left } };
    }
    if (path.includes("/collaborators/")) return { permission: state.permission };
    if (path.startsWith(`${prefix}/issues/42/timeline?`)) return events;
    if (path.startsWith(`${prefix}/issues/42/comments?`)) return comments;
    if (path.startsWith(`${prefix}/actions/runs/123/jobs?`)) return { total_count: state.proofJobs.length, jobs: state.proofJobs };
    if (path === `${prefix}/actions/runs/123`) return { repository: { full_name: repository }, path: ".github/workflows/documentation-auto-merge.yml", event: "pull_request_target", head_sha: base, actor: { login: "maintainer" }, status: "completed", conclusion: "success" };
    if (path === `${prefix}/contents/docs/delivery-contract.json?ref=${base}`) return { type: "file", encoding: "base64", content: (await readFile(new URL("../../docs/delivery-contract.json", import.meta.url))).toString("base64") };
    if (path.startsWith(`${prefix}/actions/workflows/ci.yml/runs?`)) return { total_count: 1, workflow_runs: [{ id: 99, run_number: 10, run_attempt: 1, head_sha: head, head_branch: pull.head.ref,
      event: "pull_request", path: ".github/workflows/ci.yml", status: state.pending ? "in_progress" : "completed", conclusion: state.pending ? null : "success", head_repository: { full_name: repository },
      pull_requests: [{ number: 42, head: { sha: head }, base: { sha: base } }] }] };
    if (path.startsWith(`${prefix}/actions/runs/99/jobs?`)) return { total_count: 1, jobs: [{ name: "Development validation required", status: "completed", conclusion: "success", head_sha: head }] };
    throw new Error(`unexpected fixture route ${path}`);
  };
  const reader = archiveReaderFromGet(repository, get);
  const request = { reader, principal: async () => structuredClone(state.principal), environment: {}, merge: async (number, body) => { merges.push({ number, body }); return { merged: true, sha: "d".repeat(40) }; } };
  return { reader, pull, state, calls, merges, comments, events, files, metadata, head, base, archive, request };
}
