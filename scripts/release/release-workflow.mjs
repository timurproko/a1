import { mkdir, mkdtemp, lstat, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import { dispatchPublication, registryVersion, run } from "./publication-client.mjs";
import { parseReleaseArguments, resolveReleasePlan } from "./release-target.mjs";

const VERSION_FILES = ["package-lock.json", "package.json"];
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const PR_FIELDS = "number,url,state,headRefName,headRefOid,baseRefName,isCrossRepository,mergeCommit,autoMergeRequest";

/** Supplies live boundaries by default; tests replace GitHub, registry, publication and clock. */
export function createReleaseRuntime(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  return {
    git: (args, directory = cwd) => {
      for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) {
        if (process.env[name]) throw new Error(`${name} overrides are not supported during release preparation`);
      }
      return run("git", ["-C", directory, ...args], { maxBuffer: 8 * 1024 * 1024 });
    },
    gh: args => run("gh", args, { cwd }),
    registry: (name, version) => registryVersion(name, version, (url, init) => fetch(url, { ...init, signal: options.signal })),
    publish: (source, version) => dispatchPublication("stable", source, version),
    sleep: ms => sleep(ms, undefined, { signal: options.signal }),
    now: Date.now,
    pollMs: 20_000,
    waitMs: 30 * 60_000,
    log: message => process.stdout.write(`[release] ${message}\n`),
    error: message => process.stderr.write(`[release] ${message}\n`),
    ...options,
    cwd,
  };
}

/** Runs explicit version preparation, manual merge gates, publication, then development reopening. */
export async function runRelease(args, runtime) {
  parseReleaseArguments(args);
  const r = runtime;
  const root = resolve(r.cwd);
  const local = await readLocalVersions(root);
  const plan = resolveReleasePlan(local.manifest.version, args);
  assertVersions(local, plan.current);
  if (!Number.isFinite(r.waitMs) || r.waitMs <= 0 || !Number.isFinite(r.pollMs) || r.pollMs <= 0) {
    throw new Error("release wait and poll intervals must be positive");
  }
  r.log(`source ${plan.current}; stable target ${plan.version}; next development ${plan.opening}`);
  checkCanceled(r);
  if (r.git(["rev-parse", "--show-prefix"]) !== "" || r.git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "develop") {
    throw new Error("release runs from the repository root on develop");
  }
  if (!isClean(r, root)) throw new Error("commit or preserve local changes before releasing; checkout must be clean");
  const originalHead = r.git(["rev-parse", "HEAD"]);
  let source = fetchDevelop(r);
  if (source !== originalHead) throw new Error("develop is not at the origin tip; synchronize it safely before releasing");
  assertSameSnapshot(readVersionsAt(r, source), local, "caller manifest differs from authoritative develop");
  let published = false;
  let publicationAttempted = false;
  let phase = "stable-version preparation";
  try {
    await assertUnpublished(r, local.manifest.name, plan.version);
    if (plan.current !== plan.version) {
      source = await prepareVersion(r, source, local, plan.version, `chore(release): ${plan.version}`);
    } else verifyPreparedSource(r, source);
    phase = "stable publication";
    assertAuthoritative(r, source, plan.version, local.manifest.name);
    await assertUnpublished(r, local.manifest.name, plan.version);
    assertAuthoritative(r, source, plan.version, local.manifest.name);
    checkCanceled(r);
    r.log(`dispatching stable publication for ${source}`);
    publicationAttempted = true;
    await r.publish(source, plan.version);
    published = true;
    r.log(`${plan.version} is published; development reopening is not yet complete`);
    checkCanceled(r);
    phase = "development reopening";
    const openingBase = fetchDevelop(r);
    const stable = readVersionsAt(r, openingBase);
    assertVersions(stable, plan.version, local.manifest.name);
    const reopened = await prepareVersion(r, openingBase, stable, plan.opening, `chore(release): open ${plan.opening}`);
    assertAuthoritative(r, reopened, plan.opening, local.manifest.name);
    synchronizeCaller(r, originalHead, reopened);
    r.log(`${plan.version} is published and remote develop is open at ${plan.opening}; previews still require nightly or npm run develop`);
    return { ...plan, source, reopened };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const outcome = published
      ? `${plan.version} is published, but reopening ${plan.opening} is incomplete. Inspect the reopening PR; do not republish ${plan.version}.`
      : publicationAttempted
        ? `Publication of ${plan.version} failed or is uncertain. Inspect the workflow, npm and release records before retrying; no reopening was prepared.`
        : `Publication of ${plan.version} was not dispatched. Inspect the version PR and registry/tag state; never republish an existing stable version. If retrying an unpublished version from stable develop use the exact intended version, not patch.`;
    throw new Error(`${phase} stopped: ${detail}\n${outcome}`, { cause: error });
  }
}

function checkCanceled(r) { r.signal?.throwIfAborted(); }
function isClean(r, directory) { return r.git(["status", "--porcelain=v1", "--untracked-files=all"], directory) === ""; }
function fetchDevelop(r) {
  checkCanceled(r);
  r.git(["fetch", "origin", "develop"]);
  const source = r.git(["rev-parse", "origin/develop"]);
  if (!SHA.test(source)) throw new Error("origin/develop did not resolve to a commit");
  return source;
}

