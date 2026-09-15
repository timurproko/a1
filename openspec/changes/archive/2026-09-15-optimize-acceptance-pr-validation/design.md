## Context

See `proposal.md` for motivation and `specs/github-repository-governance/spec.md` for the behavioral contract. The current `Development validation` workflow sends every non-draft pull request through a dependency-installed impact-selection job. Because an acceptance record is under `openspec/**`, it then runs the generic documentation job, including archive-candidate probing and strict all-change OpenSpec validation, before the aggregate required job succeeds. The dedicated `Acceptance record validation` job already uses trusted base policy and read-only GitHub data to prove the exact acceptance diff, record, source, CI, checklist, and conflict invariants.

Recent live acceptance runs completed in 44–49 seconds. Their product, startup, rendering, naming, containment, and changed-code jobs were skipped; most remaining wall time was runner setup and generic documentation machinery rather than acceptance-specific evidence.

Archive PR #417 demonstrated that automatic integration works but is not obvious or prompt: required CI completed at 11:13:43, the completion-triggered reconciler waited about 37 seconds for a runner, then spent about 20 seconds re-reading archive authority before performing the protected squash merge at 11:14:49 and deleting the branch. Its `autoMergeRequest` correctly remained null because generated archives are pinned to an exact target base and must not be natively pre-armed across base advancement. The optimization must shorten controllable verification time and make this direct automatic path explicit without weakening that base invariant.

## Goals / Non-Goals

**Goals:**

- Make exact acceptance-record candidates reach the existing required context through only lightweight routing, trusted acceptance validation, and aggregation.
- Keep the acceptance validator, current-head binding, workflow identity, and required-check name unchanged for receipt compatibility.
- Make malformed, mixed, renamed, stale, or unverifiable candidates fail closed.
- Preserve normal CI behavior for every non-acceptance pull request.
- Target approximately 15–25 seconds of acceptance required-check wall time under normal runner availability and expose timing evidence without making external queue time a correctness gate.
- Automatically reconcile a valid archive immediately from successful current-head CI, minimize duplicate/sequential authority reads, and report the automatic state clearly.
- Preserve exact target-base and expected-head checks through the final protected archive squash merge.

**Non-Goals:**

- Auto-merge acceptance PRs or weaken the authorized manual-merge requirement.
- Remove source implementation CI, rerun product tests on acceptance records, or alter archive PR validation.
- Change branch protection, workflow permissions, publication credentials, checklist semantics, or acceptance JSON ownership.
- Native-pre-arm a generated archive when doing so could allow integration after its reviewed target base changes.
- Promise a hard elapsed-time service level that GitHub runner availability cannot guarantee.

## Decisions

### 1. Route exact acceptance-shaped diffs before dependency installation

The existing change-surface job will first use base-controlled workflow logic and read-only GitHub pull-request file data to identify an acceptance-shaped candidate. The fast-path shape is exactly one newly added, non-renamed path matching `openspec/acceptance/<valid-change>/<40-hex-source-head>.json`. It will emit an explicit `acceptance-only` output and the event's exact head SHA.

When that output is true, the job will skip head checkout, Node setup, `npm ci`, generic impact selection, and impact artifact upload. When it is false, unavailable, or ambiguous, the existing generic path remains unchanged.

This classifier is only a performance router. A malicious pull request can choose an acceptance-looking filename, but cannot pass the required context unless the separate trusted validator accepts the complete candidate.

**Alternative considered:** place acceptance PRs in a separate path-filtered workflow. Rejected because branch protection and receipt readers depend on one `Development validation required` context and the existing workflow identity; duplicate required-context names across workflows create ambiguous mixed-PR behavior.

**Alternative considered:** run generic impact selection in parallel and only skip documentation validation. Rejected because it retains the unnecessary dependency installation and does not achieve the requested acceptance-only route.

### 2. Keep trusted acceptance validation as the sole fast-path authority

`Acceptance record validation` remains based on `github.event.pull_request.base.sha`, executes no pull-request code, and keeps read-only contents, pull-request, and Actions permissions. It will continue to invoke the deployed acceptance policy for all normal implementation handoffs as it does today. For acceptance-only routing, success must still cover:

- exact single-file diff and canonical path/bytes;
- expected bot-owned acceptance branch and source PR identity;
- implementation head, merge, base ancestry, active artifact digest, and source body binding;
- successful exact-head implementation CI and acceptance-record validation provenance;
- exact title, plain implementation reference, checklist membership/order/text, and allowed checkbox state;
- no already-integrated or conflicting acceptance request.

Generic documentation and strict all-OpenSpec validation add no independent coverage for a canonical acceptance JSON record: the record parser and binding verifier own that schema, while the source change and current target were validated before publication.

**Alternative considered:** trust route classification alone and omit the validator. Rejected because path shape proves neither content nor provenance and would create a bypass.

### 3. Give the aggregate required job an explicit acceptance-only branch

All downstream generic jobs will include the `acceptance-only` guard and remain skipped for the fast path. `Development validation required` will preserve its exact name and current-head checkout. Its acceptance-only branch will require:

1. successful lightweight classification for the event's exact head;
2. successful `Acceptance record validation`; and
3. expected skip states for generic jobs.

Its normal branch will retain the existing `require-development-validation` contract. A missing output, unexpected job result, head mismatch, or acceptance failure blocks the aggregate. The acceptance branch will not infer success from generic documentation checks.

