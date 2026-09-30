import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { isDeepStrictEqual } from "node:util";
import semver from "semver";
import { dispatchStableValidation, registryVersion, run, waitForStableValidation } from "./publication-client.mjs";
import { parseReleaseArguments, resolveReleasePlan } from "./release-target.mjs";
import { parseReleaseNote, renderReleaseNoteDraft } from "./release-notes.mjs";

const SHA = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/u;
const OPEN_DEVELOPMENT = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)-dev$/u;

/** Supplies live boundaries by default; tests replace GitHub, registry and network services. */
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
    dispatchValidation: candidate => dispatchStableValidation(candidate, {
      run: (executable, args, commandOptions = {}) => run(executable, args, { cwd, ...commandOptions }),
    }),
    waitForValidation: validation => waitForStableValidation(validation, {
      run: (executable, args, commandOptions = {}) => run(executable, args, { cwd, ...commandOptions }),
    }),
    log: message => process.stdout.write(`[release] ${message}\n`),
    error: message => process.stderr.write(`[release] ${message}\n`),
    ...options,
    cwd,
  };
}

/** Prepares one source-bound draft, waits for validation of its source, then hands the draft to native Publish release. */
export async function runRelease(args, runtime) {
  parseReleaseArguments(args);
  const r = runtime;
  const root = resolve(r.cwd);
  const local = await readLocalVersions(root);
  const plan = resolveReleasePlan(local.manifest.version, args);
  assertVersions(local, plan.current);
  if (!OPEN_DEVELOPMENT.test(plan.current)) {
    throw new Error(`develop must declare an open development version such as 0.1.8-dev, not ${plan.current}; a stable version is stamped at publication and never committed`);
  }
  r.log(`source ${plan.current}; stable target ${plan.version}; next development ${plan.opening}; mode prepare`);
  checkCanceled(r);
  if (r.git(["rev-parse", "--show-prefix"]) !== "" || r.git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "develop") {
    throw new Error("release runs from the repository root on develop");
  }
  if (!isClean(r, root)) throw new Error("commit or preserve local changes before releasing; checkout must be clean");
  const source = fetchDevelop(r);
  if (source !== r.git(["rev-parse", "HEAD"])) throw new Error("develop is not at the origin tip; synchronize it safely before releasing");
  assertSameSnapshot(readVersionsAt(r, source), local, "caller manifest differs from authoritative develop");

  try {
    const packages = await readPackagePair(r, local.manifest.name, local.installer.name, plan.version);
    if (packages.application !== null || packages.installer !== null) {
      throw new Error(`${plan.version} already exists on npm; stable versions are never republished. If its publication run failed after npm, rerun that run's failed jobs`);
    }
    assertAuthoritative(r, source, plan.current, local.manifest.name);
    const repository = repositoryName(r);
    const draft = await prepareDraftRelease(r, repository, source, plan.version, local);
    assertAuthoritative(r, source, plan.current, local.manifest.name);
    const validation = await r.dispatchValidation({ repository, source, version: plan.version });
    // Rationale: links stand on their own lines so a terminal selection copies exactly the URL.
    r.log(`${validation.reused ? "Following existing" : "Started"} validation of ${source.slice(0, 12)} as ${plan.version}. Progress:\n${validation.url}`);
    r.log("Waiting for validation to pass. Ctrl+C is safe: validation keeps running and rerunning this command resumes waiting.");
    try {
      await r.waitForValidation({ repository, runId: validation.runId });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`${detail}\nThe draft was not published. Fix develop and run the release command again; it refreshes the draft for the new source.`, { cause: error });
    }
    r.log(`Validation passed. Edit the changelog, then choose Publish release:\n${draft.url}`);
    return { ...plan, source, draft, validationRunId: validation.runId };
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`stable release preparation stopped: ${detail}`, { cause: error });
  }
}

