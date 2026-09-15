## MODIFIED Requirements

### Requirement: Automatic archival uses explicit implementation and acceptance evidence
Automatic completed-change archival SHALL require an explicit machine-readable association between an OpenSpec change and its implementation pull request, a confirmed merge into `develop`, successful required validation attributable to the final implementation head, and an authorized maintainer's explicit acceptance of that same head. Acceptance SHALL attest that required manual review is complete, the change is fully implemented, and its delta synchronization has been reviewed. The visible acceptance route SHALL prepare a dedicated acceptance-record PR after implementation integration; its verified manual merge SHALL provide the durable acceptance receipt. Existing valid authorized comment-backed acceptance SHALL remain supported without a redundant request.

A planning PR, an ordinary archive PR, a descriptive title, passing CI alone, an unmerged acceptance request, or an ordinary implementation merge alone SHALL NOT establish implementation acceptance. Missing, malformed, stale, conflicting, revoked, or known-gap acceptance SHALL block the automatic completed-change path. Only a verified authorized human manual merge of the exact validated acceptance record SHALL establish PR-backed acceptance. Existing code-PR local review and manual merge authorization requirements SHALL remain unchanged; the acceptance PR records archival authorization rather than authorizing premature code integration.

#### Scenario: Accepted single-PR implementation merges
- **WHEN** the PR containing the reviewed plan and completed implementation merges into `develop` with an explicit change link, final-head acceptance, and successful required validation
- **THEN** automation SHALL evaluate its linked change for archival without requiring a separately merged specification PR, a redundant acceptance PR, or another archive command
- **AND** SHALL preserve the implementation PR, accepted head, merge commit, validation run, acceptance author, and acceptance source in the archive evidence

#### Scenario: Legacy split implementation merges
- **WHEN** an explicitly linked legacy implementation PR merges with valid final-head acceptance, required validation, and its historical merged specification association
- **THEN** automation SHALL evaluate it under the same completion and synchronization gates without requiring a replacement planning PR

#### Scenario: Rejected draft closes
- **WHEN** the single change PR closes without merging
- **THEN** automation SHALL NOT synchronize or archive its change as completed

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

#### Scenario: Merged implementation needs a visible acceptance record
- **WHEN** a supported implementation is merged without valid acceptance
- **THEN** automation SHALL create or reuse its visible acceptance request with evidence and blockers
- **AND** a verified manual acceptance merge SHALL resume archive evaluation without requiring a special comment or another archive request

### Requirement: Archive automation preserves honest task and artifact completion
Before preparing a completed-change archive, automation SHALL verify that every required artifact is done or deliberately skipped and every implementation, validation, and manual-acceptance task is complete. It SHALL NOT infer task completion from ordinary merge status or rewrite unfinished work as complete. A verified acceptance receipt SHALL be permitted to carry explicit evidence-backed reconciliation of stale task bookkeeping, bound to original task identities and descriptions, and SHALL preserve the reviewed reconciliation in archived evidence.

Only explicitly designated, purely mechanical archive-preparation tasks SHALL be eligible for automatic completion, and only after their corresponding evidence-recording or staged sync/archive operation succeeds. An unknown designation or a task combining manual review with administrative work SHALL block automatic completion. A dedicated acceptance merge SHALL itself satisfy only explicitly identified pure acceptance-signoff bookkeeping, not unperformed implementation, testing, or physical-review work. No task SHALL claim archive-PR integration before that PR actually merges.

#### Scenario: Implementation task remains unchecked
- **WHEN** an unchecked task requires implementation, tests, or physical review without reviewed completion evidence
- **THEN** automation SHALL report that task as blocking and SHALL NOT tick it

#### Scenario: Only mechanical preparation remains
- **WHEN** all prerequisite work is complete and the only unchecked tasks are recognized evidence-recording and staged archive-preparation tasks
- **THEN** automation SHALL complete those tasks only after performing and verifying their operations
- **AND** the generated PR SHALL distinguish prepared archival from integrated archival