**Alternative considered:** represent acceptance records as `version-only` to reuse current skip conditions. Rejected because conflating lifecycle evidence with package versioning obscures policy and makes future validation changes unsafe.

### 4. Preserve workflow and evidence compatibility

The optimization remains inside `.github/workflows/ci.yml`; the workflow name, required job name, acceptance job name, and exact-head Actions evidence remain stable. Repository governance declarations and runbooks will describe the specialized route. Existing version-1 and version-2 acceptance records are unchanged because routing depends on canonical path and trusted validation, not record generation version.

### 5. Accelerate archive authority verification without native pre-arming

The successful `Development validation` completion event remains the trigger for archive integration. Generated archives will continue to keep native auto-merge unarmed because their marker binds `targetSha`; a native pending merge could become eligible after `develop` advances without rerunning the archive synchronizer against that new base.

The reconciler will instead make its existing direct protected squash request promptly after proving the validated head and exact target base. Its authority check will use a request-scoped memoizing reader, parallel top-level independent reads, and bounded concurrency for independent evidence-reference checks. Every existing read and comparison remains mandatory; caching may reuse only byte-equivalent GET results within one immutable decision, and the final target-ref check remains fresh immediately before the expected-head merge request.

The workflow summary will distinguish waiting for current-head CI, waiting for automatic reconciliation, base advancement requiring regeneration, authority drift, mergeability deferral, and successful protected integration. Documentation will explain that `autoMergeRequest: null` is expected for generated archives and does not mean a maintainer merge is required.

**Alternative considered:** enable GitHub native auto-merge when the archive PR opens. Rejected because the native merge is not conditioned on the archive marker's exact `targetSha` and could integrate stale synchronization after another archive changes shared specs.

**Alternative considered:** drop repeated source/acceptance verification after CI. Rejected because current repository and PR metadata are mutable; optimization must cache or parallelize verified reads, not omit invariants.

### 6. Validate policy structure and exercise the deployed routes

Focused tests will cover exact added-record routing, extra paths, rename pairs, malformed paths, unavailable file data, head mismatches, unexpected job states, and unchanged normal validation. Acceptance-policy suites will prove that every existing source, CI, scope, body, conflict, and provenance rejection remains enforced. Archive integration tests will prove request deduplication, bounded evidence concurrency, fresh final-base reads, expected-head merging, base-advance refusal, authority-drift refusal, automatic workflow-run reconciliation, and branch cleanup.

After the implementation PR is manually merged, its generated acceptance PR will be the live acceptance fast-path exercise: evidence will identify the exact head, workflow run, successful trusted acceptance job, skipped generic impact/documentation work, successful unchanged required context, and observed timing. Its generated archive PR will then be the live automatic-integration exercise: evidence will identify current-head CI completion, reconciliation start, retained exact-base authority, protected squash integration without maintainer action, elapsed controllable time, and branch cleanup. These live checks are acceptance evidence, not unit-test substitutes.

## Risks / Trade-offs

- **[Risk] A permissive router skips broad CI for a malicious record-shaped PR.** -> Treat routing as non-authoritative and require the trusted validator plus exact aggregate branch; test mixed, renamed, and malformed candidates.
- **[Risk] Conditional-job changes accidentally let skipped dependencies satisfy the aggregate.** -> Use explicit result assertions for both fast and normal branches, current-head comparison, and fixture coverage for every skipped/failed/cancelled state.
- **[Risk] Generic documentation validation covered an undeclared acceptance-record dependency.** -> Inventory its inputs; retain any check whose declared input includes `openspec/acceptance/**`, otherwise document why canonical record parsing is the owning validator.
- **[Risk] API pagination or transient failures misclassify a candidate.** -> Require complete bounded file retrieval; on failure or ambiguity use the generic route or fail, never the fast route.
- **[Trade-off] The acceptance validator still performs GitHub API reads and runner setup.** -> Keep them because they are the security boundary; optimize only redundant setup and generic checks.
- **[Risk] Cached archive reads hide mutable state changes.** -> Cache only request-scoped immutable evidence reads, retain a fresh target-ref read immediately before integration, and bind the merge to the expected head SHA.
- **[Risk] Parallel evidence checks increase API pressure or lose a rejection.** -> Use a small bounded concurrency limit, await every check, and fail the authority decision when any result fails.
- **[Risk] Native auto-merge appears disabled even though automatic integration is pending.** -> Document and summarize the direct protected reconciliation state rather than arming an unsafe native merge.
- **[Trade-off] Runner queue time can exceed the target.** -> Report job execution and end-to-end timing separately and do not weaken gates to meet a timing number.

## Migration Plan

1. Add focused route/aggregate policy tests before changing workflow conditions.
2. Deploy the routing and required-job changes in the same manually reviewed implementation PR, with normal full PR validation because that PR is not an acceptance record.
3. Update governance inventory and runbook text in the same implementation.
4. Use the implementation's generated acceptance PR to verify the live fast path and record timing/security outcomes.
5. Use the resulting generated archive PR to verify automatic current-head integration, exact-base enforcement, timing, and cleanup without a maintainer merge.
6. If either optimization fails or behaves ambiguously, leave the affected PR unmerged and restore the prior generic acceptance route or sequential archive verifier in the same implementation stream; no record migration or ruleset change is required.
