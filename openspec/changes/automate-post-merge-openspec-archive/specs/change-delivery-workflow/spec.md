## ADDED Requirements

### Requirement: Automatic archival uses explicit implementation and acceptance evidence
Automatic completed-change archival SHALL require an explicit machine-readable association between an OpenSpec change and its implementation pull request, a confirmed merge into `develop`, successful required validation attributable to the final implementation head, and an authorized maintainer's explicit acceptance of that same head. Acceptance SHALL attest that required manual review is complete, the change is fully implemented, and its delta synchronization has been reviewed. The normal implementation handoff SHALL record this evidence before integration so an eligible merge needs no subsequent archive request.

A planning PR, an archive PR, a descriptive title, passing CI alone, or a merge alone SHALL NOT establish implementation acceptance. Missing, malformed, stale, conflicting, revoked, or known-gap acceptance SHALL block the automatic completed-change path. Existing code-PR manual acceptance and merge authorization requirements SHALL remain unchanged.

#### Scenario: Accepted implementation merges
- **WHEN** an explicitly linked implementation PR merges into `develop` with final-head acceptance and successful required validation
- **THEN** automation SHALL evaluate its linked change for archival without asking the maintainer for another archive command
- **AND** SHALL preserve the implementation PR, accepted head, merge commit, validation run, acceptance author, and acceptance source in the archive evidence

#### Scenario: Only a specification merges
- **WHEN** a planning-only PR merges, even if its description names an OpenSpec change
- **THEN** automation SHALL NOT archive that change as implemented

#### Scenario: Acceptance belongs to an older build
- **WHEN** the implementation head differs from the accepted head
- **THEN** automation SHALL report stale acceptance and SHALL NOT create a completed-change archive

#### Scenario: Acceptance is withdrawn or records gaps
- **WHEN** authoritative acceptance is revoked, contradictory, or accepts archival with unresolved work rather than full completion
- **THEN** automation SHALL preserve the active change and report the blocker
- **AND** any exceptional archive SHALL require the separate explicit manual disposition

### Requirement: Archive automation preserves honest task and artifact completion
Before preparing a completed-change archive, automation SHALL verify that every required artifact is done or deliberately skipped and every implementation, validation, and manual-acceptance task is complete. It SHALL NOT infer task completion from merge status or rewrite unfinished work as complete.

Only explicitly designated, purely mechanical archive-preparation tasks SHALL be eligible for automatic completion, and only after their corresponding evidence-recording or staged sync/archive operation succeeds. An unknown designation or a task combining manual review with administrative work SHALL block automatic completion. No task SHALL claim archive-PR integration before that PR actually merges.

#### Scenario: Implementation task remains unchecked
- **WHEN** an unchecked task requires implementation, tests, or physical review
- **THEN** automation SHALL report that task as blocking and SHALL NOT tick it

#### Scenario: Only mechanical preparation remains
- **WHEN** all prerequisite work is complete and the only unchecked tasks are recognized evidence-recording and staged archive-preparation tasks
- **THEN** automation SHALL complete those tasks only after performing and verifying their operations
- **AND** the generated PR SHALL distinguish prepared archival from integrated archival

#### Scenario: Legacy task mixes acceptance and archival
- **WHEN** an unchecked task combines physical acceptance, merge authorization, and archival
- **THEN** automation SHALL require an explicit evidence-backed task reconciliation rather than classify the whole task as administrative

### Requirement: Automatic specification synchronization is conservative and verified
Automation SHALL prepare synchronization and archival against a fresh `develop` snapshot in isolation. It SHALL validate the source change strictly, resolve the declared delta paths, obtain applicable specification instructions, and verify every affected main specification before publishing any archive. Synchronization SHALL preserve unrelated requirements and scenarios and SHALL refuse ambiguous, conflicting, or unsupported transformations. If synchronization is not needed, automation SHALL verify that every declared delta is already applied, or that the workflow legitimately has no delta.

The automatic completed-change path SHALL NOT silently skip synchronization or disable validation. Failure for any affected capability SHALL leave the active change and canonical specifications unmodified on `develop`. Reviewed baseline identity and affected-input changes SHALL be checked to prevent a stale archive from overwriting intervening specification work. An occupied archive target SHALL be treated as already archived only when recorded change and implementation identities match.

#### Scenario: Reviewed deltas apply without conflict
- **WHEN** every delta applies unambiguously to the reviewed canonical baseline and passes post-sync verification
- **THEN** automation SHALL stage all affected main-spec updates and move the change, including its metadata and acceptance evidence, into the dated archive

#### Scenario: Other specification work intervenes
- **WHEN** the same requirement changed since the accepted synchronization baseline and is not already equal to the intended result
- **THEN** automation SHALL report a synchronization conflict instead of overwriting that requirement

#### Scenario: One of several capabilities fails
- **WHEN** verification fails for any capability in the change
- **THEN** automation SHALL publish no partial archive and SHALL identify the blocking capability

#### Scenario: Delta is already synchronized
- **WHEN** every intended delta is already reflected in the main specs
- **THEN** automation SHALL prepare an archive without redundant main-spec edits

#### Scenario: Target directory is occupied
- **WHEN** the expected archive directory already exists with a different or unverifiable implementation identity
- **THEN** automation SHALL refuse overwrite and report the collision

### Requirement: Forgotten archival is discoverable without repeated maintainer requests
The same eligibility and preparation policy SHALL support merge-event handling, scheduled catch-up, targeted manual retry, and a read-only dry run. Catch-up SHALL discover missed eligible implementation merges within a documented bounded scan window; older PRs SHALL remain explicitly targetable. Bounded work SHALL report its coverage, deferred candidates, and continuation state rather than claim the entire backlog was examined. Retries SHALL reuse prior results and SHALL NOT spam duplicate PRs or blocker comments.

Dry-run output SHALL distinguish eligible, blocked, pending archive PR, already archived, and deferred candidates, with actionable evidence references. It SHALL NOT mutate refs, PRs, acceptance, tasks, or specifications. Existing backlog candidates SHALL NOT be presumed accepted because the automation is newly enabled.

#### Scenario: Merge event was missed
- **WHEN** a scheduled scan finds an eligible merged implementation that was not previously processed
- **THEN** it SHALL prepare the same archive follow-up that the merge event would have prepared

#### Scenario: Old change lacks acceptance
- **WHEN** catch-up finds a merged implementation without valid acceptance evidence
- **THEN** it SHALL report missing acceptance without manufacturing a positive verdict

#### Scenario: Scan reaches its budget
- **WHEN** the scan reaches its declared time, page, or candidate limit
- **THEN** it SHALL report incomplete coverage and preserve a resumable position
- **AND** later catch-up SHALL resume deferred work rather than repeatedly process only the newest PRs

#### Scenario: Maintainer requests an audit
- **WHEN** dry-run mode evaluates the backlog or an explicitly named PR outside the scheduled window
- **THEN** it SHALL report eligibility and blockers without creating or updating repository objects
