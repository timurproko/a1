import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

export async function loadImpactManifest(repository = process.cwd()) {
  const manifest = JSON.parse(await readFile(resolve(repository, "config", "validation-impact.json"), "utf8"));
  if (manifest.schema !== "a1-validation-impact-v1" || !Array.isArray(manifest.mandatory) || !Array.isArray(manifest.rules)) {
    throw new Error("invalid validation impact manifest");
  }
  return manifest;
}

export async function selectImpactFromChanges(changes, options = {}) {
  const manifest = options.manifest ?? await loadImpactManifest(options.repository);
  validateChanges(changes);
  const selected = new Set(manifest.mandatory);
  const owners = new Set();
  const changedTests = new Set();
  const reasons = [];
  const fallbacks = [];
  let packageSensitive = false;
  let full = options.full === true;

  if (changes.length === 0) fallbacks.push("no-changed-paths");
  for (const change of changes) {
    const pathRules = matchingRules(manifest, change.path);
    const previousRules = change.previousPath ? matchingRules(manifest, change.previousPath) : [];
    if (pathRules.length === 0) fallbacks.push(`unmapped:${change.path}`);
    if (change.status === "D") fallbacks.push(`deleted:${change.path}`);
    if (change.status === "R" && !sameRuleSet(pathRules, previousRules)) fallbacks.push(`unsafe-rename:${change.previousPath}->${change.path}`);

    const scopes = new Set();
    for (const rule of pathRules) {
      owners.add(rule.owner);
      for (const scope of rule.scopes) {
        selected.add(scope);
        scopes.add(scope);
      }
      if (rule.full) full = true;
      if (rule.packageSensitive) packageSensitive = true;
      if (rule.selectChangedTests && change.path.endsWith(".test.ts")) changedTests.add(change.path);
    }
    reasons.push({
      path: change.path,
      status: change.status,
      ...(change.previousPath ? { previousPath: change.previousPath } : {}),
      rules: pathRules.map(rule => rule.id),
      scopes: [...scopes],
    });
  }

  if (packageSensitive) {
    selected.add("package-smoke");
    selected.add("package-install");
    selected.add("dependency-policy");
  }
  for (const requirement of options.required ?? []) {
    if (typeof requirement !== "string" || requirement.length === 0) throw new Error("required validation selection is invalid");
    selected.add(requirement);
  }
  if (fallbacks.length > 0) full = true;
  if (full) {
    selected.clear();
    selected.add("full-release");
  }

  return {
    schema: "a1-validation-impact-plan-v1",
    full,
    packageSensitive,
    selected: [...selected],
    owners: [...owners].sort(),
    changedTests: [...changedTests].sort(),
    changes,
    reasons,
    fallbacks,
  };
}

export async function selectGitImpact(options) {
  const repository = resolve(options.repository ?? process.cwd());
  const base = options.base;
  const head = options.head;
  if (!base || !head) return forcedFullPlan("missing-base-or-head", { base: base ?? null, head: head ?? null });

  const baseCheck = git(repository, ["cat-file", "-e", `${base}^{commit}`]);
  const headCheck = git(repository, ["cat-file", "-e", `${head}^{commit}`]);
  if (baseCheck.status !== 0 || headCheck.status !== 0) return forcedFullPlan("untrusted-base-or-head", { base, head });
  const ancestor = git(repository, ["merge-base", "--is-ancestor", base, head]);
  if (ancestor.status !== 0) return forcedFullPlan("base-is-not-head-ancestor", { base, head });
  const difference = git(repository, ["diff", "--name-status", "-z", "--find-renames", base, head]);
  if (difference.status !== 0) return forcedFullPlan("git-diff-failed", { base, head });

  try {
    const changes = parseNameStatus(difference.stdout);
    const plan = await selectImpactFromChanges(changes, { repository, full: options.full, required: options.required });
    return { ...plan, base, head };
  } catch (error) {
    return forcedFullPlan(`selector-error:${error instanceof Error ? error.message : String(error)}`, { base, head });
  }
}

export function parseNameStatus(output) {
  if (!output) return [];
  const fields = output.split("\0");
  if (fields.at(-1) === "") fields.pop();
  const changes = [];
  for (let index = 0; index < fields.length;) {
    const statusField = fields[index++];
    if (!statusField) throw new Error("missing Git status field");
    const status = statusField[0];
    if (status === "R" || status === "C") {
      const previousPath = fields[index++];
      const path = fields[index++];
      if (!previousPath || !path) throw new Error("incomplete Git rename record");
      changes.push({ status: "R", previousPath: normalizePath(previousPath), path: normalizePath(path) });
    } else {
      const path = fields[index++];
      if (!path) throw new Error("incomplete Git change record");
      changes.push({ status, path: normalizePath(path) });
    }
  }
  return changes;
}

export function formatImpactSummary(plan) {
  const lines = [
    "## Validation impact",
    "",
    `- Full validation: **${plan.full ? "yes" : "no"}**`,
    `- Package-sensitive: **${plan.packageSensitive ? "yes" : "no"}**`,
    `- Selected: ${plan.selected.map(value => `\`${value}\``).join(", ") || "none"}`,
    `- Owners: ${plan.owners.map(value => `\`${value}\``).join(", ") || "none"}`,
  ];
  if (plan.fallbacks.length > 0) lines.push(`- Fail-closed reasons: ${plan.fallbacks.map(value => `\`${value}\``).join(", ")}`);
  lines.push("", "| Status | Path | Rules | Scopes |", "| --- | --- | --- | --- |");
  for (const reason of plan.reasons) {
    const path = reason.previousPath ? `${reason.previousPath} → ${reason.path}` : reason.path;
    lines.push(`| ${reason.status} | \`${path}\` | ${reason.rules.join(", ") || "unmapped"} | ${reason.scopes.join(", ") || "mandatory only"} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function matchesImpactPattern(pattern, path) {
  const expression = pattern.split("/").map(segment => {
    if (segment === "**") return ".*";
    return segment.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", "[^/]*");
  }).join("/");
  return new RegExp(`^${expression}$`).test(path);
}

function matchingRules(manifest, path) {
  return manifest.rules.filter(rule => rule.patterns.some(pattern => matchesImpactPattern(pattern, path)));
}

function sameRuleSet(left, right) {
  return left.map(rule => rule.id).sort().join("\0") === right.map(rule => rule.id).sort().join("\0");
}

function validateChanges(changes) {
  if (!Array.isArray(changes)) throw new Error("changes must be an array");
  for (const change of changes) {
    if (!change || typeof change.path !== "string" || !/^[A-Z?]$/.test(change.status)) throw new Error("invalid change record");
  }
}

function forcedFullPlan(reason, metadata) {
  return {
    schema: "a1-validation-impact-plan-v1",
    full: true,
    packageSensitive: false,
    selected: ["full-release"],
    owners: [],
    changedTests: [],
    changes: [],
    reasons: [],
    fallbacks: [reason],
    ...metadata,
  };
}

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function git(repository, arguments_) {
  return spawnSync("git", arguments_, { cwd: repository, encoding: "utf8", windowsHide: true });
}
