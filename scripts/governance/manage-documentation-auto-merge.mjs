import { appendFile, readFile } from "node:fs/promises";
import { classifyDocumentationAutoMerge, planDocumentationAutoMerge } from "./documentation-auto-merge.mjs";
import { executeMergedBranchCleanup } from "./execute-merged-branch-cleanup.mjs";

const token = process.env.GITHUB_TOKEN;
const eventPath = process.env.GITHUB_EVENT_PATH;
const repositoryName = process.env.GITHUB_REPOSITORY;
const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
const graphqlUrl = process.env.GITHUB_GRAPHQL_URL ?? "https://api.github.com/graphql";

if (!token || !eventPath || !repositoryName) throw new Error("GitHub event, repository, and token are required");

const event = JSON.parse(await readFile(eventPath, "utf8"));
const [owner, repository] = repositoryName.split("/");
if (!owner || !repository) throw new Error(`invalid GITHUB_REPOSITORY: ${repositoryName}`);

const context = event.workflow_run
  ? {
      validationComplete: event.workflow_run.name === "Development validation"
        && event.workflow_run.event === "pull_request",
      validationSucceeded: event.workflow_run.conclusion === "success",
      validatedHeadSha: event.workflow_run.head_sha,
      candidates: event.workflow_run.pull_requests ?? [],
    }
  : event.pull_request
    ? { validationComplete: false, validationSucceeded: false, validatedHeadSha: undefined, candidates: [event.pull_request] }
    : { validationComplete: false, validationSucceeded: false, validatedHeadSha: undefined, candidates: [] };

if (event.workflow_run && !context.validationComplete) {
  await summary("No pull-request Development validation run to process.");
} else {
  let numbers = [...new Set(context.candidates.map(candidate => candidate?.number).filter(Number.isSafeInteger))];
  if (numbers.length === 0 && Number.isSafeInteger(event.workflow_run?.id)) {
    const associated = await rest(`/repos/${owner}/${repository}/actions/runs/${event.workflow_run.id}/pull_requests`);
    if (!Array.isArray(associated)) throw new Error("workflow-run pull-request response was not an array");
    numbers = [...new Set(associated.map(candidate => candidate?.number).filter(Number.isSafeInteger))];
  }
  if (numbers.length === 0) {
    await summary("No pull request was associated with this event; auto-merge remained unchanged.");
  }
  for (const number of numbers) await processPullRequest(number, context);
}

async function processPullRequest(number, run) {
  let pull = await rest(`/repos/${owner}/${repository}/pulls/${number}`);
  if (pull.state !== "open") {
    if (pull.merged === true) return await reconcileDocumentationBranch(pull);
    return await summary(`PR #${number}: closed without merge; no action.`);
  }

  let files;
  try {
    files = await changedFiles(number);
  } catch (error) {
    await disableIfArmed(pull, `classification failed: ${describe(error)}`);
    throw error;
  }
  const classification = classifyDocumentationAutoMerge(files);
  const sameRepository = pull.head?.repo?.full_name === repositoryName;
  const trustedEligible = classification.eligible && sameRepository && !pull.draft && pull.base?.ref === "develop";

  if (!trustedEligible) {
    const reason = classification.eligible
      ? !sameRepository
        ? "the head branch is not in the trusted repository"
        : pull.draft
          ? "the pull request is a draft"
          : `the base branch is ${pull.base?.ref ?? "unknown"}, not develop`
      : classification.reason;
    await disableIfArmed(pull, reason);
    return await summary(`PR #${number}: auto-merge not eligible — ${reason}.`);
  }

  const validationMatchesHead = run.validationComplete && run.validatedHeadSha === pull.head?.sha;
  const validation = validationMatchesHead
    ? run.validationSucceeded ? "success" : "failure"
    : "pending";
  if (validation === "success" && pull.auto_merge) {
    pull = await awaitAutomaticIntegration(number, pull);
    if (pull.state !== "open") {
      if (pull.merged === true) return await reconcileDocumentationBranch(pull);
      return await summary(`PR #${number}: closed without merge while awaiting automatic integration; no branch mutation.`);
    }
    if (pull.head?.sha !== run.validatedHeadSha) {
      return await summary(`PR #${number}: head changed while awaiting automatic integration; no branch mutation.`);
    }
  }

  const action = planDocumentationAutoMerge({
    validation,
    autoMergeArmed: Boolean(pull.auto_merge),
    mergeableState: pull.mergeable_state,
  });

  if (action === "unchanged") {
    return await summary(`PR #${number}: eligible and squash auto-merge is already armed.`);
  }
  if (action === "wait") {
    return await summary(`PR #${number}: eligible but current-head Development validation failed; auto-merge remains unchanged.`);
  }
  if (action === "merge") {
    const result = await rest(`/repos/${owner}/${repository}/pulls/${number}/merge`, {
      method: "PUT",
      body: { sha: pull.head.sha, merge_method: "squash" },
    });
    if (result?.merged !== true) throw new Error(`GitHub did not merge eligible clean PR #${number}: ${JSON.stringify(result)}`);
    await summary(`PR #${number}: current head passed validation and is clean; squash-merged with expected head SHA.`);
    return await reconcileDocumentationBranch({ ...pull, state: "closed", merged: true, merged_at: new Date().toISOString() });
  }

  await graph(`mutation EnableDocumentationAutoMerge($pullRequestId: ID!) {
    enablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId, mergeMethod: SQUASH }) {
      pullRequest { number }
    }
  }`, { pullRequestId: pull.node_id });
  await summary(`PR #${number}: exact documentation allowlist; squash auto-merge armed behind required validation.`);
}

