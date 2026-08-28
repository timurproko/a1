const RULESET_SERVER_FIELDS = new Set([
  "id", "node_id", "source", "source_type", "current_user_can_bypass", "created_at", "updated_at", "_links",
]);
const RULESET_KEYS = ["name", "target", "enforcement", "bypass_actors", "conditions", "rules"];
const PULL_REQUEST_PARAMETER_KEYS = [
  "required_approving_review_count", "dismiss_stale_reviews_on_push", "required_reviewers",
  "require_code_owner_review", "require_last_push_approval", "required_review_thread_resolution",
  "require_extra_approval_for_unattributed_changes", "allowed_merge_methods",
];
const STATUS_PARAMETER_KEYS = ["strict_required_status_checks_policy", "do_not_enforce_on_create", "required_status_checks"];

export function validateRulesetDefinition(definition) {
  const rulesets = definition?.schema === "a1-github-repository-governance-v1" ? definition.rulesets : definition?.rulesets;
  const repository = definition?.repository;
  if (!/^[^/]+\/[^/]+$/.test(repository ?? "")) throw new Error("GitHub ruleset repository is invalid");
  if (!Array.isArray(rulesets) || rulesets.length !== 3) throw new Error("exactly two branch rulesets and one tag ruleset are required");
  const gated = new Map([["refs/heads/develop", "Development validation required"]]);
  const forwardOnly = new Set(["refs/heads/master"]);
  const tags = new Set(["refs/tags/v*"]);
  let branchRulesets = 0;
  let tagRulesets = 0;
  const names = new Set();
  for (const ruleset of rulesets) {
    requireExactKeys(ruleset, RULESET_KEYS, `ruleset ${ruleset?.name ?? "unknown"}`);
    requireExactKeys(ruleset.conditions, ["ref_name"], `${ruleset.name}.conditions`);
    requireExactKeys(ruleset.conditions.ref_name, ["include", "exclude"], `${ruleset.name}.conditions.ref_name`);
    if (typeof ruleset.name !== "string" || names.has(ruleset.name)) throw new Error("ruleset names must be unique non-empty strings");
    names.add(ruleset.name);
    if (ruleset.enforcement !== "active") throw new Error(`${ruleset.name} must be actively enforced`);
    if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length !== 0) throw new Error(`${ruleset.name} must not permit direct-push bypass actors`);
    const include = ruleset.conditions?.ref_name?.include;
    if (!Array.isArray(include) || include.length !== 1) throw new Error(`${ruleset.name} must target exactly one ref pattern`);
    if (!Array.isArray(ruleset.conditions?.ref_name?.exclude)) throw new Error(`${ruleset.name} must declare excluded ref patterns`);
    if (!Array.isArray(ruleset.rules) || new Set(ruleset.rules.map(rule => rule.type)).size !== ruleset.rules.length) throw new Error(`${ruleset.name} has missing or duplicate rules`);
    for (const rule of ruleset.rules) {
      if (rule.type === "pull_request") {
        requireExactKeys(rule, ["type", "parameters"], `${ruleset.name}.pull_request`);
        requireExactKeys(rule.parameters, PULL_REQUEST_PARAMETER_KEYS, `${ruleset.name}.pull_request.parameters`);
      } else if (rule.type === "required_status_checks") {
        requireExactKeys(rule, ["type", "parameters"], `${ruleset.name}.required_status_checks`);
        requireExactKeys(rule.parameters, STATUS_PARAMETER_KEYS, `${ruleset.name}.required_status_checks.parameters`);
        for (const check of rule.parameters.required_status_checks ?? []) requireExactKeys(check, ["context"], `${ruleset.name}.required_status_checks.context`);
      } else {
        requireExactKeys(rule, ["type"], `${ruleset.name}.${rule.type ?? "unknown"}`);
      }
    }
    const byType = new Map(ruleset.rules.map(rule => [rule.type, rule]));
    for (const type of ["deletion", "non_fast_forward"]) if (!byType.has(type)) throw new Error(`${ruleset.name} is missing ${type}`);

    if (ruleset.target === "tag") {
      tagRulesets += 1;
      if (!tags.has(include[0])) throw new Error(`${ruleset.name} targets an unexpected tag pattern`);
      continue;
    }
    if (ruleset.target !== "branch") throw new Error(`${ruleset.name} must target branches or tags`);
    branchRulesets += 1;
    if (forwardOnly.has(include[0])) {
      for (const type of ["pull_request", "required_status_checks"]) if (byType.has(type)) throw new Error(`${ruleset.name} must not gate a ref only the release writes`);
      continue;
    }
    if (!gated.has(include[0])) throw new Error(`${ruleset.name} targets an unexpected branch`);
    for (const type of ["pull_request", "required_status_checks"]) if (!byType.has(type)) throw new Error(`${ruleset.name} is missing ${type}`);
    const pull = byType.get("pull_request").parameters;
    for (const field of PULL_REQUEST_PARAMETER_KEYS) if (!(field in (pull ?? {}))) throw new Error(`${ruleset.name}.pull_request.parameters.${field} is omitted`);
    if (pull.required_approving_review_count !== 0 || pull.require_last_push_approval !== false || pull.required_review_thread_resolution !== true) throw new Error(`${ruleset.name} solo-maintainer pull-request policy is incomplete`);
    const status = byType.get("required_status_checks").parameters;
    const contexts = status.required_status_checks?.map(check => check.context);
    if (typeof status.strict_required_status_checks_policy !== "boolean" || status.do_not_enforce_on_create !== false || !contexts?.includes(gated.get(include[0]))) throw new Error(`${ruleset.name} required status is incomplete`);
  }
  if (branchRulesets !== 2 || tagRulesets !== 1) throw new Error("exactly two branch rulesets and one tag ruleset are required");
  return definition;
}

