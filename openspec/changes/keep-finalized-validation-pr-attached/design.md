## Context

Version-3 delivery intentionally validates only the exact finalized head. A ready active head may start Development validation, but readiness defers it while finalization is pending. Trusted finalization then pushes an App-authored archive commit and updates the `openspec-implementation` fence.

The fence currently records stable values only: `version`, `change`, `archive`, and `acceptanceManifest`. During a later repair/refinement, finalization commonly reuses the same archive and manifest paths. Its post-push body calculation is therefore byte-identical to the existing PR body, so it does not perform a body update. In the observed PR #718 sequence, CI for pre-finalization head `0b15a8da` was cancelled when finalization pushed `71aa3113`, but no ordinary Development validation run was attached to `71aa3113`. Branch protection correctly kept `Development validation required` pending.

A manually dispatched run is not equivalent. GitHub presents it as a branch workflow under Actions rather than PR progress, and `ci.yml` receives no `pull_request` payload. PR number, base/head identities, body, finalized-delivery validation, acceptance validation, and exact PR impact selection are therefore absent or take standalone fallback paths. The recovery must create a genuine PR event, not teach the aggregate to trust weaker dispatch context.

## Goals / Non-Goals

**Goals:**
- Guarantee one ordinary PR-associated Development validation run for every exact automated finalization head.
- Keep all selected lanes and their progress visible from the PR checks UI.
- Preserve exact-head cancellation: pre-finalization and stale runs must not authorize merge.
- Fail closed across concurrent body edits, developer pushes, target movement, and repeated finalizer events.
- Keep finalization idempotent once tree and body are bound to the same head.

**Non-Goals:**
- Treating `workflow_dispatch`, `workflow_run`, commit statuses, or manually created check runs as implementation-delivery evidence.
- Weakening the protected aggregate, branch rules, or current-head requirement.
- Automatically enabling auto-merge or merging implementation PRs.
- Changing version-1/version-2 lifecycle behavior or documentation-only auto-merge eligibility.
- Showing manual diagnostic runs in the PR UI; only ordinary PR validation needs that presentation.

## Decisions

### 1. Add an exact finalized-head binding to version-3 metadata

Finalized version-3 `openspec-implementation` metadata will include a required `finalizedHead` SHA alongside `archive` and `acceptanceManifest`. Draft/active metadata must omit all three finalized fields. The parser will reject partial, malformed, or unknown combinations.

The field serves two related purposes:

1. It states which immutable PR head the finalized body metadata describes.
2. It guarantees that every finalization commit changes the fence, including re-finalizations whose archive path and acceptance-manifest path remain unchanged.

A user-authored commit after finalization naturally makes the binding stale. Readiness must then defer protected validation while trusted finalization verifies or rebuilds the candidate. The finalizer, not PR-head code or a human, writes the replacement binding.

### 2. Publish the head binding only after the final commit is known

Finalization prepares and commits archive bytes first, pushes with the existing force-with-lease, and obtains the exact pushed SHA. It then reconstructs the fence with `finalizedHead: pushedHead` and updates the PR body.

Before that body update, the publisher must freshly verify both conditions:

- the body still equals the body read for finalization; and
- the PR head still equals `pushedHead`.

Either mismatch returns the bounded retry disposition without overwriting newer human text or binding the body to an obsolete head. The next PR event reruns finalization.

If no commit is needed, trusted finalization normalizes the binding to the current verified head. Once tree, paths, body, and `finalizedHead` all agree, later `edited`/`synchronize` invocations return `already-finalized` without another body mutation, event loop, or CI run.

### 3. Use the guaranteed body edit as the PR validation trigger

The post-push metadata update emits `pull_request: edited`, already handled by `ci.yml`. That run has the normal PR payload, is shown in the PR check rollup, uses the exact final head, and cancels any earlier run through the existing PR concurrency group.

The sequence is intentionally:

1. developer push starts or supersedes provisional PR workflows;
2. finalization pushes the exact candidate head;
3. readiness on an intermediate event sees a missing/stale `finalizedHead` and emits no protected aggregate;
4. finalization updates the body with the exact pushed SHA;
5. the resulting PR `edited` event runs all selected checks on that head and exposes `Development validation required` in the PR.

