import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { afterEach, test } from "node:test";
import { captureWorktree, gitRunner } from "../../scripts/governance/local-cleanup-git.mjs";
import { inspectPublication, inspectDeliveryHandoff } from "../../scripts/governance/delivery-publication.mjs";

const execute = promisify(execFile), roots = [];
const cases = JSON.parse(await readFile(new URL("../../docs/delivery-cases.json", import.meta.url), "utf8")).cases;
const expected = id => cases.find(item => item.id === id).expect;
afterEach(async () => { for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true, maxRetries: 5 }); });
async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "a1-publication-"))); roots.push(root);
  const primary = join(root, "primary"), remote = join(root, "remote.git");
  const git = async (cwd, args) => (await execute("git", ["-c", "core.hooksPath=/dev/null", "-c", "user.name=Test", "-c", "user.email=test@example.com", "-C", cwd, ...args], { encoding: "utf8" })).stdout.trim();
  await execute("git", ["init", "-b", "develop", primary]);
  await writeFile(join(primary, "README.md"), "base\n");
  await git(primary, ["add", "."]); await git(primary, ["commit", "-m", "base"]);
  await execute("git", ["clone", "--bare", primary, remote]);
  await git(primary, ["remote", "add", "origin", remote]);
  const path = join(primary, ".worktrees", "task").replaceAll("\\", "/");
  await git(primary, ["worktree", "add", "-b", "fix/task", path]);
  await writeFile(join(path, "feature.md"), "published\n");
  await git(path, ["add", "."]); await git(path, ["commit", "-m", "feature"]); await git(path, ["push", "origin", "fix/task"]);
  const identity = { primary: primary.replaceAll("\\", "/"), common: (await realpath(join(primary, ".git"))).replaceAll("\\", "/"),
    root: join(primary, ".worktrees").replaceAll("\\", "/"), repository: "timurproko/a1", remote: "origin" };
  return { root, primary, remote, path, identity, git };
}

test("C32: clean detached/released state does not conceal an unpublished commit", async () => {
  const f = await fixture();
  await writeFile(join(f.path, "unpublished.md"), "unpublished\n");
  await f.git(f.path, ["add", "."]); await f.git(f.path, ["commit", "-m", "not pushed"]);
  const report = await inspectDeliveryHandoff({ identity: f.identity, path: f.path, change: "example", pr: 123 });
  assert.deepEqual({ publicationVerified: report.publicationVerified, unpublishedWorkReported: report.unpublishedWork,
    remotelyAvailableClaimed: report.publicationVerified }, expected("C32"));
  assert.equal(report.localHead, await f.git(f.path, ["rev-parse", "HEAD"]));
  assert.notEqual(report.localHead, report.remoteHead);
});

test("C35: a fresh safe remote descendant proves publication without equal tips or remote writes", async () => {
  const f = await fixture(), receiver = join(f.root, "receiver");
  const entry = await captureWorktree(f.identity, f.path);
  await execute("git", ["clone", "--branch", "fix/task", f.remote, receiver]);
  await writeFile(join(receiver, "follow-up.md"), "from another machine\n");
  await f.git(receiver, ["add", "."]); await f.git(receiver, ["commit", "-m", "follow-up"]); await f.git(receiver, ["push", "origin", "fix/task"]);
  const calls = [], actual = gitRunner();
  const result = await inspectPublication(f.identity, entry, { git: async (cwd, args) => { calls.push(args); return actual(cwd, args); } });
  assert.deepEqual({ publicationVerified: result.publicationVerified, identicalTipsRequired: result.relation === "equal" }, expected("C35"));
  assert.equal(result.relation, "remote-descendant"); assert.notEqual(result.remoteHead, entry.head);
  assert.equal(await f.git(f.path, ["rev-parse", "HEAD"]), entry.head);
  assert.ok(!calls.some(args => ["push", "update-ref"].includes(args[0])));
});

test("handoff reports dirty content separately from remote-contained commits", async () => {
  const f = await fixture();
  await writeFile(join(f.path, "feature.md"), "local edits\n");
  const report = await inspectDeliveryHandoff({ identity: f.identity, path: f.path, change: "example", pr: 123, unfinished: ["next outcome"] });
  assert.equal(report.publicationVerified, false); assert.equal(report.reason, "handoff-local-edits");
  assert.deepEqual(report.unfinished, ["next outcome"]); assert.deepEqual(report.checks, []);
  assert.equal(report.localHead, report.remoteHead);
});

test("publication evidence failures do not substitute tracking refs or status", async () => {
  const f = await fixture(), entry = await captureWorktree(f.identity, f.path), actual = gitRunner();
  const report = await inspectPublication(f.identity, entry, { git: async (cwd, args) => {
    if (args[0] === "ls-remote") throw new Error("offline"); return actual(cwd, args);
  } });
  assert.equal(report.publicationVerified, false); assert.equal(report.reason, "publication-evidence-unavailable");
});

test("C33: remote-only handoff inspects PR/ref identity without inventing local paths or cleanup enrollment", async () => {
  const head = "a".repeat(40), calls = [];
  const readRemotePlanning = async (...args) => {
    calls.push(args);
    return { pr: { head: { repo: { full_name: "timurproko/a1" }, ref: "chore/example", sha: head },
      base: { repo: { full_name: "timurproko/a1" }, ref: "develop" }, state: "open",
      body: '```openspec-implementation\n{"version":3,"change":"example"}\n```' }, refHead: head };
  };
  const report = await inspectDeliveryHandoff({ identity: { repository: "timurproko/a1" }, branch: "chore/example", change: "example", pr: 123,
    readRemotePlanning, git: async () => { throw new Error("remote-only handoff must not invoke Git"); } });
  assert.deepEqual({ localRegistrationRequired: calls.some(call => call[0] === "register"), inventedLocalPath: "path" in report,
    branchAndPrReported: report.branch === "chore/example" && report.pr === 123 }, expected("C33"));
  assert.equal(report.publicationVerified, true); assert.equal(report.localHead, null); assert.equal(report.remoteHead, head);
});
