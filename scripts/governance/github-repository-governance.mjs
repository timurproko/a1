import { readFile } from "node:fs/promises";
import { planRulesetChanges, validateRulesetDefinition } from "./github-rulesets.mjs";

const ROOT_KEYS = ["schema", "repository", "repositorySettings", "actions", "securityCapabilities", "environments", "protectedRefs", "rulesets", "workflows"];
const REPOSITORY_SETTING_KEYS = ["visibility", "default_branch", "allow_auto_merge", "delete_branch_on_merge", "allow_merge_commit", "allow_squash_merge", "allow_rebase_merge", "allow_update_branch", "use_squash_pr_title_as_default", "squash_merge_commit_title", "squash_merge_commit_message", "merge_commit_title", "merge_commit_message", "web_commit_signoff_required"];
const ACTION_KEYS = ["enabled", "allowed_actions", "sha_pinning_required", "selected_actions", "default_workflow_permissions", "can_approve_pull_request_reviews"];
const SECURITY_KEYS = ["secret_scanning", "secret_scanning_push_protection", "secret_scanning_non_provider_patterns", "secret_scanning_validity_checks", "dependabot_alerts", "dependabot_security_updates"];
const ENVIRONMENT_KEYS = ["name", "can_admins_bypass", "protection_rules", "deployment_branch_policy"];
const WORKFLOW_KEYS = ["name", "path", "state", "triggers", "permissions", "trustedSource", "authority", "concurrency", "environments", "artifactRetentionDays"];

export function validateRepositoryGovernanceDefinition(definition) {
  requireExactKeys(definition, ROOT_KEYS, "definition");
  if (definition.schema !== "a1-github-repository-governance-v1") throw new Error("repository governance schema is invalid");
  validateRulesetDefinition(definition);
  requireExactKeys(definition.repositorySettings, REPOSITORY_SETTING_KEYS, "repositorySettings");
  requireExactKeys(definition.actions, ACTION_KEYS, "actions");
  requireExactKeys(definition.securityCapabilities, SECURITY_KEYS, "securityCapabilities");
  for (const key of ["environments", "protectedRefs", "workflows"]) if (!Array.isArray(definition[key])) throw new Error(`${key} must be an array`);
  for (const environment of definition.environments) requireExactKeys(environment, ENVIRONMENT_KEYS, `environment ${environment?.name ?? "unknown"}`);
  const names = new Set();
  const paths = new Set();
  for (const workflow of definition.workflows) {
    requireExactKeys(workflow, WORKFLOW_KEYS, `workflow ${workflow?.path ?? "unknown"}`);
    if (!workflow.name || !workflow.path || names.has(workflow.name) || paths.has(workflow.path)) throw new Error("workflow names and paths must be unique non-empty strings");
    names.add(workflow.name);
    paths.add(workflow.path);
    for (const key of ["triggers", "permissions", "authority", "environments", "artifactRetentionDays"]) if (!Array.isArray(workflow[key])) throw new Error(`${workflow.path}.${key} must be an array`);
  }
  if (definition.workflows.length === 0) throw new Error("workflow inventory must not be empty");
  if (new Set(definition.environments.map(environment => environment.name)).size !== definition.environments.length) throw new Error("environment names must be unique");
  return definition;
}

export async function inspectLocalWorkflows(definition, root = ".") {
  const workflows = [];
  for (const expected of definition.workflows) {
    const source = await readFile(`${root}/${expected.path}`, "utf8");
    workflows.push(inspectWorkflowSource(expected.path, source));
  }
  return workflows;
}

