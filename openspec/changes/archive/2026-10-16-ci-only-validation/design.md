# Design

## CI after readiness is the validation point

Development validation already skips draft pull requests, and checking the final Implementation item hands the candidate to trusted automation, which marks it ready and starts finalization and CI. That sequence already validates every implementation once it is complete, so a full local preflight before each push mostly duplicates work CI will do on the same head.

Running CI on draft pushes was considered and rejected: a draft is unfinished by definition, so validating intermediate heads spends CI time on states nobody will merge.

## Quick targeted checks stay

Dropping every local check makes each defect cost a push, a fresh finalization, and a full multi-platform CI run, and nobody reacts to a post-readiness failure until the maintainer returns, because the agent's role ends at the final checkbox. Most defects are cheap to catch locally: on the Pi 1.3.0 upgrade, preflight's six findings included comment-rule violations, a settings-count expectation, and an inventory entry, each visible in seconds from the type check or the touched test file.

Agents therefore run, before pushing, only checks that finish in about a minute: `npm run typecheck`, the vitest files that cover the code they changed, and `openspec validate <change> --strict`. They do not run preflight, `test:fast`, `test:full`, `test:release`, or whole-directory test runs. Failures that need a build or a wide scope, such as startup budgets, are left to CI.

## Failures surface after readiness

A defect the targeted checks miss is found after the pull request becomes ready. The agent pushes a fix to the same branch; the new head makes earlier CI stale and finalization runs again, which the delivery runbook already covers for repaired heads.

## Preflight stays as a tool

`scripts/development/run-preflight.mjs` and its test remain, because preflight still mirrors CI's fast gates and is useful when a CI failure needs reproducing. Only the requirement and the guidance that make it a pre-push step change.
