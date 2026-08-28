// Compatibility entry point. Repository settings, Actions policy, environments,
// workflows, protected refs, and complete rulesets now share one definition.
await import("./check-github-repository-governance.mjs");
