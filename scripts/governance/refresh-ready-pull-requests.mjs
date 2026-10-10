import { appendFile, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { refreshReadyPullRequests } from "./ready-pull-request-refresh.mjs";

// Security: only the event-producing App token may update branches; GITHUB_TOKEN is never a fallback because its pushes start no CI.
const token = process.env.BRANCH_REFRESH_TOKEN;
const repository = process.env.GITHUB_REPOSITORY;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
if (!token || !repository) throw new Error("the branch-refresh App token and GitHub repository are required");
const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const definition = JSON.parse(await readFile(resolve(root, "config/github-repository-governance.json"), "utf8"));
if (repository !== definition.repository) throw new Error(`repository ${repository} is not the governed repository`);

let results;
try {
  results = await refreshReadyPullRequests({ repository, request });
} catch (error) {
  await report(`Ready pull-request refresh failed before completing the pass: ${error?.message ?? error}`);
  throw error;
}
if (results.length === 0) await report("Ready pull-request refresh: no open pull requests target develop.");
for (const result of results) {
  const evidence = {
    disposition: result.disposition,
    pullRequest: result.number ?? null,
    headSha: result.headSha ?? null,
    targetSha: result.targetSha ?? null,
    reason: result.reason ?? null,
  };
  await report(`Ready pull-request refresh: ${JSON.stringify(evidence)}`);
}
const failed = results.filter(result => result.disposition === "failed");
if (failed.length > 0) throw new Error(`branch refresh failed for ${failed.map(result => `#${result.number ?? "unknown"}`).join(", ")}`);

async function request(path, { method = "GET", body, expected = [200] } = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method,
    redirect: "error",
    signal: AbortSignal.timeout(20_000),
    headers: {
      accept: "application/vnd.github+json",
      authorization: `Bearer ${token}`,
      "x-github-api-version": "2022-11-28",
      "user-agent": "a1-ready-pull-request-refresh",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  const text = await response.text();
  if (!expected.includes(response.status)) {
    const error = new Error(`GitHub REST ${method} ${path} returned ${response.status}: ${text.slice(0, 240)}`);
    error.status = response.status;
    throw error;
  }
  try {
    return { status: response.status, body: text ? JSON.parse(text) : undefined };
  } catch {
    throw new Error(`GitHub REST ${method} ${path} returned malformed JSON`);
  }
}

async function report(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `- ${message}\n`);
}