function checkCanceled(r) { r.signal?.throwIfAborted(); }
function isClean(r, directory) { return r.git(["status", "--porcelain=v1", "--untracked-files=all"], directory) === ""; }
function fetchDevelop(r) {
  checkCanceled(r);
  r.git(["fetch", "-q", "origin", "develop"]);
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
    || snapshot.lock.version !== version || snapshot.lock.packages?.[""]?.version !== version
    || typeof snapshot.installer?.name !== "string" || !snapshot.installer.name.endsWith("/a1-install")
    || snapshot.installer.version !== version) {
    throw new Error(`manifest and root lockfile must consistently declare ${name}@${version}`);
  }
}
function assertSameSnapshot(actual, expected, message) {
  if (!isDeepStrictEqual(actual, expected)) throw new Error(message);
}
function assertAuthoritative(r, source, version, name) {
  if (fetchDevelop(r) !== source) throw new Error(`authoritative develop no longer matches selected source ${source}; refusing to substitute another commit`);
  assertVersions(readVersionsAt(r, source), version, name);
}
async function readPackagePair(r, application, installer, version) {
  checkCanceled(r);
  const [app, install] = await Promise.all([r.registry(application, version), r.registry(installer, version)]);
  return { application: app, installer: install };
}
function repositoryName(r) {
  const repository = r.gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository)) throw new Error("GitHub repository identity is invalid");
  return repository;
}
function listVersionReleases(r, repository, version) {
  const releases = JSON.parse(r.gh(["api", `repos/${repository}/releases?per_page=100`]));
  if (!Array.isArray(releases) || releases.length >= 100) throw new Error("GitHub release response is invalid or exceeds its bounded page");
  return releases.filter(release => release?.tag_name === `v${version}` || (release?.draft === true && release?.name === `v${version}`));
}
function remoteTagCommit(r, version) {
  const ref = `refs/tags/v${version}`;
  const lines = r.git(["ls-remote", "--tags", "origin", ref]).split("\n").filter(Boolean);
  if (lines.length === 0) return null;
  if (lines.length !== 1 || lines[0].split(/\s+/u)[1] !== ref || !SHA.test(lines[0].split(/\s+/u)[0] ?? "")) {
    throw new Error(`v${version} remote tag identity is ambiguous`);
  }
  r.git(["fetch", "-q", "origin", ref]);
  const commit = r.git(["rev-parse", "FETCH_HEAD^{commit}"]);
  if (!SHA.test(commit)) throw new Error(`v${version} does not resolve to a commit`);
  return commit;
}
function assertDraftRelease(value, source, version) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1 || value.tag_name !== `v${version}`
    || value.target_commitish !== source || value.name !== `v${version}` || value.draft !== true
    || value.prerelease !== false || typeof value.body !== "string" || typeof value.html_url !== "string"
    || !value.html_url.startsWith("https://") || !value.html_url.includes("/releases/tag/")
    || typeof value.updated_at !== "string" || Number.isNaN(Date.parse(value.updated_at))) {
    throw new Error(`v${version} GitHub Release is not the expected editable draft for source ${source}`);
  }
  const note = parseReleaseNote(value.body, version);
  const url = value.html_url.replace("/releases/tag/", "/releases/edit/");
  return Object.freeze({ id: value.id, url, version, source, markdown: note.markdown, updatedAt: value.updated_at });
}
function assertReplaceableDraft(value, version) {
  if (!value || !Number.isSafeInteger(value.id) || value.id < 1
    || (value.tag_name !== `v${version}` && !/^untagged-[a-f0-9]+$/u.test(String(value.tag_name)))
    || value.name !== `v${version}` || value.draft !== true || value.prerelease !== false
    || typeof value.target_commitish !== "string" || !SHA.test(value.target_commitish)) {
    throw new Error(`v${version} GitHub Release is not a replaceable stable draft; stable preparation only refreshes its own drafts`);
  }
}
/** Keeps the draft already bound to this source, then any correctly tagged draft, then the most recently updated. */
function preferredDraft(drafts, source, version) {
  const rank = draft => (draft.tag_name === `v${version}` ? 2 : 0) + (draft.target_commitish === source ? 1 : 0);
  return [...drafts].sort((left, right) => rank(right) - rank(left)
    || String(right.updated_at).localeCompare(String(left.updated_at)) || right.id - left.id)[0] ?? null;
}
function removeDuplicateDrafts(r, repository, version, duplicates) {
  for (const duplicate of duplicates) {
    r.gh(["api", "-X", "DELETE", `repos/${repository}/releases/${duplicate.id}`]);
    r.log(`Removed a duplicate v${version} draft (${duplicate.tag_name}, ${String(duplicate.target_commitish).slice(0, 12)}).`);
  }
}
/**
 * Selects the changelog baseline from authoritative remote state: the highest published, non-prerelease
 * Release below the target whose tag, as resolved on origin, is in the source's first-parent history.
 * Rationale: local tags are never consulted, because a tag GitHub deleted with its Release survives
 * `git fetch --tags` and would silently shorten the range.
 */