#### Scenario: Legacy task mixes acceptance and archival
- **WHEN** an unchecked task combines physical acceptance, merge authorization, and archival
- **THEN** automation SHALL require an explicit evidence-backed task reconciliation rather than classify the whole task as administrative

#### Scenario: Acceptance request reconciles completed work
- **WHEN** a manually merged acceptance record explicitly supplies completion evidence for unchanged source task identities
- **THEN** archive preparation SHALL apply only those reviewed reconciliations and preserve the original state and receipt
- **AND** unknown, pending, failed, and known-gap tasks SHALL continue to block completed-change archival

### Requirement: Forgotten archival is discoverable without repeated maintainer requests
The same eligibility and preparation policy SHALL support merge-event handling, scheduled catch-up, targeted manual retry, and a read-only dry run. Catch-up SHALL discover missed eligible implementation merges within a documented bounded scan window; older PRs SHALL remain explicitly targetable. Missing acceptance for a supported merged implementation SHALL produce or reuse a visible acceptance request, not presume acceptance. Bounded work SHALL report its coverage, deferred candidates, and continuation state rather than claim the entire backlog was examined. Retries SHALL reuse prior results and SHALL NOT spam duplicate PRs or blocker comments.

Dry-run output SHALL distinguish awaiting evidence, awaiting manual acceptance merge, accepted but archive-blocked, pending archive PR, already archived, closed, conflicting, and deferred candidates, with actionable evidence references. It SHALL NOT mutate refs, PRs, acceptance, tasks, or specifications. Existing backlog candidates SHALL NOT be presumed accepted because the automation is newly enabled.

#### Scenario: Merge event was missed
- **WHEN** a scheduled scan finds an eligible merged implementation that was not previously processed
- **THEN** it SHALL prepare the same archive follow-up that the merge event would have prepared

#### Scenario: Old change lacks acceptance
- **WHEN** catch-up finds a supported merged implementation without valid acceptance evidence
- **THEN** it SHALL create or reuse a visible acceptance request without manufacturing a positive verdict

#### Scenario: Scan reaches its budget
- **WHEN** the scan reaches its declared time, page, or candidate limit
- **THEN** it SHALL report incomplete coverage and preserve a resumable position
- **AND** later catch-up SHALL resume deferred work rather than repeatedly process only the newest PRs

#### Scenario: Maintainer requests an audit
- **WHEN** dry-run mode evaluates the backlog or an explicitly named PR outside the scheduled window
- **THEN** it SHALL report eligibility, proposed acceptance requests, and blockers without creating or updating repository objects

## ADDED Requirements

### Requirement: Acceptance-bound documentation requires manual integration
A dedicated acceptance-record PR SHALL be a manual lifecycle exclusion from documentation auto-merge, even when non-draft and all changed paths are under the documentation allowlist. Complete changed and renamed-from paths, reserved acceptance records, and authoritative base/head lifecycle evidence SHALL maintain this hold independently of editable titles, labels, and body markers. Every automatic integration path SHALL refuse the PR and disable any armed auto-merge. Missing or ambiguous evidence SHALL fail closed. Ordinary documentation and verified archive follow-ups carrying copies of accepted evidence SHALL retain their existing automatic path.

#### Scenario: Validated acceptance record awaits a reviewer
- **WHEN** an acceptance-bound PR passes required current-head CI
- **THEN** it SHALL remain open for the maintainer's explicit manual merge

#### Scenario: Acceptance metadata is removed
- **WHEN** an acceptance request loses its display marker or moves its reserved record
- **THEN** the manual hold SHALL remain or classification SHALL block rather than enabling auto-merge

#### Scenario: Archive copies a verified acceptance receipt
- **WHEN** the verified archive PR copies accepted evidence into the archive without creating or modifying authoritative acceptance records
- **THEN** that copy SHALL NOT itself prevent normal CI-gated archive auto-merge
