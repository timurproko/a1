import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";

const CANDIDATE_WORKFLOW = "preview-candidate.yml";
const PUBLISH_WORKFLOW = "npm-publish.yml";
const CANDIDATE_CONFIRM = "build-uncertified-next-candidate";
const PUBLISH_CONFIRM = "publish-uncertified-next";
const POLL_INTERVAL_MS = 30_000;
const RUN_TIMEOUT_MS = 45 * 60_000;

function run(executable, args, options = {}) {
  return (execFileSync(executable, args, { encoding: "utf8", stdio: ["ignore", "pipe", "inherit"], ...options } ) ?? "").trim();
}
function gh(args) {
  return run("gh", args);
}
function ghJson(args) {
  return JSON.parse(gh(args));
}
function log(message) {
  process.stdout.write(`[release-next] ${message}\n`);
}

async function waitForRun(workflow, headSha, dispatchedAfter) {
  const deadline = Date.now() + RUN_TIMEOUT_MS;
  let runId;
  while (Date.now() < deadline) {
    const runs = ghJson(["run", "list", "--workflow", workflow, "--json", "databaseId,headSha,status,conclusion,createdAt", "--limit", "10"]);
    const match = runs.find(entry => entry.headSha === headSha && Date.parse(entry.createdAt) >= dispatchedAfter - 60_000);
    if (match) {
      runId = match.databaseId;
      if (match.status === "completed") {
        if (match.conclusion !== "success") throw new Error(`${workflow} run ${runId} concluded: ${match.conclusion}`);
        return runId;
      }
      log(`${workflow} run ${runId} is ${match.status}...`);
    } else {
      log(`waiting for ${workflow} run to appear...`);
    }
    await sleep(POLL_INTERVAL_MS);
  }
  throw new Error(`timed out waiting for ${workflow}${runId ? ` run ${runId}` : ""}`);
}

// 1. Require a clean develop checkout at the remote tip.
const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
if (branch !== "develop") throw new Error(`release runs from develop, not ${branch}`);
if (run("git", ["status", "--porcelain", "-uno"]) !== "") throw new Error("commit or stash tracked changes first");
run("git", ["fetch", "origin", "develop"], { stdio: ["ignore", "ignore", "inherit"] });
const head = run("git", ["rev-parse", "HEAD"]);
if (head !== run("git", ["rev-parse", "origin/develop"])) throw new Error("develop is not at the origin tip; pull or push first");

// 2. The version must be an unpublished -dev.N preview.
const manifest = JSON.parse(await readFile("package.json", "utf8"));
const { name, version } = manifest;
if (!/^\d+\.\d+\.\d+-dev\.\d+$/.test(version)) throw new Error(`${version} is not a -dev.N preview version`);
const registry = await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}/${version}`, { headers: { "cache-control": "no-cache" } });
if (registry.status !== 404) throw new Error(`${name}@${version} already exists on the registry (HTTP ${registry.status}); bump the version on develop first`);

// 3. Candidate: validate and pack the exact develop commit.
log(`building next candidate for ${name}@${version} at ${head}`);
let dispatchedAt = Date.now();
gh(["workflow", "run", CANDIDATE_WORKFLOW, "--ref", "develop", "-f", `source_commit=${head}`, "-f", `confirm_candidate=${CANDIDATE_CONFIRM}`]);
const candidateRunId = await waitForRun(CANDIDATE_WORKFLOW, head, dispatchedAt);
log(`candidate run ${candidateRunId} succeeded`);

// 4. Publish: upload the exact accepted candidate bytes.
dispatchedAt = Date.now();
gh(["workflow", "run", PUBLISH_WORKFLOW, "--ref", "develop", "-f", `candidate_run_id=${candidateRunId}`, "-f", `confirm_uncertified=${PUBLISH_CONFIRM}`]);
await waitForRun(PUBLISH_WORKFLOW, head, dispatchedAt);

// 5. Verify the registry serves the version under the next tag.
const metadata = await (await fetch(`https://registry.npmjs.org/${encodeURIComponent(name)}?verify=${head.slice(0, 8)}`, { headers: { "cache-control": "no-cache" } })).json();
if (metadata["dist-tags"]?.next !== version) throw new Error(`registry next tag is ${metadata["dist-tags"]?.next}, expected ${version}`);
log(`published ${name}@${version} to npm next`);
