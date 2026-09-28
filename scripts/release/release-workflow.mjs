import { createHash } from "node:crypto";
import { mkdir, mkdtemp, lstat, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import { setTimeout as sleep } from "node:timers/promises";
import semver from "semver";
import { dispatchPublication, registryVersion, run } from "./publication-client.mjs";
import { parseReleaseArguments, resolveReleasePlan } from "./release-target.mjs";
import { parseReleaseNote, releaseNotePath, renderReleaseNoteDraft } from "./release-notes.mjs";

const VERSION_FILES = ["package-lock.json", "package.json", "packages/a1-install/package.json"];
const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const OPEN_DEVELOPMENT = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-dev$/u;
const PR_FIELDS = "number,url,state,headRefName,headRefOid,baseRefName,isCrossRepository,mergeCommit,mergedBy,autoMergeRequest";

/** Supplies live boundaries by default; tests replace GitHub, registry, publication and clock. */
export function createReleaseRuntime(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const git = (args, directory = cwd) => {
    for (const name of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_COMMON_DIR"]) {
      if (process.env[name]) throw new Error(`${name} overrides are not supported during release preparation`);
    }
    return run("git", ["-C", directory, ...args], { maxBuffer: 8 * 1024 * 1024 });
  };
  const gh = args => run("gh", args, { cwd });
  return {
    git,
    gh,
    releaseChanges: (base, source) => collectReleaseChanges(git, gh, base, source),
    registry: (name, version) => registryVersion(name, version, (url, init) => fetch(url, { ...init, signal: options.signal })),
    publish: (source, version, approval) => dispatchPublication("stable", source, version, {
      draftReleaseId: approval.id,
      releaseNoteSha256: approval.sha256,
    }),
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

/** Prepares or explicitly approves a source-bound draft GitHub Release. */
export async function runRelease(args, runtime) {
  const parsed = parseReleaseArguments(args);
  const r = runtime;
  const root = resolve(r.cwd);
  const local = await readLocalVersions(root);
  const plan = resolveReleasePlan(local.manifest.version, args);
  assertVersions(local, plan.current);
  if (!OPEN_DEVELOPMENT.test(plan.current)) {
    throw new Error(`develop must declare an open development version such as 0.1.8-dev, not ${plan.current}; a stable version is stamped at publication and never committed`);
  }
  if (!Number.isFinite(r.waitMs) || r.waitMs <= 0 || !Number.isFinite(r.pollMs) || r.pollMs <= 0) {
    throw new Error("release wait and poll intervals must be positive");
  }
  r.log(`source ${plan.current}; stable target ${plan.version}; next development ${plan.opening}; mode ${parsed.approve ? "approve" : "prepare"}`);
  checkCanceled(r);
  if (r.git(["rev-parse", "--show-prefix"]) !== "" || r.git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "develop") {
    throw new Error("release runs from the repository root on develop");
  }
  if (!isClean(r, root)) throw new Error("commit or preserve local changes before releasing; checkout must be clean");
  const originalHead = r.git(["rev-parse", "HEAD"]);
  const source = fetchDevelop(r);
  if (source !== originalHead) throw new Error("develop is not at the origin tip; synchronize it safely before releasing");
  assertSameSnapshot(readVersionsAt(r, source), local, "caller manifest differs from authoritative develop");
  let published = false;
  let publicationAttempted = false;
  let phase = "draft release preparation";
  try {
    await assertUnpublished(r, local.manifest.name, plan.version);
    assertAuthoritative(r, source, plan.current, local.manifest.name);
    const draft = await prepareDraftRelease(r, source, plan.version, parsed.approve);
    if (!parsed.approve) {
      r.log(`Draft release ready for editing: ${draft.url}`);
      r.log(`After review, run: npm run release -- ${args[0]} --approve`);
      return { ...plan, source, draft, reopened: null };
    }
    const approval = approvedSnapshot(draft, plan.version);
    const approver = assertAuthenticatedApprover(r, repositoryName(r));
    r.log(`explicit approval by ${approver} binds draft ${approval.id} and note ${approval.sha256}`);
    assertAuthoritative(r, source, plan.current, local.manifest.name);
    checkCanceled(r);
    phase = "stable publication";
    r.log(`dispatching stable publication of ${plan.version} for source ${source} and approved note ${approval.sha256}`);
    publicationAttempted = true;
    await r.publish(source, plan.version, approval);
    published = true;
    r.log(`${plan.version} is published; development reopening is not yet complete`);
    checkCanceled(r);
    phase = "development reopening";
    const openingBase = fetchDevelop(r);
    const open = readVersionsAt(r, openingBase);
    assertVersions(open, plan.current, local.manifest.name);
    const reopened = await prepareVersion(r, openingBase, open, plan.opening,
      `chore(release): open ${plan.opening}`, approval);
    assertReopenedSource(r, reopened, plan.opening, local.manifest.name, approval);
    synchronizeCaller(r, originalHead, reopened);
    r.log(`${plan.version} is published and remote develop is open at ${plan.opening}; previews still require nightly or npm run develop`);
    return { ...plan, source, draft, reopened };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const outcome = published
      ? `${plan.version} is published, but reopening ${plan.opening} is incomplete. Inspect the reopening PR; do not republish ${plan.version}.`
      : publicationAttempted
        ? `Publication of ${plan.version} failed or is uncertain. Inspect the workflow, npm and release records before retrying; no reopening was prepared.`
        : `Publication of ${plan.version} was not dispatched. Inspect the draft, registry and tag state; never republish an existing stable version.`;
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
    installer: JSON.parse(await readFile(join(directory, "packages", "a1-install", "package.json"), "utf8")),
  };
}
function readVersionsAt(r, source) {
  if (!SHA.test(source)) throw new Error("version source is not a commit");
  return {
    manifest: JSON.parse(r.git(["show", `${source}:package.json`])),
    lock: JSON.parse(r.git(["show", `${source}:package-lock.json`])),
    installer: JSON.parse(r.git(["show", `${source}:packages/a1-install/package.json`])),
  };
}
function assertVersions(snapshot, version, name = snapshot.manifest.name) {
  if (typeof name !== "string" || !name || snapshot.manifest.name !== name || snapshot.manifest.version !== version
    || snapshot.lock.version !== version || snapshot.lock.packages?.[""]?.version !== version || snapshot.installer?.version !== version) {
    throw new Error(`manifest and root lockfile must consistently declare ${name}@${version}`);
  }
}
function assertSameSnapshot(actual, expected, message) {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(message);
}
function withVersion(snapshot, version) {
  const { manifest, lock, installer } = structuredClone(snapshot);
  manifest.version = version;
  lock.version = version;
  lock.packages[""].version = version;
  installer.version = version;
  return { manifest, lock, installer };
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

async function prepareDraftRelease(r, source, version, approving) {
  checkCanceled(r);
  assertAuthoritative(r, source, readVersionsAt(r, source).manifest.version, readVersionsAt(r, source).manifest.name);
  const repository = repositoryName(r);
  const matches = listVersionReleases(r, repository, version);
  if (matches.length > 1) throw new Error(`ambiguous GitHub Releases for v${version}`);
  if (matches.length === 1) {
    const draft = assertDraftRelease(matches[0], source, version);
    r.log(`existing draft release: ${draft.url}`);
    return draft;
  }
  if (approving) throw new Error(`no editable draft exists for v${version}; run preparation without --approve first`);

  r.git(["fetch", "origin", "--tags"]);
  const tag = r.git(["describe", "--first-parent", "--tags", "--abbrev=0", "--match", "v[0-9]*", source]);
  const previousVersion = tag.startsWith("v") ? tag.slice(1) : "";
  if (semver.valid(previousVersion) !== previousVersion || semver.prerelease(previousVersion) !== null) {
    throw new Error(`latest release baseline ${tag} is not an exact stable tag`);
  }
  const previous = r.git(["rev-parse", `${tag}^{commit}`]);
  r.git(["merge-base", "--is-ancestor", previous, source]);
  const markdown = parseReleaseNote(renderReleaseNoteDraft(version, await r.releaseChanges(previous, source)), version).markdown;
  const created = JSON.parse(r.gh([
    "api", "-X", "POST", `repos/${repository}/releases`,
    "-f", `tag_name=v${version}`, "-f", `target_commitish=${source}`,
    "-f", `name=v${version}`, "-f", `body=${markdown}`,
    "-F", "draft=true", "-F", "prerelease=false",
  ]));
  const draft = assertDraftRelease(created, source, version);
  r.log(`created draft release: ${draft.url}`);
  return draft;
}

function repositoryName(r) {
  const repository = r.gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) throw new Error("GitHub repository identity is invalid");
  return repository;
}

function assertAuthenticatedApprover(r, repository) {
  const actor = JSON.parse(r.gh(["api", "user"]));
  if (!actor || typeof actor.login !== "string" || !/^[A-Za-z0-9-]+$/u.test(actor.login) || actor.type !== "User") {
    throw new Error("stable approval requires an authenticated human GitHub user");
  }
  const permission = JSON.parse(r.gh(["api", `repos/${repository}/collaborators/${actor.login}/permission`]));
  if (!permission || !["admin", "maintain", "write"].includes(permission.permission)) {
    throw new Error(`${actor.login} is not authorized to approve a stable release`);
  }
  return actor.login;
}

function listVersionReleases(r, repository, version) {
  const releases = JSON.parse(r.gh(["api", `repos/${repository}/releases?per_page=100`]));
  if (!Array.isArray(releases) || releases.length >= 100) throw new Error("GitHub release response is invalid or exceeds its bounded page");
  return releases.filter(release => release?.tag_name === `v${version}`);
}

function assertDraftRelease(value, source, version) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || value.tag_name !== `v${version}`
    || value.target_commitish !== source || value.name !== `v${version}` || value.draft !== true
    || value.prerelease !== false || typeof value.body !== "string" || typeof value.html_url !== "string"
    || !value.html_url.startsWith("https://")) {
    throw new Error(`v${version} GitHub Release is not the expected editable draft for source ${source}`);
  }
  const note = parseReleaseNote(value.body, version);
  return Object.freeze({ id: value.id, url: value.html_url, version, source, markdown: note.markdown });
}

function approvedSnapshot(draft, version) {
  const note = parseReleaseNote(draft.markdown, version);
  return Object.freeze({
    id: draft.id,
    url: draft.url,
    version,
    source: draft.source,
    markdown: note.markdown,
    sha256: createHash("sha256").update(note.markdown, "utf8").digest("hex"),
  });
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

async function prepareVersion(r, base, snapshot, version, subject, approval) {
  checkCanceled(r);
  assertAuthoritative(r, base, snapshot.manifest.version, snapshot.manifest.name);
  const branch = `chore/release-${version}`;
  const expected = withVersion(snapshot, version);
  const notePath = releaseNotePath(approval.version);
  if (pathExistsAt(r, base, notePath)) throw new Error(`${notePath} already exists on the selected reopening base`);
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
      assertReopeningCommit(r, base, head, expected, approval);
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
      await writeFile(join(directory, "packages", "a1-install", "package.json"), `${JSON.stringify(expected.installer, null, 2)}\n`, "utf8");
      await mkdir(join(directory, "docs", "releases"), { recursive: true });
      await writeFile(join(directory, ...notePath.split("/")), approval.markdown, "utf8");
      checkCanceled(r);
      r.git(["add", "--", ...VERSION_FILES, notePath], directory);
      r.git(["commit", "-m", subject], directory);
      head = r.git(["rev-parse", "HEAD"], directory);
      assertReopeningCommit(r, base, head, expected, approval);
      checkCanceled(r);
      // Concurrency: the branch must still be absent. An empty lease prevents a racing
      // release from being replaced even when its commit happens to be an ancestor.
      r.git(["push", "origin", `--force-with-lease=refs/heads/${branch}:`, `HEAD:refs/heads/${branch}`], directory);
      checkCanceled(r);
      const url = r.gh(["pr", "create", "--base", "develop", "--head", branch, "--title", subject,
        "--body", `Reopens development at ${version} and records the exact approved ${approval.version} release notes after stable publication. Required CI must pass, then merge manually. This PR must not auto-merge.`]);
      r.log(`version PR: ${url}`);
      const number = /\/(\d+)\s*$/u.exec(url)?.[1];
      if (!number) throw new Error(`cannot read version PR number from ${url}`);
      pull = readPull(r, Number(number), branch, head);
    }
    r.log(`Manual action required: validate ${pull.url}, record local acceptance, then merge it manually. CI success alone will not advance this release.`);
    const merged = await waitForManualMerge(r, pull, branch, head);
    assertReopenedSource(r, merged, version, snapshot.manifest.name, approval);
    if (directory) cleanupOwnedPhase(r, directory, pull.number, branch, head);
    r.log(`${version} verified on remote develop at ${merged}`);
    return merged;
  } catch (error) {
    throw new Error(`${version}: ${error instanceof Error ? error.message : String(error)}; inspect ${pull?.url ?? branch}${directory ? `; retained worktree ${directory}` : ""}`, { cause: error });
  }
}

