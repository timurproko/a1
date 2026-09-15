## 1. Trusted acceptance-only routing

- [ ] 1.1 Implement a base-controlled, read-only classifier for an exact single added canonical acceptance-record path, and verify focused tests cover valid paths, extra files, renames, malformed paths, pagination failure, and ambiguous metadata.
- [ ] 1.2 Wire the change-surface job to emit `acceptance-only` and the exact event head before dependency installation, and verify an acceptance-shaped candidate skips checkout, `npm ci`, generic impact selection, and impact artifact upload while every other PR retains the existing route.
- [ ] 1.3 Guard every generic downstream job with the explicit acceptance-only result, and verify workflow-policy tests show documentation/OpenSpec, product, naming, startup, rendering, containment, and changed-file jobs are skipped only on that route.
- [ ] 1.4 Add an explicit acceptance-only branch to `Development validation required`, preserving its exact context name and current-head check, and verify failed, cancelled, stale, missing, or inconsistent classifier/acceptance results cannot satisfy the aggregate.

## 2. Acceptance security preservation

- [ ] 2.1 Preserve trusted-base checkout, read-only permissions, and acceptance validation for normal implementation handoffs and acceptance records, and verify existing source identity, CI provenance, diff scope, branch, body, checklist, conflict, and stale-head rejection suites remain green.
- [ ] 2.2 Verify a malicious acceptance-shaped one-file PR can only enter the lightweight route and still fails the required context unless canonical record and complete trusted acceptance validation pass.
- [ ] 2.3 Inventory generic documentation/OpenSpec checks against `openspec/acceptance/**`, retain any independently applicable invariant, and document with focused tests why canonical record parsing and binding validation own the checks that are bypassed.

## 3. Prompt automatic archive integration

- [ ] 3.1 Add request-scoped deduplication for immutable archive-authority GET reads, and verify route-count tests prove equivalent evidence is fetched once without caching the final target-ref decision.
- [ ] 3.2 Evaluate independent source, acceptance, CI, and reference evidence with a small bounded concurrency limit, and verify all reads are awaited, any rejection fails closed, and concurrency cannot exceed the declared bound.
- [ ] 3.3 Refactor archive authority reconciliation to preserve every existing marker, source, receipt, current-head, mergeability, and exact-base comparison while verifying the target ref freshly immediately before the expected-head protected squash request.
- [ ] 3.4 Preserve completion-triggered automatic archive integration without native pre-arming, and verify workflow fixtures cover green direct merge, pending CI, base advancement, authority drift, unknown mergeability, GitHub refusal, concurrent integration, and exact-head branch cleanup.
- [ ] 3.5 Report archive states distinctly as waiting for CI, waiting for automatic reconciliation, requiring base regeneration, blocked by authority drift, deferred by mergeability, or automatically integrated, and verify summaries never imply that `autoMergeRequest: null` requires a maintainer merge.

## 4. Governance, documentation, and regression validation

- [ ] 4.1 Update workflow inventory, CI/archive runbooks, and repository-owned delivery guidance for the acceptance fast path and direct archive auto-integration semantics, and verify documentation-governance and declaration tests pass.
- [ ] 4.2 Add focused repository-governance coverage for routing, aggregate result matrices, acceptance policy preservation, archive read deduplication/concurrency, fresh-base enforcement, and automatic merge/cleanup outcomes, and verify the focused suite passes without wall-clock-sensitive unit assertions.
- [ ] 4.3 Run type checking, strict OpenSpec validation for this change, whitespace validation, and the applicable changed-code documentation checks; record exact outcomes and limitations in implementation evidence.

## 5. Current-head review and live lifecycle evidence

- [ ] 5.1 Mark the completed implementation PR ready and obtain successful normal required CI for its exact final head; record the workflow run without treating it as maintainer acceptance.
- [ ] 5.2 Obtain actual maintainer review of the final implementation head and record the reviewed outcome independently from CI.
- [ ] 5.3 Obtain explicit maintainer authorization and manually merge the implementation PR; verify auto-merge remained disabled.
- [ ] 5.4 On the generated acceptance PR, verify the exact one-record candidate reaches `Development validation required` through trusted acceptance validation while generic impact installation and documentation/OpenSpec jobs are skipped, and record job and end-to-end timing separately from runner queue delay.
- [ ] 5.5 After authorized checklist completion and manual acceptance merge, verify the generated archive PR receives current-head CI and is automatically protected-squash-integrated without maintainer merge or native pre-arming, then record reconciliation timing, exact-base decision, merge identity, and branch cleanup.

## 6. Archive preparation

- [ ] 6.1 Record verified implementation acceptance and merge evidence for archive preparation.
- [ ] 6.2 Stage and verify delta synchronization and the archive move in an OpenSpec-only candidate.