async function readLocalVersions(directory) {
  return {
    manifest: JSON.parse(await readFile(join(directory, "package.json"), "utf8")),
    lock: JSON.parse(await readFile(join(directory, "package-lock.json"), "utf8")),
  };
}
function readVersionsAt(r, source) {
  if (!SHA.test(source)) throw new Error("version source is not a commit");
  return {
    manifest: JSON.parse(r.git(["show", `${source}:package.json`])),
    lock: JSON.parse(r.git(["show", `${source}:package-lock.json`])),
  };
}
function assertVersions(snapshot, version, name = snapshot.manifest.name) {
  if (typeof name !== "string" || !name || snapshot.manifest.name !== name || snapshot.manifest.version !== version
    || snapshot.lock.version !== version || snapshot.lock.packages?.[""]?.version !== version) {
    throw new Error(`manifest and root lockfile must consistently declare ${name}@${version}`);
  }
}
function assertSameSnapshot(actual, expected, message) {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(message);
}
function withVersion(snapshot, version) {
  const { manifest, lock } = structuredClone(snapshot);
  manifest.version = version;
  lock.version = version;
  lock.packages[""].version = version;
  return { manifest, lock };
}
function verifyPreparedSource(r, source) {
  const pulls = JSON.parse(r.gh(["api", `repos/{owner}/{repo}/commits/${source}/pulls`]));
  const matches = Array.isArray(pulls) ? pulls.filter(pull => pull?.merged_at && pull.base?.ref === "develop"
    && pull.merge_commit_sha === source && Number.isSafeInteger(pull.number) && pull.number > 0) : [];
  if (matches.length !== 1) throw new Error(`stable source ${source} has no unique verified merged develop PR`);
  r.log(`verified previously prepared stable source ${source} from merged PR ${matches[0].number}`);
}
function assertAuthoritative(r, source, version, name) {
  if (fetchDevelop(r) !== source) throw new Error(`authoritative develop no longer matches selected source ${source}; refusing to substitute another commit`);
  assertVersions(readVersionsAt(r, source), version, name);
}
async function assertUnpublished(r, name, version) {
  checkCanceled(r);
  if (await r.registry(name, version) !== null) throw new Error(`${name}@${version} already exists on the registry`);
  checkCanceled(r);
  if (r.git(["ls-remote", "--tags", "origin", `refs/tags/v${version}`]) !== "") {
    throw new Error(`v${version} already exists; a release tag is never moved`);
  }
}

function assertPull(pull, branch, expectedHead) {
  if (!pull || !Number.isSafeInteger(pull.number) || pull.number < 1 || typeof pull.url !== "string"
    || !pull.url.startsWith("https://") || pull.baseRefName !== "develop" || pull.headRefName !== branch
    || pull.isCrossRepository !== false || pull.autoMergeRequest !== null || !SHA.test(pull.headRefOid)
    || (expectedHead !== undefined && pull.headRefOid !== expectedHead)
    || !["OPEN", "CLOSED", "MERGED"].includes(pull.state)) {
    throw new Error(`unexpected or changed release PR for ${branch}`);
  }
  return pull;
}
function readPull(r, number, branch, head) {
  return assertPull(JSON.parse(r.gh(["pr", "view", String(number), "--json", PR_FIELDS])), branch, head);
}

