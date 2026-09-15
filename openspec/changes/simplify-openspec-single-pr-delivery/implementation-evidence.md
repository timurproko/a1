# Implementation evidence

## Approval and identity

- Change: `simplify-openspec-single-pr-delivery`
- Draft implementation PR: https://github.com/timurproko/a1/pull/425
- Branch: `refactor/simplify-openspec-single-pr-delivery`
- Plan approval and implementation request: maintainer conversation after proposal completion.
- Bootstrap authority: deployed version-2 lifecycle; this change does not use its unmerged version-3 policy to accept itself.

## Implemented outcomes

- Version-3 metadata supports draft and exact finalized archive/manifest paths while retaining version-1/version-2 readers.
- Delivery PR guidance starts with a quoted phase, presents a proposal-derived `Implementation` summary, removes routine validation-command noise, and ends with collapsed linkage under `Automation`; completed candidates use `> Phase: Acceptance`.
- Final PR acceptance uses one to three visible plain `## Acceptance` scenarios; checkboxes are rejected.
- In-branch finalization uses the pinned OpenSpec engine in isolation, synchronizes deltas, moves the active change, writes a conditional manifest, computes deterministic archive/spec/task/evidence digests, and applies no remote mutation.
- Trusted candidate validation binds the exact body, target baseline, archive, canonical specs, tasks/evidence, and complete implementation-required validation.
- Automatic merge/publication owners refuse version 3. Authorized human manual merge supplies acceptance and atomic integration.
- Post-merge reconciliation derives acceptance from the manifest plus GitHub provenance and remains read-only except existing exact-head branch cleanup.
- Legacy acceptance/archive publication and standalone documentation/spec-only auto-merge remain supported.

## Successful local verification

- `npm run typecheck`
- `openspec validate --all --strict --no-interactive` — 35 items passed.
- `npm run check:architecture`
- `npm run check:code-documentation:changed`
- `npm run check:docs-governance` — 75 inventoried legacy occurrences matched.
- `npm run check:repository-governance` — reviewed definition matched live state.
- Focused governance regression selection — 17 files and 323 tests passed before the final draft-body refinement.
- Final focused draft/acceptance/workflow selections passed after the refinement.
- The focused regression for archived integration-selection evidence, package-download-cache evidence, and terminal-colour handoff guidance passed after repairing Development run `35006946913`.

Exact required hosted Development CI is pending the pushed final candidate and remains task 6.3. Unit and fixture results are not the required first live version-3 canary.

## Failed attempts retained separately

1. The first focused Vitest invocation failed before collection because this isolated worktree did not yet have dependencies. `npm ci --ignore-scripts` established the declared dependency tree; no test or validation requirement changed.
2. The first metadata-focused run failed three new cases because directory paths with trailing `/` were passed to the file-path validator. Directory identity is now validated without its delimiter, while the exact trailing-delimiter contract remains enforced; the repeated 104-test selection passed.
3. The first finalization fixture failed with `delta-path` because Windows temporary-root canonicalization differed from OpenSpec's resolved artifact root. The sandbox now resolves its real path before invoking the pinned CLI; the fixture then passed without loosening path containment.
4. Typecheck initially found the new acceptance parser missing from its declaration and later found an intentionally mutated fixture map inferred too narrowly. Declarations and fixture typing were corrected; typecheck passes.
5. One focused guidance/workflow run had three expectation-only failures after the runbook rewrite. Assertions were reconciled to the approved wording; no runtime policy changed, and the repeated selections passed.
6. Exact-head Development run `35006946913` failed five fast-suite tests. Four still read evidence from the active `shorten-development-validation` path after that change had been archived and treated pre-squash observation commits as ancestors of current `develop`; they now read the immutable archive, retain exact observation-head identities, and verify the integrated implementation merge instead of requiring topic-ref retention. The fifth detected that the concise config rewrite had dropped the exact direct-Node-launch prohibition; the explicit prohibition was restored. The focused 14-test regression then passed.

## Rollout boundary

The first deployed version-3 canary remains a post-bootstrap operational requirement. It must demonstrate the draft hold, explicit implementation approval, same-PR finalization, complete CI, authorized manual merge, absence of generated follow-ups, read-only verification, cleanup, negative provenance/staleness controls, and standalone spec/docs auto-merge control. The runbook marks the feature deployable but not fully operational until that evidence exists.
