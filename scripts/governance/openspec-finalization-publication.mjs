import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readdir, realpath, rm, rename, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { prepareSinglePrDelivery, replaceImplementationMetadata } from "./openspec-delivery-finalization.mjs";
import { readCanonicalSpecs } from "./openspec-delivery-git.mjs";
import { archiveFailure, archivePaths, assertArchiveDiff, parseImplementation, SHA } from "./openspec-archive-policy.mjs";

const execute = promisify(execFile);
const ARCHIVE_ROOT = "openspec/changes/archive/";
const MAX_OUTPUT = 8 * 1024 * 1024;

function utcDate(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/** Decide whether the workflow has anything to do for this pull request before touching Git. */
export function classifyFinalizationCandidate(pull, repository) {
  if (!pull || pull.state !== "open") return { skip: "closed" };
  if (pull.draft !== false) return { skip: "draft" };
  let implementation = null;
  try { implementation = parseImplementation(pull.body ?? ""); } catch { return { skip: "malformed-metadata" }; }
  if (!implementation) return { skip: "unassociated" };
  if (implementation.version !== 3) return { skip: `legacy-version-${implementation.version}` };
  if (pull.base?.ref !== "develop" || pull.base.repo?.full_name !== repository || pull.head?.repo?.full_name !== repository
    || !SHA.test(pull.head.sha ?? "") || typeof pull.head.ref !== "string" || !/^[A-Za-z0-9._\/-]{1,200}$/.test(pull.head.ref)
    || pull.head.ref.split("/").some(part => !part || part.startsWith(".") || part.endsWith(".lock") || part === "..")) {
    throw archiveFailure("finalization-candidate-identity");
  }
  return { implementation };
}

function scratchEnvironment(root, token) {
  const env = { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, HOME: join(root, "home"), USERPROFILE: join(root, "home"),
    GIT_CONFIG_GLOBAL: join(root, "empty-config"), GIT_CONFIG_NOSYSTEM: "1", GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: token ? "2" : "1", GIT_CONFIG_KEY_0: "core.hooksPath", GIT_CONFIG_VALUE_0: join(root, "empty-hooks") };
  if (token) {
    env.GIT_CONFIG_KEY_1 = "http.https://github.com/.extraheader";
    env.GIT_CONFIG_VALUE_1 = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;
  }
  return env;
}

/** Locate the one dated archive directory of the change in a checkout, or null when the change is still active. */
async function archivedForm(checkout, change) {
  const names = await readdir(join(checkout, ARCHIVE_ROOT)).catch(() => []);
  const matches = names.filter(name => new RegExp(`^\\d{4}-\\d{2}-\\d{2}-${change.replaceAll("-", "\\-")}$`).test(name));
  if (matches.length > 1) throw archiveFailure("finalization-archive-ambiguous");
  return matches.length ? `${ARCHIVE_ROOT}${matches[0]}/` : null;
}

async function archiveCapabilities(checkout, archive) {
  const found = [];
  async function walk(rel) {
    for (const entry of await readdir(join(checkout, archive, "specs", rel), { withFileTypes: true }).catch(() => [])) {
      const path = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(path);
      else if (entry.name === "spec.md" && rel) found.push(rel);
    }
  }
  await walk("");
  return found.sort();
}

/**
 * Reconcile one ready version-3 pull request to its finalized form: finalize an active head, re-finalize a drifted
 * one, or merge `develop` first when the head is behind, then push the result with a lease and update the body fence.
 */
export async function reconcileFinalization({ reader, publisher, number, toolRoot, gitImpl = execute, remoteUrl = null,
  date = utcDate(), deadline = Infinity }) {
  if (!Number.isSafeInteger(number) || number < 1) throw archiveFailure("implementation-pr");
  if (!publisher || publisher.repository !== reader.repository || !publisher.actor?.endsWith("[bot]")) throw archiveFailure("publication-app-setup");
  const prefix = reader.prefix;
  const pull = await reader.get(`${prefix}/pulls/${number}`);
  if (pull.number !== number) throw archiveFailure("implementation-pr");
  const classified = classifyFinalizationCandidate(pull, reader.repository);
  if (classified.skip) return { disposition: "skipped", reason: classified.skip, head: pull.head?.sha ?? null };
  const { implementation } = classified;
  const change = implementation.change;
  const target = (await reader.get(`${prefix}/git/ref/heads/develop`)).object?.sha;
  if (!SHA.test(target ?? "")) throw archiveFailure("target-identity");
  const head = pull.head.sha;
  const branch = pull.head.ref;

  const root = await realpath(await mkdtemp(join(tmpdir(), "openspec-finalization-")));
  const checkout = join(root, "checkout");
  await mkdir(checkout);
  const env = scratchEnvironment(root, publisher.token);
  const identity = ["-c", `user.name=${publisher.actor}`, "-c", `user.email=${publisher.actorEmail ?? `${publisher.actor}@users.noreply.github.com`}`];
  async function git(args, { allowFailure = false } = {}) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) throw archiveFailure("archive-deadline");
    try { return (await gitImpl("git", args, { cwd: checkout, env, timeout: Math.min(120_000, remaining), maxBuffer: MAX_OUTPUT })).stdout.trim(); }
    catch (error) {
      if (allowFailure) return null;
      throw archiveFailure("finalization-git", args[0]);
    }
  }
  const commits = [];
  try {
    await git(["init", "--quiet"]);
    await git(["remote", "add", "origin", remoteUrl ?? `https://github.com/${reader.repository}.git`]);
    await git(["sparse-checkout", "set", "--cone", "openspec"]);
    await git(["fetch", "--quiet", "--filter=blob:none", "origin", `+refs/heads/develop:refs/remotes/origin/develop`, `+refs/heads/${branch}:refs/remotes/origin/candidate`]);
    if (await git(["rev-parse", "refs/remotes/origin/develop"]) !== target) throw archiveFailure("target-advanced");
    if (await git(["rev-parse", "refs/remotes/origin/candidate"]) !== head) throw archiveFailure("finalization-head-changed");
    await git(["checkout", "--quiet", "--detach", head]);

    const behind = (await git(["merge-base", "--is-ancestor", target, head], { allowFailure: true })) === null;
    let archive = await archivedForm(checkout, change);
    const active = `openspec/changes/${change}/`;
    const activePresent = (await readdir(join(checkout, active)).catch(() => null)) !== null;
    if (archive && activePresent) throw archiveFailure("finalization-archive-ambiguous");
    let effectiveDate = archive ? archive.slice(ARCHIVE_ROOT.length, ARCHIVE_ROOT.length + 10) : date;
    let body = pull.body ?? "";
    // The tree, not the fence, says whether the head is finalized: a body edit may lag a finalization push.
    body = replaceImplementationMetadata(body, archive
      ? { version: 3, change, archive, acceptanceManifest: `${archive}acceptance.md` } : { version: 3, change });
    const capabilities = archive ? await archiveCapabilities(checkout, archive) : [];
    const scope = archivePaths(change, effectiveDate, capabilities);

    if (behind) {
      const mergeBase = await git(["merge-base", target, head]);
      if (!SHA.test(mergeBase)) throw archiveFailure("finalization-merge-base");
      if (archive) {
        // Restore the active form against the merge-base so develop's spec bytes win the merge without conflict.
        const baseline = await readCanonicalSpecs({ cwd: checkout, sha: mergeBase, env, gitImpl });
        for (const path of scope.specs) {
          const bytes = baseline.get(path);
          if (bytes) { await mkdir(join(checkout, path, ".."), { recursive: true }); await writeFile(join(checkout, path), bytes); }
          else await rm(join(checkout, path), { force: true });
        }
        await rm(join(checkout, archive, "acceptance.md"), { force: true });
        await rename(join(checkout, archive), join(checkout, active));
        await git(["add", "-A", "--", "openspec"]);
        await git([...identity, "commit", "--quiet", "-m", `docs(openspec): restore ${change} for re-finalization`]);
        commits.push({ kind: "restore", sha: await git(["rev-parse", "HEAD"]) });
        body = replaceImplementationMetadata(body, { version: 3, change });
        archive = null;
      }
      const merged = await git([...identity, "merge", "--quiet", "--no-ff", "--no-edit", "-m", `Merge develop into ${branch} for finalization`, target], { allowFailure: true });
      if (merged === null) { await git(["merge", "--abort"], { allowFailure: true }); throw archiveFailure("finalization-merge-conflict"); }
      commits.push({ kind: "merge", sha: await git(["rev-parse", "HEAD"]) });
    }

    const targetSpecs = await readCanonicalSpecs({ cwd: checkout, sha: target, env, gitImpl });
    const result = await prepareSinglePrDelivery({ root: checkout, change, repository: reader.repository, sourcePr: number, body,
      specBaseSha: target, date: effectiveDate, targetSpecs, write: true, toolRoot });
    const refinalized = result.refinalized || commits.some(commit => commit.kind === "restore");
    if (result.disposition !== "already-finalized") {
      await git(["add", "-A", "--", "openspec"]);
      await git([...identity, "commit", "--quiet", "-m", `docs(openspec): ${refinalized ? "refinalize" : "finalize"} ${change}`]);
      commits.push({ kind: refinalized ? "refinalize" : "finalize", sha: await git(["rev-parse", "HEAD"]) });
    }
    const finalBody = result.body;
    if (!commits.length && finalBody === (pull.body ?? "")) {
      return { disposition: "already-finalized", head, pushedHead: head, commits: [], bodyUpdated: false };
    }

    // Security: every commit this run pushes is either a merge of the exact target or a change confined to the change's paths.
    const finalPaths = result.paths ?? scope;
    let previous = head;
    for (const commit of commits) {
      if (commit.kind === "merge") {
        const parents = (await git(["rev-list", "--parents", "-n", "1", commit.sha])).split(" ").slice(1);
        if (parents.length !== 2 || parents[0] !== previous || parents[1] !== target) throw archiveFailure("finalization-push-scope", "merge");
        const developChanges = new Set((await git(["diff", "--name-only", `${await git(["merge-base", target, previous])}`, target])).split("\n").filter(Boolean));
        const brought = (await git(["diff", "--name-only", previous, commit.sha])).split("\n").filter(Boolean);
        const foreign = brought.find(path => !developChanges.has(path));
        if (foreign) throw archiveFailure("finalization-push-scope", foreign);
      } else {
        const files = (await git(["diff", "--name-only", "--no-renames", "-z", previous, commit.sha])).split("\0").filter(Boolean);
        assertArchiveDiff(files.map(filename => ({ status: "modified", filename })), finalPaths);
      }
      previous = commit.sha;
    }

    let pushedHead = head;
    if (commits.length) {
      const pushed = await git(["push", "--quiet", `--force-with-lease=refs/heads/${branch}:${head}`, "origin", `HEAD:refs/heads/${branch}`], { allowFailure: true });
      if (pushed === null) return { disposition: "retry", reason: "head-changed-before-push", head, pushedHead: head, commits, bodyUpdated: false };
      pushedHead = commits.at(-1).sha;
    }
    let bodyUpdated = false;
    if (finalBody !== (pull.body ?? "")) {
      const current = await reader.get(`${prefix}/pulls/${number}`);
      if (current.body !== pull.body) return { disposition: "retry", reason: "body-changed-before-update", head, pushedHead, commits, bodyUpdated };
      await publisher.mutate(`${prefix}/pulls/${number}`, "PATCH", { body: finalBody });
      bodyUpdated = true;
    }
    return { disposition: commits.length ? refinalized ? "refinalized" : "finalized" : "body-updated",
      head, pushedHead, commits, bodyUpdated, archive: result.paths?.archive ?? result.implementation?.archive ?? null };
  } finally { await rm(root, { recursive: true, force: true }); }
}
