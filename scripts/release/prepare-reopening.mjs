#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import semver from "semver";
import { parseReleaseNote, releaseNotePath } from "./release-notes.mjs";

const SHA = /^[a-f0-9]{40}$/u;
const VERSION_FILES = ["package-lock.json", "package.json", "packages/a1-install/package.json"];
const PR_FIELDS = "number,url,state,headRefName,headRefOid,baseRefName,isCrossRepository,autoMergeRequest";

function run(executable, args, options = {}) {
  return (execFileSync(executable, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...options }) ?? "").trim();
}

function assertPull(pull, branch, head) {
  if (!pull || !Number.isSafeInteger(pull.number) || pull.number < 1 || typeof pull.url !== "string" || !pull.url.startsWith("https://")
    || pull.state !== "OPEN" || pull.baseRefName !== "develop" || pull.headRefName !== branch || pull.isCrossRepository !== false
    || pull.autoMergeRequest !== null || !SHA.test(pull.headRefOid) || (head && pull.headRefOid !== head)) {
    throw new Error(`unexpected or changed reopening pull request for ${branch}`);
  }
  return pull;
}
function readSnapshotAt(git, source) {
  return {
    manifest: JSON.parse(git(["show", `${source}:package.json`])),
    lock: JSON.parse(git(["show", `${source}:package-lock.json`])),
    installer: JSON.parse(git(["show", `${source}:packages/a1-install/package.json`])),
  };
}
function assertVersions(snapshot, version, name) {
  if (snapshot.manifest.name !== name || snapshot.manifest.version !== version || snapshot.lock.version !== version
    || snapshot.lock.packages?.[""]?.version !== version || snapshot.installer.version !== version) {
    throw new Error(`reopening source must consistently declare ${name}@${version}`);
  }
}
function withVersion(snapshot, version) {
  const value = structuredClone(snapshot);
  value.manifest.version = version;
  value.lock.version = version;
  value.lock.packages[""].version = version;
  value.installer.version = version;
  return value;
}
function assertCommit(git, base, head, expected, releaseVersion, markdown, digest) {
  const parents = git(["rev-list", "--parents", "-n", "1", head]).split(/\s+/u);
  const notePath = releaseNotePath(releaseVersion);
  const paths = git(["diff", "--name-only", base, head]).split("\n").filter(Boolean).sort();
  const expectedPaths = [...VERSION_FILES, notePath].sort();
  if (parents.length !== 2 || parents[1] !== base || JSON.stringify(paths) !== JSON.stringify(expectedPaths)) {
    throw new Error("reopening branch is not one exact version-and-release-note commit on current develop");
  }
  const actual = readSnapshotAt(git, head);
  if (JSON.stringify(actual) !== JSON.stringify(expected)) throw new Error("reopening branch changes more than synchronized package versions");
  const note = parseReleaseNote(`${git(["show", `${head}:${notePath}`])}\n`, releaseVersion);
  const actualDigest = createHash("sha256").update(note.markdown, "utf8").digest("hex");
  if (note.markdown !== markdown || actualDigest !== digest) throw new Error("reopening release note differs from the approved snapshot");
}

