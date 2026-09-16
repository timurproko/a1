import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const SHA = /^[a-f0-9]{40}$/u;
const REPOSITORY = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/u;

export function requireDevelopmentValidation(value) {
  requireResult(value.changesResult, "change classification");
  if (!/^[0-9a-f]{40}$/u.test(value.selectedHead ?? "") || value.selectedHead !== value.expectedHead) throw new Error("validation selection is stale or has an invalid head");
  if (value.acceptancePhase === "true") {
    if (value.acceptanceOnly !== "false") throw new Error("delivery Acceptance cannot use the legacy acceptance-only route");
    requireResult(value.acceptanceResult, "acceptance record validation");
    if (value.deliveryCandidate !== "true") throw new Error("trusted delivery candidate validation is missing");
    requireGenericLanesSkipped(value);
    return { mode: "delivery-acceptance" };
  }
  if (value.acceptancePhase !== "false") throw new Error("Acceptance phase routing result is missing");
  if (value.acceptanceOnly === "true") {
    requireResult(value.acceptanceResult, "acceptance record validation");
    if (value.acceptanceCandidate !== "true") throw new Error("trusted acceptance candidate validation is missing");
    requireGenericLanesSkipped(value);
    return { mode: "acceptance" };
  }
  if (value.acceptanceOnly !== "false") throw new Error("acceptance-only routing result is missing");
  if (value.namingRequired === "true") {
    requireResult(value.namingResult, "internal naming validation");
    if (value.namingHead !== value.expectedHead) throw new Error("naming validation result is stale or missing its head");
  } else if (value.namingRequired === "false") requireSkipped(value.namingResult, "internal naming validation");
  else throw new Error("naming validation selection is missing");
  if (value.docsOnly === "true") {
    requireResult(value.docsResult, "documentation governance");
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.modularResult, "modular validation");
    requireSkipped(value.renderingResult, "rendering validation");
    return { mode: "docs", openspec: value.openspecTouched === "true" };
  }
  if (value.versionOnly === "true") {
    requireSkipped(value.documentationResult, "changed-file documentation");
    requireSkipped(value.modularResult, "modular validation");
    requireSkipped(value.renderingResult, "rendering validation");
    return { mode: "version" };
  }
  requireResult(value.modularResult, "modular validation");
  if (value.documentationRequired === "true") requireResult(value.documentationResult, "changed-file documentation");
  else requireSkipped(value.documentationResult, "changed-file documentation");
  if (value.renderingTier === "none") requireSkipped(value.renderingResult, "rendering validation");
  else if (value.renderingTier === "smoke" || value.renderingTier === "full") requireResult(value.renderingResult, "rendering validation");
  else throw new Error(`unknown rendering tier: ${value.renderingTier}`);
  return { mode: "code", renderingTier: value.renderingTier, documentationRequired: value.documentationRequired === "true" };
}

function requireGenericLanesSkipped(value) {
  requireSkipped(value.docsResult, "documentation governance");
  requireSkipped(value.namingResult, "internal naming validation");
  requireSkipped(value.documentationResult, "changed-file documentation");
  requireSkipped(value.modularResult, "modular validation");
  requireSkipped(value.renderingResult, "rendering validation");
}

