## MODIFIED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md` SHALL be automatically squash-integrated. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct reconciliation SHALL require successful validation for the current head and enforce that expected SHA through normal branch-protected integration. Eligible validated heads reported as `clean`, or as `unstable` with positive mergeability, SHALL be reconciled without requiring auto-merge to have been armed first.

#### Scenario: OpenSpec-only pull request passes
- **WHEN** an eligible OpenSpec-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Maintained documentation-only pull request passes
- **WHEN** an eligible `docs/**`-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Root README-only pull request passes
- **WHEN** an eligible root-README-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Allowed documentation surfaces are mixed
- **WHEN** a current head changes only paths under `openspec/**`, paths under `docs/**`, and/or root `README.md`
- **THEN** repository automation SHALL preserve its documentation-only eligibility

#### Scenario: Mixed pull request passes CI
- **WHEN** any changed or renamed-from path is outside the exact allowlist
- **THEN** auto-merge SHALL remain disabled and the pull request SHALL await manual acceptance

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head

## ADDED Requirements

### Requirement: Documentation merge-state recovery is bounded and fail-closed
Documentation integration SHALL distinguish GitHub's merge-state transitions from genuine operational failures. The specific unstable-status rejection of an auto-merge enable request SHALL trigger bounded re-evaluation or explicit deferral without making the workflow fail solely because of that rejection. Recovery SHALL refresh the PR identity, open/merged state, draft status, base, head repository, head SHA, complete changed-file classification, and mergeability before deciding whether another mutation is safe. A new head SHALL NOT inherit the previous head's classification or successful validation. Already-armed and unarmed eligible PRs SHALL have the same current-head and protection guarantees.

Direct unstable-state integration SHALL require positive mergeability and successful current-head validation, use an expected-SHA protected squash merge, and preserve the existing synchronous exact-head remote-branch cleanup only after merge is confirmed. Unknown mergeability, conflicts, failed or stale validation, and ineligible paths SHALL NOT authorize direct integration. A GitHub merge refusal SHALL NOT trigger a bypass or cleanup; if a fresh read proves that another actor already merged the same expected head, automation SHALL reconcile that confirmed outcome idempotently. Unknown errors SHALL remain failures. Summaries SHALL distinguish merged, already merged, waiting for validation, waiting for mergeability, ineligible, and failed outcomes.

#### Scenario: Recover an unarmed unstable documentation PR
- **WHEN** an unarmed eligible PR has successful validation for its current head and is positively mergeable but unstable
- **THEN** automation SHALL attempt protected squash integration with that exact head SHA
- **AND** confirmed integration SHALL run the existing safe branch cleanup

#### Scenario: Recover an already-armed unstable documentation PR
- **WHEN** an already-armed eligible current head passes validation and remains positively mergeable but unstable
- **THEN** automation SHALL reconcile it with the same protected expected-head merge behavior as an unarmed PR
- **AND** it SHALL NOT wait indefinitely solely because auto-merge was previously armed

#### Scenario: Arming races with merge-state calculation
- **WHEN** an eligible PR appears suitable for arming but GitHub returns the specific unstable-status rejection
- **THEN** automation SHALL refresh and re-evaluate current state within a bounded recovery attempt
- **AND** it SHALL either perform an independently authorized action or report deferral without a failing check caused solely by that rejection

#### Scenario: Validation has not succeeded for the head
- **WHEN** state recovery observes missing, pending, failed, or stale successful validation
- **THEN** it SHALL NOT directly merge the current head
- **AND** a deferred result SHALL NOT claim validation success or completed integration

#### Scenario: Recovery observes changed eligibility
- **WHEN** a recovery refresh finds a different head, a changed base, a draft, a fork head, or changed paths outside the documentation allowlist
- **THEN** automation SHALL NOT reuse the earlier eligibility or validation to merge
- **AND** an ineligible PR SHALL retain the existing auto-merge-disable safeguards

#### Scenario: Mergeability cannot be established
- **WHEN** a PR has conflicts or mergeability remains unknown after bounded re-evaluation
- **THEN** automation SHALL leave it unmerged and report the reason without treating unstable status as proof of mergeability

#### Scenario: Concurrent integration completes first
- **WHEN** another actor merges the same expected PR head before the reconciler completes its merge request
- **THEN** a fresh read confirming that merge SHALL allow idempotent cleanup
- **AND** a close without merge or a different head SHALL NOT authorize branch cleanup under the original decision

#### Scenario: GitHub refuses integration
- **WHEN** GitHub refuses the expected-SHA protected merge and a fresh read does not confirm that same head already merged
- **THEN** automation SHALL expose the refusal and leave the branch intact
- **AND** it SHALL NOT relax required checks, alter repository protections, or invoke an administrative bypass

#### Scenario: An unrelated arming error occurs
- **WHEN** the enable request returns an authentication, permission, transport, malformed-response, or non-unstable GraphQL error
- **THEN** the workflow SHALL remain failed with bounded diagnostic evidence
- **AND** it SHALL NOT label that error as a harmless state transition
