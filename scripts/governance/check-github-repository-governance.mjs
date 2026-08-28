import { execFileSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { compareRepositoryGovernance, inspectLocalWorkflows, validateRepositoryGovernanceDefinition } from "./github-repository-governance.mjs";
import { planRulesetChanges } from "./github-rulesets.mjs";

const definitionPath = resolve(valueAfter("--definition") ?? "config/github-repository-governance.json");
const definition = validateRepositoryGovernanceDefinition(JSON.parse(await readFile(definitionPath, "utf8")));
const repository = valueAfter("--repository") ?? definition.repository;
if (repository !== definition.repository) throw new Error(`definition is bound to ${definition.repository}, not ${repository}`);
const api = createApi(repository, resolveToken());
let live = await loadLive(api, definition);
let report = compareRepositoryGovernance(definition, live);
report.api = { repository, fetchedAt: new Date().toISOString() };

if (process.argv.includes("--apply")) {
  if (valueAfter("--confirm") !== "apply-a1-github-governance") throw new Error("--apply requires --confirm apply-a1-github-governance");
  const mutablePrefixes = ["repositorySettings", "actions", "environments", "rulesets"];
  const unsupported = report.differences.filter(difference => !mutablePrefixes.some(prefix => difference.path === prefix || difference.path.startsWith(`${prefix}.`) || difference.path.startsWith(`${prefix}[`)));
  if (unsupported.length > 0) throw new Error(`reviewed drift requires code or an explicit policy decision: ${unsupported.map(value => value.path).join(", ")}`);
  const mutations = [];
  if (report.differences.some(value => value.path.startsWith("repositorySettings"))) {
    await api("", { method: "PATCH", body: definition.repositorySettings });
    mutations.push("repositorySettings");
  }
  if (report.differences.some(value => value.path.startsWith("actions"))) {
    await api("actions/permissions", { method: "PUT", body: {
      enabled: definition.actions.enabled,
      allowed_actions: definition.actions.allowed_actions,
      sha_pinning_required: definition.actions.sha_pinning_required,
    } });
    await api("actions/permissions/workflow", { method: "PUT", body: {
      default_workflow_permissions: definition.actions.default_workflow_permissions,
      can_approve_pull_request_reviews: definition.actions.can_approve_pull_request_reviews,
    } });
    mutations.push("actions");
  }
  if (report.differences.some(value => value.path.startsWith("environments"))) {
    for (const environment of definition.environments) await api(`environments/${encodeURIComponent(environment.name)}`, { method: "PUT", body: {
      wait_timer: 0,
      reviewers: [],
      can_admins_bypass: environment.can_admins_bypass,
      deployment_branch_policy: environment.deployment_branch_policy,
    } });
    mutations.push("environments");
  }
  const rulesetPlan = planRulesetChanges(definition, live.rulesets);
  for (const change of rulesetPlan.changes) {
    if (change.action === "none") continue;
    if (change.action === "undeclared") throw new Error(`undeclared live ruleset requires explicit removal decision: ${change.name}`);
    const path = change.action === "create" ? "rulesets" : `rulesets/${change.id}`;
    await api(path, { method: change.action === "create" ? "POST" : "PUT", body: change.desired });
    mutations.push(`ruleset:${change.name}`);
  }
  live = await loadLive(api, definition);
  const verification = compareRepositoryGovernance(definition, live);
  if (!verification.matches) throw new Error(`post-apply governance verification differs: ${verification.differences.map(value => value.path).join(", ")}`);
  report = { ...verification, mode: "apply", mutationPerformed: mutations.length > 0, mutations, api: { repository, fetchedAt: new Date().toISOString() } };
}

const output = valueAfter("--output");
if (output) {
  const path = resolve(output);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
}
if (process.argv.includes("--json") || !output) process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
else process.stdout.write(`GitHub repository governance ${report.mode}: ${report.matches ? "match" : `${report.differences.length} difference(s)`}; mutation=${report.mutationPerformed}\n`);
if (process.argv.includes("--check") && !report.matches) process.exitCode = 1;

async function loadLive(api, reviewed) {
  const repository = await api("");
  const actionPermissions = await api("actions/permissions");
  const workflowPermissions = await api("actions/permissions/workflow");
  let selectedActions = null;
  if (actionPermissions.allowed_actions === "selected") selectedActions = await api("actions/permissions/selected-actions");
  const environmentList = await api("environments");
  const environments = await Promise.all((environmentList.environments ?? []).map(environment => api(`environments/${encodeURIComponent(environment.name)}`)));
  const summaries = await api("rulesets?includes_parents=false");
  const rulesets = await Promise.all(summaries.map(summary => api(`rulesets/${summary.id}`)));
  const workflowList = await api("actions/workflows");
  const localWorkflows = await inspectLocalWorkflows(reviewed);
  const localByPath = new Map(localWorkflows.map(workflow => [workflow.path, workflow]));
  const workflows = (workflowList.workflows ?? []).map(workflow => {
    const local = localByPath.get(workflow.path);
    return local ? { ...local, name: workflow.name, state: workflow.state } : {
      name: workflow.name, path: workflow.path, state: workflow.state, triggers: [], permissions: [], trustedSource: "unknown", authority: [], concurrency: "", environments: [], artifactRetentionDays: [],
    };
  });
  for (const local of localWorkflows) if (!workflows.some(workflow => workflow.path === local.path)) workflows.push({ ...local, state: "missing" });

  const dependabotAlerts = await capability(api, "vulnerability-alerts");
  const automatedFixes = await capability(api, "automated-security-fixes", body => body?.enabled === true);
  const security = repository.security_and_analysis ?? {};
  return {
    repositorySettings: select(repository, Object.keys(reviewed.repositorySettings)),
    actions: {
      enabled: actionPermissions.enabled,
      allowed_actions: actionPermissions.allowed_actions,
      sha_pinning_required: actionPermissions.sha_pinning_required,
      selected_actions: selectedActions,
      default_workflow_permissions: workflowPermissions.default_workflow_permissions,
      can_approve_pull_request_reviews: workflowPermissions.can_approve_pull_request_reviews,
    },
    securityCapabilities: {
      secret_scanning: security.secret_scanning?.status ?? "unavailable",
      secret_scanning_push_protection: security.secret_scanning_push_protection?.status ?? "unavailable",
      secret_scanning_non_provider_patterns: security.secret_scanning_non_provider_patterns?.status ?? "unavailable",
      secret_scanning_validity_checks: security.secret_scanning_validity_checks?.status ?? "unavailable",
      dependabot_alerts: dependabotAlerts ? "enabled" : "disabled",
      dependabot_security_updates: automatedFixes ? "enabled" : "disabled",
    },
    environments: environments.map(environment => select(environment, ["name", "can_admins_bypass", "protection_rules", "deployment_branch_policy"])),
    protectedRefs: rulesets.flatMap(ruleset => ruleset.conditions?.ref_name?.include ?? []),
    rulesets,
    workflows,
  };
}

async function capability(api, path, interpret = () => true) {
  const response = await api(path, { expected: [200, 204, 404] });
  return response.status === 404 ? false : interpret(response.body);
}

function createApi(repository, token) {
  const base = `${process.env.GITHUB_API_URL ?? "https://api.github.com"}/repos/${repository}`;
  const headers = { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", "user-agent": "a1-repository-governance" };
  return async (path, options = {}) => {
    const response = await fetch(path ? `${base}/${path}` : base, {
      method: options.method ?? "GET",
      headers: { ...headers, ...(options.body ? { "content-type": "application/json" } : {}) },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const text = await response.text();
    if (options.expected) {
      if (!options.expected.includes(response.status)) throw new Error(`GitHub API ${options.method ?? "GET"} ${path} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
      return { status: response.status, body: text ? JSON.parse(text) : undefined };
    }
    if (!response.ok) throw new Error(`GitHub API ${options.method ?? "GET"} ${path} returned HTTP ${response.status}: ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : undefined;
  };
}

function select(value, keys) { return Object.fromEntries(keys.map(key => [key, value[key]])); }
function resolveToken() {
  const environment = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (environment) return environment;
  try { return execFileSync("gh", ["auth", "token"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim(); }
  catch { throw new Error("GitHub governance inspection requires GH_TOKEN, GITHUB_TOKEN, or authenticated gh"); }
}
function valueAfter(name) { const index = process.argv.indexOf(name); return index >= 0 ? process.argv[index + 1] : undefined; }
