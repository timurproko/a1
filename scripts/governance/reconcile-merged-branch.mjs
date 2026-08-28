import { appendFile, readFile } from "node:fs/promises";
import { executeMergedBranchCleanup } from "./execute-merged-branch-cleanup.mjs";

const token = process.env.GITHUB_TOKEN;
const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
if (!token || !eventPath || !repository) throw new Error("GitHub event, repository, and token are required");

const event = JSON.parse(await readFile(eventPath, "utf8"));
const decision = await executeMergedBranchCleanup({ pull: event.pull_request, repository, request });
await report(decision);
if (decision.disposition === "failure") throw new Error(`post-delete verification failed for PR #${decision.number} ref ${decision.ref}`);

async function request(path, { method = "GET", expected = [200] } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "a1-merged-branch-cleanup",
    },
  });
  const text = await response.text();
  if (!expected.includes(response.status)) {
    throw new Error(`GitHub REST ${method} ${path} returned ${response.status}: ${text.slice(0, 240)}`);
  }
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

async function report(decision) {
  const evidence = {
    disposition: decision.disposition,
    pullRequest: decision.number ?? null,
    ref: decision.ref ?? null,
    expectedSha: decision.expectedSha ?? null,
    actualSha: decision.actualSha ?? null,
    reason: decision.reason ?? null,
  };
  const message = `Merged-branch cleanup: ${JSON.stringify(evidence)}`;
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `- ${message}\n`);
}
