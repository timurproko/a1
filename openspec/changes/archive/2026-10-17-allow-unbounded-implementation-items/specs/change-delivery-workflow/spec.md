## MODIFIED Requirements

### Requirement: Implementation progress is visible without changing acceptance semantics

Every newly authored version-3 implementation-bound pull request SHALL present its approved scope under `Implementation` as one or more distinct Markdown task-list items, with no fixed maximum item count. Each item SHALL describe a delivered implementation outcome at a useful review granularity and SHALL remain separate from the detailed OpenSpec task ledger. Generic CI, review, approval, acceptance, merge, or archive steps SHALL NOT be represented as implementation-progress items, and no item SHALL name running, verifying, validating, recording evidence for, or manually testing work.

The agent SHALL leave each item unchecked during planning and SHALL change only its checkbox marker to checked after the associated code and its tests are written and detailed task bookkeeping is complete. Executing tests SHALL belong to CI after readiness, and manual validation SHALL NOT gate a checkbox. Adding, removing, reordering, or changing item wording after approval SHALL be an implementation-scope refinement requiring explicit maintainer approval and coherent planning-artifact reconciliation; affected scope SHALL remain unchecked until complete.

A pull request using Implementation task-list syntax SHALL NOT become ready or finalize while any item is unchecked or malformed. Historical version-3 pull requests containing only plain Implementation bullets, or items written under the earlier wording rule, SHALL remain readable without body rewrites. Final `Acceptance` scenarios SHALL remain plain bullets, SHALL NOT inherit Implementation checkbox state, and SHALL continue to become accepted only through authorized maintainer integration of the exact validated head.

#### Scenario: Draft exposes approved implementation scope

- **WHEN** an agent creates a new version-3 draft delivery PR
- **THEN** its `Implementation` section SHALL contain at least one unchecked implementation-specific task item derived from the proposed scope
- **AND** it SHALL permit additional distinct outcome-sized items without a fixed item-count maximum
- **AND** GitHub's native task progress SHALL expose the completed and total implementation item counts

#### Scenario: Focused change has one implementation outcome

- **WHEN** the approved scope contains one independently understandable delivered code outcome
- **THEN** the draft SHALL represent that scope with one Implementation item
- **AND** it SHALL NOT invent or split scope merely to meet a minimum count above one

#### Scenario: Large change has more than ten implementation outcomes

- **WHEN** the approved scope contains more than ten independently completable delivered code outcomes
- **THEN** the draft SHALL permit each outcome to remain a separate Implementation item
- **AND** it SHALL NOT combine unrelated outcomes merely to meet a maximum item count

#### Scenario: Agent completes one scope item

- **WHEN** the associated code and its tests are written and the detailed OpenSpec tasks are complete
- **THEN** the agent SHALL change only that PR-body item's marker from unchecked to checked
- **AND** the unchanged item wording and ordering SHALL continue to describe the approved scope

#### Scenario: Item names validation instead of an outcome

- **WHEN** a draft's Implementation item starts with a run, verify, validate, confirm, prove, or test instruction, mentions manual testing, records or captures evidence, or delivers work with coverage, evidence, or validation
- **THEN** draft promotion and the local delivery body check SHALL refuse it with `implementation-progress-validation`
- **AND** post-merge readers SHALL continue to accept merged bodies written under the earlier wording rule

#### Scenario: Implementation scope changes after approval

- **WHEN** an item must be added, removed, reordered, or rewritten
- **THEN** the change SHALL require explicit maintainer refinement approval and coherent updates to the planning artifacts
- **AND** new or affected scope SHALL remain unchecked until its code and tests are written

#### Scenario: Checklist remains incomplete at readiness

- **WHEN** a version-3 candidate uses Implementation task-list syntax and at least one item is unchecked, mixed with plain bullets, malformed, duplicated, or generic process boilerplate
- **THEN** trusted finalization SHALL fail closed with an actionable implementation-progress reason
- **AND** it SHALL NOT interpret partial implementation progress as acceptance

#### Scenario: Historical body uses plain Implementation bullets

- **WHEN** a historical version-3 body contains only the former plain-bullet Implementation form
- **THEN** trusted readers SHALL preserve compatibility without requiring a merged-body edit
- **AND** the compatibility path SHALL NOT permit mixed plain and task-list syntax

#### Scenario: Completed candidate presents acceptance

- **WHEN** every Implementation task-list item and detailed OpenSpec task is complete and the candidate is prepared for finalization
- **THEN** `Acceptance` SHALL contain plain implementation-specific behavior-and-result bullets rather than checkboxes
- **AND** authorized maintainer integration of the exact validated head SHALL remain the acceptance decision