export function planRulesetChanges(definition, liveRulesets) {
  validateRulesetDefinition(definition);
  const desiredRulesets = definition.rulesets;
  const liveByName = new Map(liveRulesets.map(ruleset => [ruleset.name, ruleset]));
  const changes = desiredRulesets.map(desired => {
    const live = liveByName.get(desired.name);
    if (!live) return { name: desired.name, action: "create", desired };
    const normalizedLive = normalizeRuleset(live);
    const matches = JSON.stringify(normalizedLive) === JSON.stringify(normalizeRuleset(desired));
    return { name: desired.name, action: matches ? "none" : "update", id: live.id, desired, ...(matches ? {} : { live: normalizedLive }) };
  });
  for (const live of liveRulesets) {
    if (!desiredRulesets.some(desired => desired.name === live.name)) changes.push({ name: live.name, action: "undeclared", id: live.id, live: normalizeRuleset(live) });
  }
  return {
    schema: "a1-github-ruleset-plan-v2",
    repository: definition.repository,
    mode: "dry-run",
    mutationPerformed: false,
    changes,
    summary: {
      create: changes.filter(change => change.action === "create").length,
      update: changes.filter(change => change.action === "update").length,
      undeclared: changes.filter(change => change.action === "undeclared").length,
      unchanged: changes.filter(change => change.action === "none").length,
    },
  };
}

export function normalizeRuleset(ruleset) {
  const kept = Object.fromEntries(Object.entries(ruleset).filter(([key]) => !RULESET_SERVER_FIELDS.has(key)));
  return canonical(kept, "ruleset");
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

function canonical(value, context = "") {
  if (Array.isArray(value)) {
    const values = value.map(item => canonical(item, context));
    if (["ruleset.rules", "ruleset.bypass_actors", "ruleset.conditions.ref_name.include", "ruleset.conditions.ref_name.exclude", "ruleset.rules.parameters.allowed_merge_methods", "ruleset.rules.parameters.required_status_checks", "ruleset.rules.parameters.required_reviewers"].includes(context)) {
      return values.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)));
    }
    return values;
  }
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key], context ? `${context}.${key}` : key)]));
}