function publishedBaseline(r, repository, source, version) {
  const releases = JSON.parse(r.gh(["api", `repos/${repository}/releases?per_page=100`]));
  if (!Array.isArray(releases) || releases.length >= 100) throw new Error("GitHub release response is invalid or exceeds its bounded page");
  const versions = [...new Set(releases.flatMap(release => {
    const tag = typeof release?.tag_name === "string" ? release.tag_name : "";
    const candidate = tag.startsWith("v") ? tag.slice(1) : "";
    return release?.draft === false && release?.prerelease === false && semver.valid(candidate) === candidate
      && semver.prerelease(candidate) === null && semver.lt(candidate, version) ? [candidate] : [];
  }))].sort(semver.rcompare);
  const remoteTags = remoteTagCommits(r);
  const history = new Set(r.git(["rev-list", "--first-parent", source]).split("\n").filter(Boolean));
  for (const candidate of versions) {
    const commit = remoteTags.get(`v${candidate}`);
    if (commit !== undefined && history.has(commit)) return { version: candidate, commit };
  }
  throw new Error(`no published stable Release below v${version} has a tag on origin in the first-parent history of ${source}; `
    + "the changelog baseline is missing");
}
/** Maps each remote tag to its commit, preferring the peeled entry that annotated tags add. */
function remoteTagCommits(r) {
  const commits = new Map();
  for (const line of r.git(["ls-remote", "--tags", "origin"]).split("\n").filter(Boolean)) {
    const [object, ref] = line.split(/\s+/u);
    const match = /^refs\/tags\/(.+?)(\^\{\})?$/u.exec(ref ?? "");
    if (!SHA.test(object ?? "") || match === null) throw new Error("origin tag listing is invalid");
    if (match[2] !== undefined || !commits.has(match[1])) commits.set(match[1], object);
  }
  return commits;
}
async function prepareDraftRelease(r, repository, source, version, local) {
  checkCanceled(r);
  assertAuthoritative(r, source, local.manifest.version, local.manifest.name);
  const matches = listVersionReleases(r, repository, version);
  const tag = remoteTagCommit(r, version);
  if (tag !== null) {
    throw new Error(`v${version} already exists at ${tag}; stable preparation never deletes, moves, or reuses a release tag. `
      + `If its Release was deleted before npm publication, remove the tag with: gh workflow run release-tag-cleanup.yml -f version=${version}`);
  }
  // Rationale: one draft per version. A draft bound to an older develop is replaced in place, and
  // duplicates (for example a draft GitHub left untagged) are removed instead of accumulating.
  for (const match of matches) assertReplaceableDraft(match, version);
  const existing = preferredDraft(matches, source, version);
  const duplicates = matches.filter(match => match !== existing);
  if (existing !== null && existing.tag_name === `v${version}` && existing.target_commitish === source) {
    assertAuthoritative(r, source, local.manifest.version, local.manifest.name);
    const draft = assertDraftRelease(existing, source, version);
    removeDuplicateDrafts(r, repository, version, duplicates);
    return draft;
  }

  const previous = publishedBaseline(r, repository, source, version);
  r.log(`Changelog covers pull requests merged after v${previous.version} (${previous.commit.slice(0, 12)}).`);
  const markdown = parseReleaseNote(renderReleaseNoteDraft(version, await r.releaseChanges(previous.commit, source), r.releaseDate), version).markdown;
  assertAuthoritative(r, source, local.manifest.version, local.manifest.name);
  if (existing !== null) {
    const updated = JSON.parse(r.gh([
      // Compatibility: GitHub resets an omitted tag_name on a draft to untagged-*, so the identity is resent.
      "api", "-X", "PATCH", `repos/${repository}/releases/${existing.id}`,
      "-f", `tag_name=v${version}`, "-f", `name=v${version}`,
      "-f", `target_commitish=${source}`, "-f", `body=${markdown}`,
    ]));
    const draft = assertDraftRelease(updated, source, version);
    r.log(`Refreshed the v${version} draft from ${String(existing.target_commitish).slice(0, 12)} to ${source.slice(0, 12)}; its release notes were regenerated.`);
    removeDuplicateDrafts(r, repository, version, duplicates);
    return draft;
  }
  const created = JSON.parse(r.gh([
    "api", "-X", "POST", `repos/${repository}/releases`,
    "-f", `tag_name=v${version}`, "-f", `target_commitish=${source}`,
    "-f", `name=v${version}`, "-f", `body=${markdown}`,
    "-F", "draft=true", "-F", "prerelease=false",
  ]));
  return assertDraftRelease(created, source, version);
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