function assertReopeningCommit(r, base, head, expected, approval) {
  const parents = r.git(["rev-list", "--parents", "-n", "1", head]).split(/\s+/u);
  const paths = r.git(["diff", "--name-only", base, head]).split("\n").filter(Boolean).sort();
  const notePath = releaseNotePath(approval.version);
  const expectedPaths = [...VERSION_FILES, notePath].sort();
  if (parents.length !== 2 || parents[1] !== base || !isDeepStrictEqual(paths, expectedPaths)) {
    throw new Error("existing reopening branch is not one exact version-and-release-note commit on the selected develop source");
  }
  assertSameSnapshot(readVersionsAt(r, head), expected, "existing reopening PR changes more than the synchronized package versions");
  const note = parseReleaseNote(r.git(["show", `${head}:${notePath}`]) + "\n", approval.version);
  if (createHash("sha256").update(note.markdown, "utf8").digest("hex") !== approval.sha256) {
    throw new Error("existing reopening PR release note differs from the approved snapshot");
  }
}

function assertReopenedSource(r, source, version, name, approval) {
  assertAuthoritative(r, source, version, name);
  const note = parseReleaseNote(r.git(["show", `${source}:${releaseNotePath(approval.version)}`]) + "\n", approval.version);
  if (createHash("sha256").update(note.markdown, "utf8").digest("hex") !== approval.sha256) {
    throw new Error("reopened develop release note differs from the approved snapshot");
  }
}

