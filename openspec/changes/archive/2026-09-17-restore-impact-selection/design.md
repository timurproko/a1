# Design

## The flag only removes the shortcuts

`selectValidationImpact` computes `docsOnly` and `versionOnly` with `!implementationBound &&` already, so an implementation-bound PR never receives an exemption and always keeps `ordinaryScopes` of typecheck, architecture, and PR-core tests. Passing the same flag into `manualNoComparison` was redundant for that purpose and wrong for the other: `selectValidationOwnership` maps `manualNoComparison` straight to `mode: "conservative"` with reason `manual-no-comparison`, and `selectIntegrationImpact` does the same before it ever classifies. Removing the flag from both calls leaves `manualNoComparison` meaning what its name says, a manual dispatch without a trusted comparison, which `ci.yml` still passes for non-`pull_request` events.

Two fallbacks still default to bound: `ci.yml` uses `'true'` when the trusted router is unavailable, and `acceptance-validation-route.mjs` reports bound on its error path. After this change they only block the documentation-only shortcut, which is the intended fail-closed shape: an unreadable body cannot make a code PR look like a docs PR, and an unknown operational path or invalidator still selects conservative coverage through the ownership registry as before.

## Matrix from the selection, not a literal

GitHub evaluates a job-level `if` before it expands the matrix and does not expose `matrix.*` there, so gating each entry with `if:` is not available. The publication workflow already takes its lane matrix from `fromJson(needs.plan.outputs.validate_matrix)` (#445); the development workflow adopts the same shape. `scripts/release/validation-matrix.mjs` declares the nine entries in one frozen list and exports `resolveValidationJob`, the logic `resolve-validation-job.mjs` used to hold inline. `selectDevelopmentValidationMatrix` runs that resolver for every declared entry against the impact artifact and splits them into `include` and `inactive`. The `changes` job runs the script after the selector and publishes `{ include }` as `modular-matrix`; only `include` goes into the output because any other top-level key would become a matrix vector. The run summary lists both the scheduled and the unscheduled entries so the effect of selection is visible without opening the artifact.

The `modular` job keeps its `if` for acceptance-only, docs-only, and version-only routes, which are exactly the exempt selections that would produce an empty `include`; GitHub does not expand a matrix for a job whose condition is false. For every non-exempt selection the PR core entry is active, so the include list is never empty when the job runs.

## The second check and the aggregate

Every scheduled job still runs `resolve-validation-job.mjs` against the downloaded artifact and skips its work if that says `active=false`. That resolver is now a thin CLI over the shared `resolveValidationJob`, so the matrix and the in-job decision cannot disagree except through a mismatched artifact, which the head and selection identity checks already reject.

`require-modular-validation.mjs` needs no new rule for unscheduled entries. It builds the expected descriptor list from the selection, requires a successful outcome and envelope for each, and rejects evidence from an excluded owner. An entry the selection left inactive is not in that list, and an entry that is in the list but was never scheduled fails as `required modular outcome missing`. The aggregate imports the owner-to-job mapping from the matrix script instead of keeping its own copy, so a new owner cannot be routed to one job by the resolver and another by the aggregate. The new fixture derives the matrix from an impact selection, confirms only the active entries are scheduled, and then removes a scheduled entry's evidence to prove the aggregate rejects it.

## What this is measured by

The first ordinary pull request after merge should show `prCore.mode === "impact"` in its impact artifact, integration owners matching its diff, and inactive matrix entries absent from the job list rather than present with zero-second skips. This change itself edits `ci.yml` and selector scripts, so its own run is conservative by the validation-authority rule and schedules all nine entries; that is expected and is not evidence either way.