export function inspectWorkflowSource(path, source) {
  const line = pattern => pattern.test(source);
  const triggers = [];
  if (line(/^  pull_request:\s*$/m)) triggers.push("pull_request");
  if (line(/^  pull_request_target:\s*$/m)) {
    triggers.push(line(/^\s+types: \[closed\]\s*$/m) ? "pull_request_target:closed" : "pull_request_target");
  }
  if (line(/^  workflow_run:\s*$/m)) triggers.push("workflow_run");
  if (line(/^  workflow_dispatch:\s*/m)) triggers.push("workflow_dispatch");
  if (line(/^  schedule:\s*$/m)) triggers.push("schedule");
  if (line(/^  push:\s*$/m)) triggers.push("push");

  const permissions = [...new Set([...source.matchAll(/^\s+(contents|pull-requests|id-token):\s*(read|write)\s*$/gm)].map(match => `${match[1]}: ${match[2]}`))].sort();
  const retention = [...new Set([...source.matchAll(/^\s+retention-days:\s*(\d+)\s*$/gm)].map(match => Number(match[1])))].sort((a, b) => a - b);
  const environments = [...new Set([...source.matchAll(/^\s+environment:\s*([^\s#]+)\s*$/gm)].map(match => match[1]))].sort();
  const concurrency = /^\s+group:\s*([^\n$]+?)(?:\$\{\{|\s*$)/m.exec(source)?.[1]?.trim() ?? "";

  let trustedSource = "unknown";
  if (source.includes("ref: ${{ github.event.repository.default_branch }}")) trustedSource = "default-branch";
  else if (path.endsWith("ci.yml") && source.includes("github.event.pull_request.head.sha") && permissions.every(value => value.endsWith("read"))) trustedSource = "pull-request-head-read-only";
  else if (path.endsWith("full-regression.yml") && source.includes("ref: ${{ github.sha }}")) trustedSource = "dispatch-commit";
  else if (path.endsWith("release.yml") && source.includes("git/ref/heads/develop") && source.includes("ref: ${{ needs.source.outputs.sha }}")) trustedSource = "authoritative-develop";

  const authority = [];
  if (source.includes("Development validation required")) authority.push("Development validation required");
  if (source.includes("manage-documentation-auto-merge.mjs")) authority.push("documentation-auto-merge", "matching-merged-head-delete");
  if (source.includes('VALIDATION_SELECTION_JSON: \'["full-release"]\'')) authority.push("complete-regression");
  if (source.includes("reconcile-merged-branch.mjs")) authority.push("matching-merged-head-delete");
  if (source.includes('channel = "next"')) authority.push("npm-next");
  if (source.includes('channel = "latest"')) authority.push("npm-latest");
  if (source.includes("ref=refs/tags/")) authority.push("release-tag");
  if (source.includes("gh release create")) authority.push("github-release");
  if (source.includes("git/refs/heads/master")) authority.push("master-fast-forward");

  const name = /^name:\s*(.+)$/m.exec(source)?.[1]?.trim() ?? "";
  return { name, path, state: "active", triggers: triggers.sort(), permissions, trustedSource, authority: authority.sort(), concurrency, environments, artifactRetentionDays: retention };
}

export function compareRepositoryGovernance(definition, live) {
  validateRepositoryGovernanceDefinition(definition);
  const differences = [];
  compareExact(definition.repositorySettings, live.repositorySettings, "repositorySettings", differences);
  compareExact(definition.actions, live.actions, "actions", differences);
  compareExact(definition.securityCapabilities, live.securityCapabilities, "securityCapabilities", differences);
  compareExact(sortNamed(definition.environments), sortNamed(live.environments), "environments", differences);
  compareExact([...definition.protectedRefs].sort(), [...(live.protectedRefs ?? [])].sort(), "protectedRefs", differences);
  compareExact(sortNamed(definition.workflows).map(canonicalWorkflow), sortNamed(live.workflows).map(canonicalWorkflow), "workflows", differences);

  const rulesetPlan = planRulesetChanges(definition, live.rulesets ?? []);
  for (const change of rulesetPlan.changes.filter(change => change.action !== "none")) {
    differences.push({ path: `rulesets.${change.name}`, expected: change.action === "undeclared" ? undefined : change.desired, actual: change.live, reason: change.action });
  }
  return {
    schema: "a1-github-repository-governance-report-v1",
    repository: definition.repository,
    mode: "read-only",
    mutationPerformed: false,
    matches: differences.length === 0,
    differences,
  };
}

function canonicalWorkflow(workflow) {
  return {
    ...workflow,
    triggers: [...workflow.triggers].sort(),
    permissions: [...workflow.permissions].sort(),
    authority: [...workflow.authority].sort(),
    environments: [...workflow.environments].sort(),
    artifactRetentionDays: [...workflow.artifactRetentionDays].sort((a, b) => a - b),
  };
}

function compareExact(expected, actual, path, differences) {
  if (Array.isArray(expected)) {
    if (!Array.isArray(actual)) return differences.push({ path, expected, actual, reason: "type" });
    const length = Math.max(expected.length, actual.length);
    for (let index = 0; index < length; index += 1) {
      if (index >= expected.length) differences.push({ path: `${path}[${index}]`, expected: undefined, actual: actual[index], reason: "unknown" });
      else if (index >= actual.length) differences.push({ path: `${path}[${index}]`, expected: expected[index], actual: undefined, reason: "omitted" });
      else compareExact(expected[index], actual[index], `${path}[${index}]`, differences);
    }
    return;
  }
  if (expected && typeof expected === "object") {
    if (!actual || typeof actual !== "object" || Array.isArray(actual)) return differences.push({ path, expected, actual, reason: "type" });
    for (const key of Object.keys(expected)) {
      if (!(key in actual)) differences.push({ path: `${path}.${key}`, expected: expected[key], actual: undefined, reason: "omitted" });
      else compareExact(expected[key], actual[key], `${path}.${key}`, differences);
    }
    for (const key of Object.keys(actual)) if (!(key in expected)) differences.push({ path: `${path}.${key}`, expected: undefined, actual: actual[key], reason: "unknown" });
    return;
  }
  if (!Object.is(expected, actual)) differences.push({ path, expected, actual, reason: "value" });
}

function sortNamed(values = []) {
  return [...values].sort((left, right) => (left.name ?? left.path).localeCompare(right.name ?? right.path));
}

function requireExactKeys(value, expected, path) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(`${path} must be an object`);
  const keys = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (JSON.stringify(keys) !== JSON.stringify(wanted)) {
    const omitted = wanted.filter(key => !keys.includes(key));
    const unknown = keys.filter(key => !wanted.includes(key));
    throw new Error(`${path} fields differ; omitted=${omitted.join(",") || "none"}; unknown=${unknown.join(",") || "none"}`);
  }
}
