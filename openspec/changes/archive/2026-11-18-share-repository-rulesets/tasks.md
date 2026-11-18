# Tasks

## 1. The repository definition no longer declares rulesets

- [x] 1.1 Remove `rulesets` and `protectedRefs` from `config/github-repository-governance.json` and from the definition validation, comparison, declarations and live loader.
- [x] 1.2 Remove ruleset planning from the governance apply path and delete `github-rulesets.mjs`, its declarations and its test.
- [x] 1.3 Update the governance tests and the runbook passages that name the old rulesets or the local declaration.