function pathExistsAt(r, source, path) {
  try { r.git(["cat-file", "-e", `${source}:${path}`]); return true; }
  catch { return false; }
}
async function waitForManualMerge(r, initial, branch, head) {
  const deadline = r.now() + r.waitMs;
  while (true) {
    checkCanceled(r);
    const pull = readPull(r, initial.number, branch, head);
    if (pull.state === "MERGED") {
      if (!SHA.test(pull.mergeCommit?.oid ?? "") || pull.mergedBy?.__typename !== "User"
        || typeof pull.mergedBy.login !== "string" || pull.mergedBy.login.length === 0) {
        throw new Error(`${pull.url} has no verified manual human merge`);
      }
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
export async function collectReleaseChanges(git, gh, base, source) {
  if (!SHA.test(base) || !SHA.test(source)) throw new Error("release-note range is invalid");
  const repository = gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) throw new Error("GitHub repository identity is invalid");
  const commits = git(["log", "--first-parent", "--reverse", "--format=%H", `${base}..${source}`]).split("\n").filter(Boolean);
  const changes = [];
  const seen = new Set();
  for (const commit of commits) {
    const pulls = JSON.parse(gh(["api", "-H", "Accept: application/vnd.github+json", `repos/${repository}/commits/${commit}/pulls`]));
    const matches = Array.isArray(pulls) ? pulls.filter(pull => pull?.merged_at && pull?.base?.ref === "develop" && pull?.merge_commit_sha === commit) : [];
    if (matches.length !== 1 || !Number.isSafeInteger(matches[0]?.number) || matches[0].number < 1
      || typeof matches[0]?.title !== "string" || typeof matches[0]?.html_url !== "string") {
      throw new Error(`commit ${commit} has ${matches.length} unique merged pull request associations`);
    }
    if (seen.has(matches[0].number)) throw new Error(`pull request #${matches[0].number} appears more than once in the release range`);
    seen.add(matches[0].number);
    changes.push({ number: matches[0].number, title: matches[0].title, url: matches[0].html_url });
  }
  return changes;
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
