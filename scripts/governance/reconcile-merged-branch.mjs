import { appendFile, readFile } from "node:fs/promises";
import { classifyMergedBranchCleanup, decideMergedBranchCleanup } from "./merged-branch-cleanup.mjs";

const token = process.env.GITHUB_TOKEN;
const eventPath = process.env.GITHUB_EVENT_PATH;
const repository = process.env.GITHUB_REPOSITORY;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
if (!token || !eventPath || !repository) throw new Error("GitHub event, repository, and token are required");

const event = JSON.parse(await readFile(eventPath, "utf8"));
const pull = event.pull_request;
const eligibility = classifyMergedBranchCleanup(pull, repository);
if (eligibility.disposition !== "eligible") {
  await report(eligibility);
} else {
  const live = await loadLiveBranch(eligibility.ref);
  const decision = decideMergedBranchCleanup(eligibility, live);
  if (decision.disposition !== "delete") {
    await report(decision);
  } else {
    const encoded = encodeURIComponent(decision.ref);
    await request(`/repos/${repository}/git/refs/heads/${encoded}`, { method: "DELETE", expected: [204] });
    const verification = await request(`/repos/${repository}/git/ref/heads/${encoded}`, { expected: [200, 404] });
    if (verification.status !== 404) {
      const actual = verification.body?.object?.sha;
      await report({ ...decision, disposition: "failure", actualSha: actual ?? null, reason: "ref still exists after deletion" });
      throw new Error(`post-delete verification failed for PR #${decision.number} ref ${decision.ref}`);
    }
    await report({ ...decision, disposition: "deleted", actualSha: null });
  }
}

async function loadLiveBranch(ref) {
  const encoded = encodeURIComponent(ref);
  const [gitRef, branch] = await Promise.all([
    request(`/repos/${repository}/git/ref/heads/${encoded}`, { expected: [200, 404] }),
    request(`/repos/${repository}/branches/${encoded}`, { expected: [200, 404] }),
  ]);
  if (gitRef.status === 404 && branch.status === 404) return { kind: "absent" };
  if (gitRef.status === 404 || branch.status === 404) throw new Error(`inconsistent live metadata for ${ref}`);
  return { kind: "present", sha: gitRef.body?.object?.sha, protected: branch.body?.protected };
}

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