This does not depend on whether an App push itself happens to produce a usable `pull_request` workflow event. Duplicate intermediate events remain harmless because only the matching body/head pair is eligible.

### 4. Keep manual dispatch non-authoritative

`workflow_dispatch` remains useful for broad diagnostics. It will not be upgraded into an imitation PR event, and its outcomes will not satisfy finalized delivery, acceptance, or PR-selection evidence. The protected implementation aggregate must require event-bound PR identity and a matching `finalizedHead`.

This avoids duplicating pull-request payload reconstruction throughout `ci.yml`, prevents a branch dispatch from validating a different open PR or mutable body, and preserves GitHub's native PR checks presentation.

### 5. Preserve compatibility through trusted normalization

Existing finalized version-3 metadata lacks `finalizedHead`. Parsing may recognize that legacy finalized shape only long enough for trusted finalization/readers to classify it as requiring normalization; Development validation must not accept it as exact-head evidence. Trusted finalization adds the field without changing archive contents when those contents remain valid.

Documentation examples, TypeScript declarations, local inspection/finalization output, GitHub readers, cleanup evidence, and auto-merge lifecycle classification must all understand the new finalized shape. No existing manifest digest is reinterpreted as a head binding.

## Validation Matrix

| Case | Expected evidence |
| --- | --- |
| First automated finalization | App push is followed by a body fence containing its exact SHA; a PR-associated `edited` Development validation run is eligible |
| Same-path re-finalization | New SHA changes `finalizedHead` even though archive/manifest paths are unchanged; final PR run appears in check rollup |
| App push creates an intermediate PR run | Stale/missing binding defers it; body-update event becomes the one eligible exact-head run |
| Already-finalized matching candidate | No commit, body patch, dispatch, or repeated validation event |
| Developer pushes between finalization push and body patch | Fresh head comparison rejects stale patch and reports retry |
| Human edits body during finalization | Existing body comparison rejects overwrite and reports retry |
| Missing or malformed binding | Protected aggregate is absent/unsuccessful; trusted finalization normalizes or fails closed |
| Manual Development dispatch | Runs diagnostics in Actions but cannot satisfy PR delivery/acceptance evidence |
| PR checks presentation | Selected modular jobs and final aggregate are associated with the PR and visible while queued/running/completed |
| Legacy delivery/docs PR | Existing version-1/version-2 and documentation-only behavior remains unchanged |

## Risks / Trade-offs

- [A metadata field exposes a SHA that changes on every finalization] -> This is intentional exact-head evidence; the field is body metadata, not committed archive content, so it introduces no self-referential commit hash.
- [Body update creates another finalization invocation] -> Matching tree/body/head returns `already-finalized`; tests enforce one terminating no-op.
- [Intermediate PR runs consume a small amount of setup time] -> Readiness defers them before product suites and emits no protected aggregate; exact-PR concurrency cancels superseded work.
- [Existing finalized PRs become temporarily ineligible] -> Trusted finalization performs bounded normalization; no branch-protection bypass or manual dispatch is needed.
- [GitHub event delivery is delayed] -> Required checks remain pending until the native PR event arrives, which is safer than manufacturing status evidence.

## Migration Plan

1. Extend metadata policy and declarations to represent the exact finalized-head binding while recognizing old finalized records as needing trusted normalization.
2. Update finalization publication to compute the post-commit fence, verify fresh body and head, and issue the bounded body patch.
3. Update readiness and aggregate policy so only matching PR-event head metadata can authorize implementation validation.
4. Add policy, publication, workflow, and PR-presentation regression tests, then update delivery documentation/examples.
5. Exercise a disposable ready version-3 PR through first finalization and same-path re-finalization; verify each exact final head receives visible PR checks without manual dispatch.

Rollback restores the prior parser/finalizer only before any candidate relies on the new field. After deployment, retaining the field is backward-safe; a corrective workflow change should preserve it rather than removing exact-head evidence from open candidates.
