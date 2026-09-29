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

const MAX_FAILURE_LINES = 10;

/** Turn a failed run into the failed job names and their recorded failure messages. */
export function describePublicationFailure(runId, options = {}) {
  const execute = options.run ?? run;
  const repository = options.repository ?? repositoryName();
  const jobs = JSON.parse(execute("gh", [
    "api", `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
    "--jq", "[.jobs[] | {id: .id, name: .name, conclusion: .conclusion}]",
  ]));
  const failed = jobs.filter(job => job.conclusion === "failure");
  const lines = [];
  for (const job of failed) {
    let annotations = [];
    try {
      annotations = JSON.parse(execute("gh", [
        "api", `repos/${repository}/check-runs/${job.id}/annotations`,
        "--jq", '[.[] | select(.annotation_level == "failure") | .message]',
      ]));
    } catch {
      annotations = [];
    }
    for (const message of annotations) {
      const text = String(message ?? "").split("\n")[0].trim();
      // Rationale: the generic exit-code annotation restates that the step failed without
      // saying why, so it is dropped in favour of the assertion or error that preceded it.
      if (!text || /^Process completed with exit code \d+\.?$/.test(text)) continue;
      const line = `${job.name}: ${text}`;
      if (!lines.includes(line)) lines.push(line);
      if (lines.length >= MAX_FAILURE_LINES) break;
    }
    if (lines.length >= MAX_FAILURE_LINES) break;
  }
  const names = failed.map(job => job.name).join(", ") || "no job reported failure";
  return `publication run ${runId} failed in ${names}${lines.length > 0 ? `\n  ${lines.join("\n  ")}` : ""}`;
}

export async function dispatchPublication(channel, source, version, options = {}) {
  const execute = options.run ?? run;
  if (channel !== "develop") throw new Error("stable publication is staged only after the release command observes Save draft");
  const write = options.write ?? (text => process.stdout.write(text));
  const wait = options.sleep ?? sleep;
  execute("gh", ["auth", "status"], { stdio: "inherit" });
  const requestId = options.requestId ?? randomUUID();
  execute("gh", [
    "workflow", "run", "develop.yml", "--ref", "develop",
    "-f", `source_sha=${source}`,
    "-f", `request_id=${requestId}`,
  ], { stdio: "inherit" });

  const deadline = Date.now() + RUN_APPEAR_TIMEOUT_MS;
  let runId;
  while (Date.now() < deadline) {
    const runs = JSON.parse(execute("gh", [
      "run", "list", "--workflow", "develop.yml", "--event", "workflow_dispatch",
      "--json", "databaseId,displayTitle", "--limit", "50",
    ]));
    runId = runs.find(entry => entry.displayTitle?.includes(requestId))?.databaseId;
    if (runId !== undefined) break;
    await wait(POLL_INTERVAL_MS);
  }
  if (runId === undefined) throw new Error(`publication request ${requestId} did not appear in GitHub Actions within 5 minutes`);

  const url = execute("gh", ["run", "view", String(runId), "--json", "url", "--jq", ".url"]);
  write(`[publication] workflow run ${runId} is responsible for ${version}\n[publication] ${url}\n`);
  try {
    execute("gh", ["run", "watch", String(runId), "--exit-status"], { stdio: "inherit" });
  } catch {
    throw new Error(describePublicationFailure(runId, { run: execute, repository: options.repository }));
  }
  return runId;
}

/** Dispatches reviewed stable staging without making selectors into authority. */
export async function dispatchStableStaging(candidate, options = {}) {
  const { repository, releaseId, source, version, reviewedUpdatedAt } = candidate ?? {};
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/u.test(repository ?? "")
    || !Number.isSafeInteger(releaseId) || releaseId < 1 || !/^[a-f0-9]{40}$/u.test(source ?? "")
    || !/^\d+\.\d+\.\d+$/u.test(version ?? "") || Number.isNaN(Date.parse(reviewedUpdatedAt ?? ""))) {
    throw new Error("stable staging candidate identity is invalid");
  }
  const execute = options.run ?? run;
  const write = options.write ?? (text => process.stdout.write(text));
  const wait = options.sleep ?? sleep;
  const requestId = options.requestId ?? randomUUID();
  execute("gh", ["auth", "status"], { stdio: "inherit" });
  const actor = execute("gh", ["api", "user", "--jq", ".login"]);
  if (!/^[A-Za-z0-9-]+$/u.test(actor)) throw new Error("authenticated GitHub user identity is invalid");
  execute("gh", [
    "api", "-X", "POST", `repos/${repository}/dispatches`,
    "-f", "event_type=a1-stable-release-reviewed",
    "-f", `client_payload[request_id]=${requestId}`,
    "-F", `client_payload[release_id]=${releaseId}`,
    "-f", `client_payload[source]=${source}`,
    "-f", `client_payload[reviewed_updated_at]=${reviewedUpdatedAt}`,
  ]);

  const deadline = Date.now() + RUN_APPEAR_TIMEOUT_MS;
  let runId;
  while (Date.now() < deadline) {
    const runs = JSON.parse(execute("gh", [
      "run", "list", "--workflow", "approve-release.yml", "--event", "repository_dispatch",
      "--json", "databaseId,displayTitle", "--limit", "50",
    ]));
    runId = runs.find(entry => entry.displayTitle === `Stage stable release ${requestId}`)?.databaseId;
    if (runId !== undefined) break;
    await wait(POLL_INTERVAL_MS);
  }
  if (runId === undefined) throw new Error(`stable staging request ${requestId} did not appear in GitHub Actions within 5 minutes`);

  const workflowRun = JSON.parse(execute("gh", ["api", `repos/${repository}/actions/runs/${runId}`]));
  if (workflowRun.id !== runId || workflowRun.event !== "repository_dispatch"
    || workflowRun.path !== ".github/workflows/approve-release.yml" || workflowRun.head_branch !== "develop"
    || workflowRun.head_sha !== source || workflowRun.actor?.login !== actor) {
    throw new Error(`stable staging run ${runId} does not match the authenticated default-branch request`);
  }
  const url = workflowRun.html_url;
  if (typeof url !== "string" || !url.startsWith("https://")) throw new Error(`stable staging run ${runId} has no valid URL`);
  write(`[release] trusted staging run ${runId} is responsible for ${version}\n[release] ${url}\n`);
  try {
    execute("gh", ["run", "watch", String(runId), "--exit-status"], { stdio: "inherit" });
  } catch {
    throw new Error(describePublicationFailure(runId, { run: execute, repository }));
  }
  return runId;
}

export async function localPackageIdentity() {
  const manifest = JSON.parse(await readFile("package.json", "utf8"));
  return { name: manifest.name, version: manifest.version };
}
