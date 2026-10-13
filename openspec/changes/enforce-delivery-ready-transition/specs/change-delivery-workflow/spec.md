## ADDED Requirements

### Requirement: Delivery closeout is always visible to implementation agents

Every repository agent that performs approved implementation-bound work SHALL receive an always-loaded concise progress and ready-transition contract in addition to the selectively loaded detailed delivery skill. The context SHALL direct the agent to load that skill before continuing delivery work.

#### Scenario: Agent starts without selecting the delivery skill

- **WHEN** a repository coding agent begins implementation without loading the optional detailed delivery skill
- **THEN** always-loaded repository context SHALL still require progress updates and the completed-candidate ready transition
- **AND** it SHALL direct the agent to load the detailed skill before continuing delivery work

### Requirement: Implementation progress and readiness close in the implementation turn

While a pull request remains draft, the agent SHALL check an approved `Implementation` item as soon as that outcome, focused pre-ready evidence, and detailed task bookkeeping are complete. After the final outcome and every pre-ready input are complete, the same turn SHALL add plain `Acceptance`, reconcile and push, check the final item, mark the PR ready, and verify its remote state. The agent SHALL report a concrete blocker instead of claiming completion if closeout cannot finish.

#### Scenario: One implementation outcome finishes

- **WHEN** an agent completes one approved outcome with its focused pre-ready evidence and detailed task bookkeeping
- **THEN** the agent SHALL update only that PR-body item's marker while the pull request remains draft
- **AND** other incomplete implementation outcomes SHALL remain unchecked

#### Scenario: Final implementation outcome finishes

- **WHEN** the last implementation outcome and every pre-ready input are complete
- **THEN** the agent SHALL finish acceptance, reconciliation, push, final progress, and the ready-for-review transition in the same closeout turn
- **AND** it SHALL verify the remote pull request is non-draft before reporting completion

#### Scenario: Closeout cannot finish

- **WHEN** permissions, stale state, incomplete evidence, an unfinished task, or another concrete condition prevents the ready transition
- **THEN** the agent SHALL leave the affected progress state truthful and report that blocker
- **AND** it SHALL NOT claim that implementation delivery is complete

#### Scenario: GitHub checks are green while implementation progress is stale

- **WHEN** GitHub reports completed CI checks but the PR-body Implementation items remain unchecked
- **THEN** the agent SHALL treat those as separate signals and reconcile only truthful implementation progress
- **AND** it SHALL NOT present CI check counts as implementation task completion

### Requirement: Trusted automation promotes only a complete draft snapshot

The trusted default-branch finalization entrypoint SHALL mark a draft ready only when one exact same-repository version-3 snapshot targets `develop`, has every current-form `Implementation` item checked, contains valid plain `Acceptance`, and satisfies existing pre-finalization checks for association, detailed tasks, evidence, gaps, target, head, and body. It SHALL re-read and match the PR identity, repository, base, head, body, open state, and draft state immediately before mutation.

#### Scenario: Agent omitted only the ready mutation

- **WHEN** a draft version-3 task-list candidate has every Implementation item checked and every exact pre-finalization input is valid
- **AND** its final re-read matches the inspected snapshot
- **THEN** trusted automation SHALL mark that pull request ready for review
- **AND** the resulting event SHALL invoke ordinary finalization followed by exact-head CI

#### Scenario: Implementation item remains unchecked

- **WHEN** any Implementation item remains unchecked
- **THEN** trusted automation SHALL leave the pull request draft
- **AND** Development test suites SHALL remain suppressed

#### Scenario: Body completion disagrees with authoritative records

- **WHEN** every PR-body item is checked but acceptance, detailed tasks, evidence, gap disposition, association, or target state is incomplete or invalid
- **THEN** trusted automation SHALL leave the pull request draft with an actionable stable reason
- **AND** it SHALL NOT repair, infer, or rewrite the missing state

#### Scenario: Candidate changes during promotion

- **WHEN** the candidate's head, body, base, repository identity, open state, or draft state changes after inspection
- **THEN** the promotion attempt SHALL stop without mutating readiness
- **AND** a later bounded event MAY inspect the new snapshot independently

### Requirement: Draft promotion preserves compatibility and integration authority

The ready mutation SHALL edit no body, branch content, task, evidence, specification, archive, manifest, auto-merge setting, or integration state. Unchecked, malformed, mixed, duplicated, generic, historical plain-list, unassociated, forked, stale, raced, or otherwise incomplete drafts SHALL remain draft with a stable summary and without comments or Development suites. Automation SHALL continue never to accept, arm auto-merge, or merge an implementation PR.

#### Scenario: Historical or unrelated draft is inspected

- **WHEN** a draft uses historical plain Implementation bullets, belongs to a fork, lacks a version-3 implementation association, or is unrelated to implementation delivery
- **THEN** trusted automation SHALL leave it unchanged
- **AND** its existing workflow route SHALL remain authoritative

#### Scenario: Invalid draft remains quiet

- **WHEN** a draft is incomplete, malformed, stale, or otherwise ineligible for promotion
- **THEN** inspection SHALL report a stable skip or blocking reason without comments, repeated body edits, Development suites, or a protected aggregate
- **AND** the pull request SHALL remain draft

#### Scenario: Ready automation lacks integration authority

- **WHEN** trusted automation promotes a complete draft and exact-head validation later succeeds
- **THEN** the pull request SHALL remain open without an automation-owned auto-merge arm or merge attempt
- **AND** only an authorized maintainer SHALL decide acceptance and integration for the unchanged validated head