export async function requirePriorImplementationValidation(value) {
  if (!REPOSITORY.test(value.repository ?? "") || !Number.isSafeInteger(value.pullNumber) || value.pullNumber < 1
    || !SHA.test(value.head ?? "") || !Number.isSafeInteger(value.currentRunId) || value.currentRunId < 1
    || typeof value.request !== "function") throw new Error("prior Implementation validation identity is invalid");
  const prefix = `/repos/${value.repository}`;
  const runs = await collectPages(value.request,
    `${prefix}/actions/workflows/ci.yml/runs?event=pull_request&head_sha=${value.head}`, "workflow_runs");
  const candidates = runs.filter(run => run.id !== value.currentRunId && run.head_sha === value.head
    && run.event === "pull_request" && run.path === ".github/workflows/ci.yml"
    && run.head_repository?.full_name === value.repository && Array.isArray(run.pull_requests)
    && run.pull_requests.some(pull => pull.number === value.pullNumber && pull.head?.sha === value.head))
    .sort((left, right) => (right.run_number ?? 0) - (left.run_number ?? 0) || (right.run_attempt ?? 0) - (left.run_attempt ?? 0));
  for (const run of candidates) {
    if (!Number.isSafeInteger(run.id)) throw new Error("prior Implementation workflow run identity is invalid");
    const jobs = await collectPages(value.request, `${prefix}/actions/runs/${run.id}/jobs?filter=latest`, "jobs");
    const authority = jobs.filter(job => job.name === "Implementation validation complete");
    if (authority.length === 0) continue;
    if (authority.length !== 1) throw new Error("prior Implementation validation authority is ambiguous");
    const [job] = authority;
    if (run.status !== "completed" || run.conclusion !== "success"
      || job.status !== "completed" || job.conclusion !== "success") {
      throw new Error("latest exact-head Implementation validation did not succeed");
    }
    return { runId: run.id, attempt: run.run_attempt, jobId: job.id, head: value.head };
  }
  throw new Error("successful prior exact-head Implementation validation is missing");
}

async function collectPages(request, path, field) {
  const values = [];
  for (let page = 1; page <= 10; page += 1) {
    const result = await request(`${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`);
    const batch = result?.[field];
    if (!Array.isArray(batch)) throw new Error(`GitHub ${field} response is invalid`);
    values.push(...batch);
    if (batch.length < 100 || Number.isSafeInteger(result.total_count) && values.length >= result.total_count) return values;
  }
  throw new Error(`GitHub ${field} response exceeded the bounded page limit`);
}

function requireResult(result, label) {
  if (result !== "success") throw new Error(`${label} must succeed, received ${result ?? "missing"}`);
}

function requireSkipped(result, label) {
  if (result !== "skipped") throw new Error(`${label} must be skipped, received ${result ?? "missing"}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === "--prior-implementation") {
    const token = process.env.GITHUB_TOKEN;
    const apiUrl = process.env.GITHUB_API_URL ?? "https://api.github.com";
    if (!token) throw new Error("GITHUB_TOKEN is required");
    const result = await requirePriorImplementationValidation({
      repository: process.env.GITHUB_REPOSITORY,
      pullNumber: Number(process.env.IMPLEMENTATION_PR_NUMBER),
      head: process.env.IMPLEMENTATION_HEAD,
      currentRunId: Number(process.env.CURRENT_RUN_ID),
      request: async path => {
        const response = await fetch(`${apiUrl}${path}`, { headers: {
          accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28",
        } });
        if (!response.ok) throw new Error(`GitHub prior Implementation validation request failed (${response.status})`);
        return await response.json();
      },
    });
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } else {
    const value = Object.fromEntries(Object.entries({
      acceptanceOnly: "ACCEPTANCE_ONLY",
      acceptancePhase: "ACCEPTANCE_PHASE",
      acceptanceCandidate: "ACCEPTANCE_CANDIDATE",
      deliveryCandidate: "DELIVERY_CANDIDATE",
      acceptanceResult: "ACCEPTANCE_RESULT",
      changesResult: "CHANGES_RESULT",
      docsResult: "DOCS_RESULT",
      namingResult: "NAMING_RESULT",
      namingRequired: "NAMING_REQUIRED",
      namingHead: "NAMING_HEAD",
      documentationResult: "DOCUMENTATION_RESULT",
      modularResult: "MODULAR_RESULT",
      renderingResult: "RENDERING_RESULT",
      docsOnly: "DOCS_ONLY",
      versionOnly: "VERSION_ONLY",
      openspecTouched: "OPENSPEC_TOUCHED",
      documentationRequired: "DOCUMENTATION_REQUIRED",
      renderingTier: "RENDERING_TIER",
      selectedHead: "SELECTED_HEAD",
      expectedHead: "EXPECTED_HEAD",
    }).map(([key, environment]) => [key, process.env[environment]]));
    process.stdout.write(`${JSON.stringify(requireDevelopmentValidation(value))}\n`);
  }
}
