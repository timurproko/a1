## MODIFIED Requirements

### Requirement: Trusted automation promotes only a complete draft snapshot

The trusted default-branch finalization entrypoint SHALL mark a draft ready only when one exact same-repository version-3 snapshot targets `develop`, has every current-form `Implementation` item checked, contains valid plain `Acceptance`, and satisfies existing pre-finalization checks for association, detailed tasks, evidence, gaps, target, head, and body. It SHALL re-read and match the PR identity, repository, base, head, body, open state, and draft state immediately before mutation. When every task-list `Implementation` item is checked but promotion is refused for a content reason, the finalization run SHALL fail visibly with that stable reason instead of completing successfully.

#### Scenario: Final checkbox exposes an eligible draft

- **WHEN** a draft version-3 task-list candidate has every Implementation item checked and every exact pre-finalization input is valid
- **AND** its final re-read matches the inspected snapshot
- **THEN** trusted automation SHALL mark that pull request ready for review
- **AND** the resulting event SHALL invoke ordinary finalization followed by exact-head CI

#### Scenario: Implementation item remains unchecked

- **WHEN** any Implementation item remains unchecked
- **THEN** trusted automation SHALL leave the pull request draft
- **AND** Development test suites SHALL remain suppressed
- **AND** the finalization run SHALL complete successfully with a stable skip reason

#### Scenario: Body completion disagrees with authoritative records

- **WHEN** every PR-body item is checked but acceptance, detailed tasks, evidence, gap disposition, association, or target state is incomplete or invalid
- **THEN** trusted automation SHALL leave the pull request draft with an actionable stable reason
- **AND** the finalization run SHALL fail with an error annotation naming that reason
- **AND** it SHALL NOT repair, infer, or rewrite the missing state

#### Scenario: Candidate changes during promotion

- **WHEN** the final pre-mutation re-read differs from the inspected head, body, base, repository identity, open state, or draft state
- **THEN** the promotion attempt SHALL stop without mutating readiness
- **AND** a later bounded event MAY inspect the new snapshot independently

## ADDED Requirements

### Requirement: Agents verify the delivery body before the final checkbox

The repository SHALL provide a local delivery body check that applies the same version-3 association, Implementation progress, layout, and Acceptance validators as trusted promotion to a body file or pull request and reports the stable reason for any defect. Before checking the final `Implementation` item, the agent SHALL run that check against the intended final body and SHALL NOT check the final item while it reports a defect.

#### Scenario: Final body contains a rejected item

- **WHEN** an agent checks an intended final body whose Acceptance item contains an angle-bracket placeholder, HTML, a URL, or an `@` mention
- **THEN** the check SHALL exit unsuccessfully with the same stable reason trusted promotion would report
- **AND** the agent SHALL correct the body before checking the final Implementation item

#### Scenario: Final body is valid

- **WHEN** the intended final body passes every body validator
- **THEN** the check SHALL report success
- **AND** detailed tasks, evidence, and target state SHALL remain subject to the existing pre-finalization checks
