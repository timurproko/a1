# Spec Delta

## ADDED Requirements

### Requirement: Auto-merge provenance recognizes method-specific enable events

Human-arm preservation and merge-time verification SHALL treat the issue-timeline events `auto_merge_enabled`, `auto_squash_enabled`, and `auto_rebase_enabled` as the same native auto-merge enable, and `auto_merge_disabled` as its disable. Recognizing an enable SHALL NOT relax any other provenance rule: the enabling actor SHALL still be an authorized human without an App, the enable SHALL still follow the final committed head with no later candidate change, and legacy manual-only acceptance SHALL still refuse any recognized enable.

#### Scenario: Squash enable on a finalized implementation head is preserved

- **WHEN** an authorized human enables squash auto-merge on the exact finalized version-3 head and the timeline records `auto_squash_enabled`
- **THEN** documentation automation SHALL leave that arm intact
- **AND** after GitHub integrates the head, merge-time verification SHALL record human-enabled auto-merge

#### Scenario: Manual merge after policy-disarmed method-specific enables verifies

- **WHEN** a maintainer's `auto_squash_enabled` attempts were each followed by `auto_merge_disabled` and the same maintainer then manually merges the exact validated head
- **THEN** merge-time verification SHALL record manual integration rather than contradictory provenance

#### Scenario: Method-specific enables keep existing refusals

- **WHEN** a method-specific enable comes from a bot or App, precedes the final commit, or appears on a legacy manual-only acceptance PR
- **THEN** verification SHALL refuse it as before
