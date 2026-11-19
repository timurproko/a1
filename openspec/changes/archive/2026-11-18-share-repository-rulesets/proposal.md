## Why

Branch and tag protection is now declared for every repository in one place, `protection/repositories.json` of `timurproko/MyGitWorkflows`, and installed with `delivery protect`. This repository still keeps its own copy of the same rulesets in `config/github-repository-governance.json`, with repository-specific names, and compares it with GitHub. Two declarations of one ruleset drift, and the copy here would fail as soon as the shared one is applied.

## What Changes

- **BREAKING** Remove the `rulesets` and `protectedRefs` sections from the repository governance definition, and the ruleset planner that validated, compared and applied them. The governance check keeps comparing repository settings, Actions policy, security capabilities, environments, labels and workflows.
- The live rulesets become the shared ones: `protect-develop` (renamed from `a1-protect-develop`) additionally requires `delivery / Delivery check` and lets the repository admin bypass for pull requests only; `protect-master` and `protect-release-tags` are renames with unchanged rules.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `github-repository-governance`: the repository definition no longer declares rulesets or protected refs; protected-ref responsibilities are restated against the shared declaration, including the admin pull-request bypass and the second required check.
- `continuous-integration`: merges into `develop` are gated by the development validation check and the shared delivery check.

## Impact

- `config/github-repository-governance.json`, `scripts/governance/github-repository-governance.mjs`, `scripts/governance/check-github-repository-governance.mjs`, `scripts/governance/github-rulesets.mjs` (deleted) and their tests.
- `docs/ci-release-runbook.md`, `docs/repository-governance-live-acceptance.md`.
- Live GitHub rulesets, changed with `delivery protect --repo timurproko/a1 --apply` when this merges.
