import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const POLL_INTERVAL_MS = 5_000;
const RUN_APPEAR_TIMEOUT_MS = 5 * 60_000;

export function run(executable, args, options = {}) {
  return (execFileSync(executable, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...options }) ?? "").trim();
}

export function git(args, options = {}) { return run("git", args, options); }
export function gh(args, options = {}) { return run("gh", args, options); }

export function repositoryName() {
  return gh(["repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]);
}

export async function authoritativeDevelopHead() {
  git(["fetch", "origin", "develop"], { stdio: ["ignore", "ignore", "inherit"] });
  return git(["rev-parse", "origin/develop"]);
}

export async function resolveDevelopPreview(source, options = {}) {
  if (!/^[a-f0-9]{40}$/.test(source)) throw new Error(`develop source is not a full commit: ${source}`);
  const manifestText = options.manifestText ?? git(["show", `${source}:package.json`]);
  const manifest = JSON.parse(manifestText);
  const base = /^(\d+\.\d+\.\d+)(?:-dev(?:\.\d+)?)?$/.exec(manifest.version)?.[1];
  if (!base || manifest.version === base) throw new Error(`develop source declares ${manifest.version}; a development publication requires an open -dev version`);

  const repository = options.repository ?? repositoryName();
  const pullsText = options.pullsText ?? gh([
    "api", "-H", "Accept: application/vnd.github+json",
    `repos/${repository}/commits/${source}/pulls`,
  ]);
  const pulls = JSON.parse(pullsText);
  const matches = pulls.filter(pull => pull?.merged_at && pull?.base?.ref === "develop" && pull?.merge_commit_sha === source);
  if (matches.length !== 1 || !Number.isInteger(matches[0]?.number) || matches[0].number < 1) {
    throw new Error(`develop commit ${source} has ${matches.length} unique merged pull request associations; expected exactly one`);
  }
  const number = matches[0].number;
  return { source, pullRequest: number, version: `${base}-dev.${number}`, packageName: manifest.name };
}

export async function registryVersion(packageName, version, fetchImpl = fetch) {
  const response = await fetchImpl(`https://registry.npmjs.org/${encodeURIComponent(packageName)}/${version}`, {
    headers: { accept: "application/json", "cache-control": "no-cache" },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`npm registry returned HTTP ${response.status} for ${packageName}@${version}`);
  const manifest = await response.json();
  if (manifest.version !== version) throw new Error(`npm returned ${manifest.version ?? "no version"} for ${packageName}@${version}`);
  return manifest;
}

export async function dispatchPublication(channel, source, version) {
  gh(["auth", "status"], { stdio: "inherit" });
  const requestId = randomUUID();
  gh([
    "workflow", "run", "release.yml", "--ref", "develop",
    "-f", `channel=${channel}`,
    "-f", `source_sha=${source}`,
    "-f", `request_id=${requestId}`,
  ], { stdio: "inherit" });

  const deadline = Date.now() + RUN_APPEAR_TIMEOUT_MS;
  let runId;
  while (Date.now() < deadline) {
    const runs = JSON.parse(gh([
      "run", "list", "--workflow", "release.yml", "--event", "workflow_dispatch",
      "--json", "databaseId,displayTitle", "--limit", "50",
    ]));
    runId = runs.find(entry => entry.displayTitle?.includes(requestId))?.databaseId;
    if (runId !== undefined) break;
    await sleep(POLL_INTERVAL_MS);
  }
  if (runId === undefined) throw new Error(`publication request ${requestId} did not appear in GitHub Actions within 5 minutes`);

  process.stdout.write(`[publication] workflow run ${runId} is responsible for ${version}\n`);
  run("gh", ["run", "watch", String(runId), "--exit-status"], { stdio: "inherit" });
  return runId;
}

export async function localPackageIdentity() {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  return { name: manifest.name, version: manifest.version };
}
