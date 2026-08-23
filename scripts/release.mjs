#!/usr/bin/env node
/**
 * Cut a stable release.
 *
 *   node scripts/release.mjs <major|minor|patch|x.y.z>
 *
 * Previews need nothing from anyone: every push to develop publishes one. A
 * stable release is the only thing that needs a decision, so it is the only
 * thing with a command.
 *
 * develop takes pull requests rather than pushes, so the two version commits go
 * through pull requests that merge themselves once validation passes. What the
 * command does, in order:
 *
 *   1. Refuse anything but a clean develop that matches its remote.
 *   2. Land `x.y.z` on develop.
 *   3. Tag that exact commit `vx.y.z` and push the tag, which publishes it.
 *   4. Land `x.y.(z+1)-dev.0` on develop, so previews resume immediately.
 *
 * The tag is what releases. Everything else here exists to make the tag point
 * at a commit that declares the version it names.
 */

import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const BUMPS = new Set(["major", "minor", "patch"]);
const EXACT = /^\d+\.\d+\.\d+$/;
const POLL_INTERVAL_MS = 20_000;
const MERGE_TIMEOUT_MS = 30 * 60_000;

const target = process.argv[2];
if (!target || (!BUMPS.has(target) && !EXACT.test(target))) {
  process.stderr.write("Usage: node scripts/release.mjs <major|minor|patch|x.y.z>\n");
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

async function writeVersion(version) {
  for (const path of ["package.json", "package-lock.json"]) {
    const source = await readFile(path, "utf8");
    const updated = source.replaceAll(`"version": "${current}"`, `"version": "${version}"`);
    if (updated === source) throw new Error(`${path} does not declare version ${current}`);
    await writeFile(path, updated, "utf8");
  }
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

log(`releasing ${name}@${version} from ${current}`);

if (current !== version) {
  await landVersion(version, `chore(release): ${version}`);
  current = version;
}

const tag = `v${version}`;
if (git(["tag", "--list", tag]) !== "" || git(["ls-remote", "--tags", "origin", tag]) !== "") {
  throw new Error(`${tag} already exists; a release tag is never moved`);
}
git(["tag", tag, "origin/develop"]);
git(["push", "origin", tag]);
log(`pushed ${tag}; the Release workflow publishes it to npm latest and records the GitHub Release`);

const opening = `${nextVersion(version, "patch")}-dev.0`;
await landVersion(opening, `chore(release): open ${opening}`);
log(`develop is open at ${opening}; previews resume on the next push`);
