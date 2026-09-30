## ADDED Requirements

### Requirement: Target advances refresh ready pull-request branches

After `develop` advances through pull-request integration, trusted default-branch automation SHALL reconcile every open, non-draft, same-repository pull request targeting `develop` whose head does not contain the current target. Each mutation SHALL use GitHub's branch-update operation bound to the exact head SHA freshly observed and an event-producing least-privilege repository identity, so a successful refresh emits the ordinary `synchronize` lifecycle and starts existing finalization and exact-head validation for the new head.

Reconciliation SHALL be idempotent and serialized across target advances. It SHALL re-read candidate and target identity before mutation, page the complete eligible pull-request set, and execute no pull-request-head code with write authority. Drafts, forks, other bases, closed requests, already-current heads, concurrently changed heads, and merge conflicts SHALL NOT be mutated. A conflicting or concurrently changed candidate SHALL NOT prevent independent candidates from being considered. Authentication, permission, transport, pagination, malformed-response, or other unexpected operational failures SHALL remain visible rather than being reported as a successful refresh.

The refresh authority SHALL NOT merge a pull request, enable auto-merge, bypass branch protection, synthesize checks, approve a review, or infer that CI passed. Existing documentation-only integration and implementation-bound manual acceptance SHALL retain their separate owners.

#### Scenario: Another pull request advances develop

- **WHEN** a pull request merges into `develop` while multiple same-repository non-draft pull requests remain open against the prior target
- **THEN** trusted automation SHALL update each non-conflicting stale branch against current `develop` using its freshly observed expected head
- **AND** each successful new head SHALL enter the ordinary `synchronize`-driven finalization and validation lifecycle

#### Scenario: Documentation automation suppresses recursive merge events

- **WHEN** trusted documentation automation integrates an eligible pull request with a token whose merge does not emit a recursive close or push workflow
- **THEN** completion of that trusted integration workflow SHALL still cause idempotent stale-branch reconciliation
- **AND** a completion that integrated nothing SHALL produce no branch mutation when all eligible heads are current

#### Scenario: Candidate is draft, forked, or already current

- **WHEN** reconciliation observes a draft, a fork head, a pull request for another base, or a head that already contains current `develop`
- **THEN** it SHALL leave that head unchanged and report the applicable skipped or current outcome

#### Scenario: Candidate identity changes during refresh

- **WHEN** a contributor, finalizer, or concurrent reconciler changes a candidate head after it was read
- **THEN** expected-head enforcement SHALL prevent the stale decision from updating the replacement head
- **AND** automation SHALL defer that candidate for evaluation from fresh state without overwriting its new commit

#### Scenario: Candidate conflicts with develop

- **WHEN** GitHub cannot update one eligible branch because it conflicts with current `develop`
- **THEN** automation SHALL preserve the branch and report manual conflict resolution as required
- **AND** it SHALL continue considering independent eligible pull requests without resolving or discarding either side

#### Scenario: Refresh creates a new implementation head

- **WHEN** a successful automatic branch update changes an implementation-bound pull request head
- **THEN** previous validation SHALL remain stale and existing trusted finalization and CI SHALL evaluate the new head
- **AND** the pull request SHALL remain ineligible for automated integration and require authorized human manual merge after current-head checks pass

#### Scenario: Refresh authority is unavailable

- **WHEN** the event-producing credential is absent, underprivileged, malformed, or cannot complete the bounded GitHub operation
- **THEN** the workflow SHALL fail with the affected operation visible
- **AND** it SHALL NOT fall back to a suppressed-event token, direct branch push, check synthesis, merge bypass, or a claim that CI restarted
