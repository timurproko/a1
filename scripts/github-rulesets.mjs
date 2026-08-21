export function validateRulesetDefinition(definition) {
  if (definition?.schema !== "a1-github-rulesets-v1") throw new Error("GitHub ruleset schema is invalid");
  if (!/^[^/]+\/[^/]+$/.test(definition.repository ?? "")) throw new Error("GitHub ruleset repository is invalid");
  if (!Array.isArray(definition.rulesets) || definition.rulesets.length !== 2) throw new Error("exactly two branch rulesets are required");
  const expected = new Map([["refs/heads/develop", "Development validation required"], ["refs/heads/master", "Stable candidate required"]]);
  for (const ruleset of definition.rulesets) {
    if (ruleset.target !== "branch" || ruleset.enforcement !== "active") throw new Error(`${ruleset.name} must actively target branches`);
    if (!Array.isArray(ruleset.bypass_actors) || ruleset.bypass_actors.length !== 0) throw new Error(`${ruleset.name} must not permit direct-push bypass actors`);
    const include = ruleset.conditions?.ref_name?.include;
    if (!Array.isArray(include) || include.length !== 1 || !expected.has(include[0])) throw new Error(`${ruleset.name} targets an unexpected branch`);
    const byType = new Map(ruleset.rules?.map(rule => [rule.type, rule]));
    for (const type of ["deletion", "non_fast_forward", "pull_request", "required_status_checks"]) {
      if (!byType.has(type)) throw new Error(`${ruleset.name} is missing ${type}`);
    }
    const pull = byType.get("pull_request").parameters;
    if (pull.required_approving_review_count !== 0 || pull.require_last_push_approval !== false || pull.required_review_thread_resolution !== true) throw new Error(`${ruleset.name} solo-maintainer pull-request policy is incomplete`);
    const status = byType.get("required_status_checks").parameters;
    const contexts = status.required_status_checks?.map(check => check.context);
    if (typeof status.strict_required_status_checks_policy !== "boolean" || status.do_not_enforce_on_create !== false || !contexts?.includes(expected.get(include[0]))) throw new Error(`${ruleset.name} required status is incomplete`);
  }
  return definition;
}

export function planRulesetChanges(definition, liveRulesets) {
  validateRulesetDefinition(definition);
  const liveByName = new Map(liveRulesets.map(ruleset => [ruleset.name, ruleset]));
  const changes = definition.rulesets.map(desired => {
    const live = liveByName.get(desired.name);
    if (!live) return { name: desired.name, action: "create", desired };
    const matches = JSON.stringify(normalizeRuleset(live)) === JSON.stringify(normalizeRuleset(desired));
    return { name: desired.name, action: matches ? "none" : "update", id: live.id, desired, ...(matches ? {} : { live: normalizeRuleset(live) }) };
  });
  return {
    schema: "a1-github-ruleset-plan-v1",
    repository: definition.repository,
    mode: "dry-run",
    mutationPerformed: false,
    changes,
    summary: {
      create: changes.filter(change => change.action === "create").length,
      update: changes.filter(change => change.action === "update").length,
      unchanged: changes.filter(change => change.action === "none").length,
    },
  };
}

export function normalizeRuleset(ruleset) {
  return {
    name: ruleset.name,
    target: ruleset.target,
    enforcement: ruleset.enforcement,
    bypass_actors: (ruleset.bypass_actors ?? []).map(actor => ({ actor_id: actor.actor_id, actor_type: actor.actor_type, bypass_mode: actor.bypass_mode })),
    conditions: {
      ref_name: {
        include: [...(ruleset.conditions?.ref_name?.include ?? [])].sort(),
        exclude: [...(ruleset.conditions?.ref_name?.exclude ?? [])].sort(),
      },
    },
    rules: (ruleset.rules ?? []).map(normalizeRule).sort((a, b) => a.type.localeCompare(b.type)),
  };
}

function normalizeRule(rule) {
  if (!rule.parameters) return { type: rule.type };
  if (rule.type === "pull_request") return {
    type: rule.type,
    parameters: {
      dismiss_stale_reviews_on_push: rule.parameters.dismiss_stale_reviews_on_push,
      require_code_owner_review: rule.parameters.require_code_owner_review,
      require_last_push_approval: rule.parameters.require_last_push_approval,
      required_approving_review_count: rule.parameters.required_approving_review_count,
      required_review_thread_resolution: rule.parameters.required_review_thread_resolution,
      allowed_merge_methods: [...(rule.parameters.allowed_merge_methods ?? [])].sort(),
    },
  };
  if (rule.type === "required_status_checks") return {
    type: rule.type,
    parameters: {
      strict_required_status_checks_policy: rule.parameters.strict_required_status_checks_policy,
      do_not_enforce_on_create: rule.parameters.do_not_enforce_on_create,
      required_status_checks: (rule.parameters.required_status_checks ?? []).map(check => ({ context: check.context })).sort((a, b) => a.context.localeCompare(b.context)),
    },
  };
  return { type: rule.type, parameters: rule.parameters };
}
