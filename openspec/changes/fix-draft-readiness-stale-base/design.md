## Context

PR #964 at 5b4062fae125b075bdf916fc3862ef7de3d4f62b includes develop at 21d3f6062fb0eec93b239b9f1f0f88bcc90c0c5e, but both REST base.sha and GraphQL baseRefOid report 7c146a8f0deac083c92310063e95f04c7c44e0ee. Completed finalization runs 44036548104 and 44036578383 return retry with draft-target-changed before inspecting the tree. No further retry is scheduled by that result.

## Decisions

- Do not equate the PR's cached base SHA with the current branch ref. Read develop independently, require the fetched ref to equal that snapshot, and require that target to be an ancestor of the exact candidate head; those checks already exist.
- Preserve the exact PR snapshot comparison before promotion, including base identity and metadata stability. Independently re-read develop after that comparison and before the ready mutation; a moved target must refuse promotion even when PR base metadata stays unchanged.
- Keep the fix in a separate implementation-bound delivery. Trusted policy is loaded from develop, so editing #964 cannot repair its own promotion. No manual ready mutation, merge authority, automatic integration, polling, or weaker task/evidence checks are introduced.

## Evidence

- Direct GitHub reads reproduce the stale base metadata on #964; local merge-base confirms the candidate contains current develop.
- Focused real-repository fixtures will reproduce the refusal before the fix and cover successful promotion plus stale-target and race refusals afterward.

## Known gaps

None in the intended repair. Live recovery of #964 requires maintainer integration of this policy followed by a new finalization event; no deployment or successful native validation is claimed by local fixtures.