export async function prepareReopening(options = {}) {
  const releaseVersion = options.releaseVersion ?? process.env.RELEASE_VERSION;
  const source = options.source ?? process.env.SOURCE_SHA;
  const digest = options.digest ?? process.env.RELEASE_NOTES_SHA256;
  const cwd = options.cwd ?? process.cwd();
  const execute = options.run ?? ((executable, args) => run(executable, args, { cwd }));
  const git = args => execute("git", args);
  const gh = args => execute("gh", args);
  const noteFile = options.noteFile ?? process.env.APPROVED_NOTE_PATH ?? join(cwd, ".artifacts", "release-note", "approved-note.md");
  if (semver.valid(releaseVersion) !== releaseVersion || semver.prerelease(releaseVersion) !== null || !SHA.test(source ?? "")
    || !/^[a-f0-9]{64}$/u.test(digest ?? "")) throw new Error("reopening requires exact stable version, source, and approved digest");
  const opening = `${semver.inc(releaseVersion, "patch")}-dev`;
  const branch = `chore/release-${opening}`;
  const markdown = parseReleaseNote(await readFile(noteFile, "utf8"), releaseVersion).markdown;
  if (createHash("sha256").update(markdown, "utf8").digest("hex") !== digest) throw new Error("approved reopening note digest changed");

  git(["fetch", "origin", "develop"]);
  const base = git(["rev-parse", "origin/develop"]);
  if (!SHA.test(base)) throw new Error("authoritative develop did not resolve to a commit");
  git(["merge-base", "--is-ancestor", source, base]);
  const sourceSnapshot = readSnapshotAt(git, source);
  const baseSnapshot = readSnapshotAt(git, base);
  assertVersions(sourceSnapshot, sourceSnapshot.manifest.version, sourceSnapshot.manifest.name);
  assertVersions(baseSnapshot, sourceSnapshot.manifest.version, sourceSnapshot.manifest.name);
  if (baseSnapshot.installer.name !== sourceSnapshot.installer.name || !/^\d+\.\d+\.\d+-dev$/u.test(baseSnapshot.manifest.version)) {
    throw new Error("authoritative develop changed package identity or is not open for development");
  }
  const notePath = releaseNotePath(releaseVersion);
  if (git(["ls-tree", "--name-only", base, "--", notePath]) === notePath) throw new Error(`${notePath} already exists on current develop`);
  const expected = withVersion(baseSnapshot, opening);
  const pulls = JSON.parse(gh(["pr", "list", "--state", "all", "--base", "develop", "--head", branch, "--json", PR_FIELDS]));
  if (!Array.isArray(pulls) || pulls.length > 1) throw new Error(`ambiguous reopening pull requests for ${branch}`);
  if (pulls.length === 1) {
    const pull = assertPull(pulls[0], branch);
    git(["fetch", "origin", `refs/heads/${branch}`]);
    const head = git(["rev-parse", "FETCH_HEAD"]);
    assertPull(pull, branch, head);
    assertCommit(git, base, head, expected, releaseVersion, markdown, digest);
    return { url: pull.url, number: pull.number, branch, head, opening, reused: true };
  }
  if (git(["ls-remote", "--heads", "origin", `refs/heads/${branch}`])) {
    throw new Error(`${branch} exists without one matching reopening pull request`);
  }

  git(["switch", "--detach", base]);
  await writeFile(join(cwd, "package.json"), `${JSON.stringify(expected.manifest, null, 2)}\n`, "utf8");
  await writeFile(join(cwd, "package-lock.json"), `${JSON.stringify(expected.lock, null, 2)}\n`, "utf8");
  await writeFile(join(cwd, "packages", "a1-install", "package.json"), `${JSON.stringify(expected.installer, null, 2)}\n`, "utf8");
  await mkdir(join(cwd, dirname(notePath)), { recursive: true });
  await writeFile(join(cwd, ...notePath.split("/")), markdown, "utf8");
  git(["add", "--", ...VERSION_FILES, notePath]);
  const subject = `chore(release): open ${opening}`;
  git(["commit", "-m", subject]);
  const head = git(["rev-parse", "HEAD"]);
  assertCommit(git, base, head, expected, releaseVersion, markdown, digest);
  git(["push", "origin", `--force-with-lease=refs/heads/${branch}:`, `HEAD:refs/heads/${branch}`]);
  const url = gh(["pr", "create", "--base", "develop", "--head", branch, "--title", subject, "--body",
    `Reopens development at ${opening} and records the exact approved ${releaseVersion} release notes after stable publication. Required CI must pass, then merge manually. This PR must not auto-merge.`]);
  const number = Number(/\/(\d+)\s*$/u.exec(url)?.[1]);
  if (!Number.isSafeInteger(number) || number < 1) throw new Error(`cannot read reopening pull request number from ${url}`);
  const pull = assertPull(JSON.parse(gh(["pr", "view", String(number), "--json", PR_FIELDS])), branch, head);
  return { url: pull.url, number, branch, head, opening, reused: false };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const result = await prepareReopening();
    process.stdout.write(`Reopening pull request: ${result.url}\nMerge it manually after required CI succeeds.\n`);
    if (process.env.GITHUB_OUTPUT) {
      await writeFile(process.env.GITHUB_OUTPUT, `url=${result.url}\nnumber=${result.number}\nhead=${result.head}\n`, { flag: "a" });
    }
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  }
}