async function awaitAutomaticIntegration(number, initial) {
  const expectedSha = initial.head?.sha;
  let pull = initial;
  const attempts = Number(process.env.A1_AUTO_MERGE_POLL_ATTEMPTS ?? 30);
  const delayMs = Number(process.env.A1_AUTO_MERGE_POLL_MS ?? 2000);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (pull.state !== "open" || pull.head?.sha !== expectedSha) return pull;
    if (pull.mergeable_state === "clean") {
      try {
        const result = await rest(`/repos/${owner}/${repository}/pulls/${number}/merge`, {
          method: "PUT",
          body: { sha: expectedSha, merge_method: "squash" },
        });
        if (result?.merged === true) return { ...pull, state: "closed", merged: true, merged_at: new Date().toISOString() };
      } catch (error) {
        pull = await rest(`/repos/${owner}/${repository}/pulls/${number}`);
        if (pull.merged === true) return pull;
        throw error;
      }
    }
    if (delayMs > 0) await new Promise(resolve => setTimeout(resolve, delayMs));
    pull = await rest(`/repos/${owner}/${repository}/pulls/${number}`);
  }
  return pull;
}

async function reconcileDocumentationBranch(pull) {
  const decision = await executeMergedBranchCleanup({ pull, repository: repositoryName, request });
  await summary(`PR #${pull.number}: documentation branch cleanup ${JSON.stringify({
    disposition: decision.disposition,
    ref: decision.ref ?? null,
    expectedSha: decision.expectedSha ?? null,
    actualSha: decision.actualSha ?? null,
    reason: decision.reason ?? null,
  })}.`);
  if (decision.disposition === "failure") throw new Error(`post-delete verification failed for PR #${pull.number}`);
}

async function changedFiles(number) {
  const files = [];
  for (let page = 1; ; page += 1) {
    if (page > 30) throw new Error("changed-file response exceeded GitHub's reviewable limit");
    const batch = await rest(`/repos/${owner}/${repository}/pulls/${number}/files?per_page=100&page=${page}`);
    if (!Array.isArray(batch)) throw new Error("changed-file response was not an array");
    files.push(...batch);
    if (batch.length < 100) return files;
  }
}

async function disableIfArmed(pull, reason) {
  if (!pull.auto_merge) return;
  await graph(`mutation DisableIneligibleAutoMerge($pullRequestId: ID!) {
    disablePullRequestAutoMerge(input: { pullRequestId: $pullRequestId }) {
      pullRequest { number }
    }
  }`, { pullRequestId: pull.node_id });
  await summary(`PR #${pull.number}: disabled auto-merge — ${reason}.`);
}

async function rest(path, options = {}) {
  return (await request(path, { ...options, expected: options.expected ?? [200] })).body;
}

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    method: options.method ?? "GET",
    headers: options.body ? { ...headers(), "content-type": "application/json" } : headers(),
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const text = await response.text();
  const expected = options.expected ?? [200];
  if (!expected.includes(response.status)) throw new Error(`GitHub REST ${response.status}: ${text.slice(0, 300)}`);
  return { status: response.status, body: text ? JSON.parse(text) : undefined };
}

async function graph(query, variables) {
  const response = await fetch(graphqlUrl, {
    method: "POST",
    headers: { ...headers(), "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const body = await response.json();
  if (!response.ok || body.errors?.length) throw new Error(`GitHub GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
  return body.data;
}

function headers() {
  return {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "x-github-api-version": "2022-11-28",
  };
}

async function summary(message) {
  console.log(message);
  if (process.env.GITHUB_STEP_SUMMARY) await appendFile(process.env.GITHUB_STEP_SUMMARY, `- ${message}\n`);
}

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}