async function prepareVersion(r, base, snapshot, version, subject) {
  checkCanceled(r);
  assertAuthoritative(r, base, snapshot.manifest.version, snapshot.manifest.name);
  const branch = `chore/release-${version}`;
  const expected = withVersion(snapshot, version);
  const pulls = JSON.parse(r.gh(["pr", "list", "--state", "all", "--base", "develop", "--head", branch, "--json", PR_FIELDS]));
  if (!Array.isArray(pulls) || pulls.length > 1) throw new Error(`ambiguous release PRs for ${branch}`);
  let pull;
  let head;
  let directory;
  try {
    if (pulls.length === 1) {
      pull = assertPull(pulls[0], branch);
      r.log(`existing version PR: ${pull.url}`);
      if (pull.state !== "OPEN") throw new Error(`${pull.url} is ${pull.state}; refusing to recreate or overwrite ${branch}`);
      r.git(["fetch", "origin", `refs/heads/${branch}`]);
      head = r.git(["rev-parse", "FETCH_HEAD"]);
      assertPull(pull, branch, head);
      assertVersionCommit(r, base, head, expected);
    } else {
      if (r.git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]) !== "") {
        throw new Error(`${branch} already exists without a matching PR; inspect it rather than overwrite it`);
      }
      const parent = join(r.cwd, ".worktrees");
      checkCanceled(r);
      await mkdir(parent, { recursive: true });
      if ((await lstat(parent)).isSymbolicLink()) throw new Error("release worktree parent must not be a symlink");
      directory = await mkdtemp(join(parent, `release-${version}-`));
      r.log(`preparing ${version} in ${directory}; branch ${branch}`);
      checkCanceled(r);
      r.git(["worktree", "add", "--detach", directory, base]);
      assertSameSnapshot(await readLocalVersions(directory), snapshot, "phase worktree does not match its selected base");
      checkCanceled(r);
      await writeFile(join(directory, "package.json"), `${JSON.stringify(expected.manifest, null, 2)}\n`, "utf8");
      await writeFile(join(directory, "package-lock.json"), `${JSON.stringify(expected.lock, null, 2)}\n`, "utf8");
      checkCanceled(r);
      r.git(["add", "--", ...VERSION_FILES], directory);
      r.git(["commit", "-m", subject], directory);
      head = r.git(["rev-parse", "HEAD"], directory);
      assertVersionCommit(r, base, head, expected);
      checkCanceled(r);
      // Concurrency: the branch must still be absent. An empty lease prevents a racing
      // release from being replaced even when its commit happens to be an ancestor.
      r.git(["push", "origin", `--force-with-lease=refs/heads/${branch}:`, `HEAD:refs/heads/${branch}`], directory);
      checkCanceled(r);
      const url = r.gh(["pr", "create", "--base", "develop", "--head", branch, "--title", subject,
        "--body", `Release preparation for ${version}. Required CI and local maintainer acceptance must pass, then merge manually. This PR must not auto-merge.`]);
      r.log(`version PR: ${url}`);
      const number = /\/(\d+)\s*$/u.exec(url)?.[1];
      if (!number) throw new Error(`cannot read version PR number from ${url}`);
      pull = readPull(r, Number(number), branch, head);
    }
    r.log(`Manual action required: validate ${pull.url}, record local acceptance, then merge it manually. CI success alone will not advance this release.`);
    const merged = await waitForManualMerge(r, pull, branch, head);
    assertAuthoritative(r, merged, version, snapshot.manifest.name);
    if (directory) cleanupOwnedPhase(r, directory, pull.number, branch, head);
    r.log(`${version} verified on remote develop at ${merged}`);
    return merged;
  } catch (error) {
    throw new Error(`${version}: ${error instanceof Error ? error.message : String(error)}; inspect ${pull?.url ?? branch}${directory ? `; retained worktree ${directory}` : ""}`, { cause: error });
  }
}

function assertVersionCommit(r, base, head, expected) {
  const parents = r.git(["rev-list", "--parents", "-n", "1", head]).split(/\s+/u);
  const paths = r.git(["diff", "--name-only", base, head]).split("\n").filter(Boolean).sort();
  if (parents.length !== 2 || parents[1] !== base || !isDeepStrictEqual(paths, VERSION_FILES)) {
    throw new Error("existing release branch is not a single version-only commit on the selected develop source");
  }
  assertSameSnapshot(readVersionsAt(r, head), expected, "existing release PR changes more than this package's root version");
}
async function waitForManualMerge(r, initial, branch, head) {
  const deadline = r.now() + r.waitMs;
  while (true) {
    checkCanceled(r);
    const pull = readPull(r, initial.number, branch, head);
    if (pull.state === "MERGED") {
      if (!SHA.test(pull.mergeCommit?.oid ?? "")) throw new Error(`${pull.url} has no verified merge commit`);
      return pull.mergeCommit.oid;
    }
    if (pull.state === "CLOSED") throw new Error(`${pull.url} closed without merging`);
    if (r.now() >= deadline) throw new Error(`timed out waiting for manual merge of ${pull.url}; PR remains pending`);
    await r.sleep(Math.min(r.pollMs, deadline - r.now()));
  }
}

function cleanupOwnedPhase(r, directory, number, branch, head) {
  // Invariant: cleanup failure must retain local work, not discard it or undo an approved merge.
  try {
    const pull = readPull(r, number, branch, head);
    if (pull.state !== "MERGED" || !isClean(r, directory)
      || r.git(["rev-parse", "HEAD"], directory) !== head || r.git(["rev-parse", "--abbrev-ref", "HEAD"], directory) !== "HEAD") {
      r.log(`retaining changed or unverified phase worktree ${directory}`);
      return;
    }
    const remote = r.git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`]);
    if (remote.split(/\s+/u)[0] === head) {
      r.git(["push", "origin", `--force-with-lease=refs/heads/${branch}:${head}`, `:refs/heads/${branch}`]);
    } else if (remote) r.log(`retaining advanced remote branch ${branch}`);
    r.git(["worktree", "remove", directory]);
    r.git(["worktree", "prune"]);
  } catch (error) {
    r.log(`phase cleanup incomplete; inspect ${directory}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
function synchronizeCaller(r, originalHead, reopened) {
  checkCanceled(r);
  if (r.git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "develop"
    || r.git(["rev-parse", "HEAD"]) !== originalHead || !isClean(r, r.cwd)) {
    r.log(`caller checkout changed and was left untouched; remote develop is ${reopened}. Synchronize safely after preserving local work.`);
    return;
  }
  try {
    r.git(["merge", "--ff-only", "--no-overwrite-ignore", reopened]);
  } catch (error) {
    r.log(`remote develop is reopened, but local fast-forward was not completed: ${error instanceof Error ? error.message : String(error)}`);
  }
}
