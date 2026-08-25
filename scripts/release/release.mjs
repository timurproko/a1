#!/usr/bin/env node
/**
 * Cut a stable release.
 *
 *   node scripts/release/release.mjs <major|minor|patch|x.y.z>
 *
 * Both stable publication and development publication are deliberate requests.
 * develop takes pull requests rather than pushes, so the two version commits go
 * through pull requests that merge themselves once validation passes. This
 * command lands `x.y.z`, explicitly dispatches and waits for publication of that
 * exact commit, then opens `x.y.(z+1)-dev` only after publication succeeds.
 *
 * This command creates no tag and uploads no package bytes. GitHub Actions writes
 * the immutable tag after npm accepts the exact validated package.
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { dispatchPublication } from "./publication-client.mjs";

const BUMPS = new Set(["major", "minor", "patch"]);
const EXACT = /^\d+\.\d+\.\d+$/;
const POLL_INTERVAL_MS = 20_000;
const MERGE_TIMEOUT_MS = 30 * 60_000;

const target = process.argv[2];
if (!target || (!BUMPS.has(target) && !EXACT.test(target))) {
  process.stderr.write("Usage: node scripts/release/release.mjs <major|minor|patch|x.y.z>\n");
  process.exit(2);
}

function run(executable, args, options = {}) {
  return (execFileSync(executable, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...options }) ?? "").trim();
}
function git(args, options = {}) {
  return run("git", args, options);
}
function gh(args) {
  return run("gh", args);
}
function log(message) {
  process.stdout.write(`[release] ${message}\n`);
}

async function readVersion() {
  return JSON.parse(await readFile("package.json", "utf8")).version;
}

/**
 * Set this package's version, and only this package's.
 *
 * The lockfile records a version for every installed dependency too, so replacing
 * the version text wherever it appears rewrites any dependency that happens to sit
 * at the same version — which is exactly what happened releasing 0.1.7, a version
 * `partial-json` also had. The entries are addressed instead of matched.
 */
async function writeVersion(version) {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  if (manifest.version !== current) throw new Error(`package.json declares ${manifest.version}, not ${current}`);
  manifest.version = version;
  await writeFile("package.json", `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
  if (lock.version !== current || lock.packages?.[""]?.version !== current) {
    throw new Error(`package-lock.json does not declare ${current} for this package`);
  }
  lock.version = version;
  lock.packages[""].version = version;
  await writeFile("package-lock.json", `${JSON.stringify(lock, null, 2)}\n`, "utf8");
}

function nextVersion(from, kind) {
  const [major, minor, patch] = from.split("-")[0].split(".").map(Number);
  if (kind === "major") return `${major + 1}.0.0`;
  if (kind === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

/** Land one version commit on develop through a pull request that merges itself. */
async function landVersion(version, subject) {
  const branch = `chore/release-${version}`;
  await writeVersion(version);
  git(["add", "package.json", "package-lock.json"]);
  git(["commit", "-m", subject]);
  git(["push", "origin", `HEAD:refs/heads/${branch}`]);
  git(["reset", "--hard", "HEAD~1"]);
  const url = gh(["pr", "create", "--base", "develop", "--head", branch, "--title", subject, "--body", `Release automation: ${subject}.`]);
  const number = /\/(\d+)$/.exec(url)?.[1];
  if (!number) throw new Error(`could not read a pull request number from ${url}`);
  gh(["pr", "merge", number, "--squash", "--auto"]);
  log(`pull request ${number} opened for ${version}; waiting for it to merge`);

  const deadline = Date.now() + MERGE_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const state = gh(["pr", "view", number, "--json", "state", "--jq", ".state"]);
    if (state === "MERGED") {
      git(["fetch", "origin", "develop"]);
      git(["reset", "--hard", "origin/develop"]);
      const landed = await readVersion();
      if (landed !== version) throw new Error(`develop declares ${landed} after merging ${version}`);
      log(`${version} landed on develop`);
      return;
    }
    if (state === "CLOSED") throw new Error(`pull request ${number} was closed without merging`);
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`pull request ${number} did not merge within ${MERGE_TIMEOUT_MS / 60_000} minutes`);
}

if (git(["rev-parse", "--abbrev-ref", "HEAD"]) !== "develop") throw new Error("release runs from develop");
if (git(["status", "--porcelain", "-uno"]) !== "") throw new Error("commit or stash tracked changes first");
git(["fetch", "origin", "develop"], { stdio: ["ignore", "ignore", "inherit"] });
if (git(["rev-parse", "HEAD"]) !== git(["rev-parse", "origin/develop"])) throw new Error("develop is not at the origin tip; pull or push first");

let current = await readVersion();
const version = EXACT.test(target) ? target : nextVersion(current, target);
if (!EXACT.test(version)) throw new Error(`${version} is not a stable version`);

const { name } = JSON.parse(await readFile("package.json", "utf8"));
const registry = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`, { headers: { "cache-control": "no-cache" } });
if (registry.status !== 404) throw new Error(`${name}@${version} already exists on the registry (HTTP ${registry.status})`);

const tag = `v${version}`;
if (git(["ls-remote", "--tags", "origin", tag]) !== "") {
  throw new Error(`${tag} already exists; a release tag is never moved`);
}

log(`releasing ${name}@${version} from ${current}`);

if (current !== version) {
  await landVersion(version, `chore(release): ${version}`);
  current = version;
}

const releaseCommit = git(["rev-parse", "origin/develop"]);
log(`dispatching stable publication for ${releaseCommit}`);
await dispatchPublication("stable", releaseCommit, version);
log(`GitHub Actions published ${version}`);

const opening = `${nextVersion(version, "patch")}-dev`;
await landVersion(opening, `chore(release): open ${opening}`);
log(`${version} is published and develop is open at ${opening}; the next preview waits for nightly or npm run develop`);
