# Design

## CI after readiness is the validation point

Development validation already skips draft pull requests, and checking the final Implementation item hands the candidate to trusted automation, which marks it ready and starts finalization and CI. That sequence already validates every implementation once it is complete, so the local preflight run before each push only duplicates work CI will do on the same head.

The change removes the pre-push requirement rather than moving validation earlier. Running CI on draft pushes was considered and rejected: a draft is unfinished by definition, so validating intermediate heads spends CI time on states nobody will merge.

## Failures surface after readiness

Without local checks, a defect is found only after the pull request becomes ready. The agent then pushes a fix to the same branch. A new head makes earlier CI stale and finalization runs again, which the delivery runbook already covers for `BEHIND` and repaired heads. The maintainer accepts that cost in exchange for not waiting on local runs.

## Preflight stays as a tool

`scripts/development/run-preflight.mjs` and its test remain, because preflight still mirrors CI's fast gates and is useful when a CI failure needs reproducing. Only the requirement and the guidance that make it a pre-push step change.
