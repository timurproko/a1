## ADDED Requirements

### Requirement: Implementation progress is visible without changing acceptance semantics

Every newly authored version-3 implementation-bound pull request SHALL present its approved scope under `Implementation` as two to ten distinct Markdown task-list items. Each item SHALL describe an implementation-specific outcome at a useful review granularity and SHALL remain separate from the detailed OpenSpec task ledger. Generic CI, review, approval, acceptance, merge, or archive steps SHALL NOT be represented as implementation-progress items.

The agent SHALL leave each item unchecked during planning and SHALL change only its checkbox marker to checked after the associated implementation, focused evidence, and detailed task bookkeeping are complete. Adding, removing, reordering, or changing item wording after approval SHALL be an implementation-scope refinement requiring explicit maintainer approval and coherent planning-artifact reconciliation; affected scope SHALL remain unchecked until complete.

A pull request using Implementation task-list syntax SHALL NOT become ready or finalize while any item is unchecked or malformed. Historical version-3 pull requests containing only plain Implementation bullets SHALL remain readable without body rewrites. Final `Acceptance` scenarios SHALL remain plain bullets, SHALL NOT inherit Implementation checkbox state, and SHALL continue to become accepted only through authorized maintainer integration of the exact validated head.

#### Scenario: Draft exposes approved implementation scope

- **WHEN** an agent creates a new version-3 draft delivery PR
- **THEN** its `Implementation` section SHALL contain two to ten unchecked implementation-specific task items derived from the proposed scope
- **AND** GitHub's native task progress SHALL expose the completed and total implementation item counts

#### Scenario: Agent completes one scope item

- **WHEN** the associated implementation, focused evidence, and detailed OpenSpec tasks are complete
- **THEN** the agent SHALL change only that PR-body item's marker from unchecked to checked
- **AND** the unchanged item wording and ordering SHALL continue to describe the approved scope

#### Scenario: Implementation scope changes after approval

- **WHEN** an item must be added, removed, reordered, or rewritten
- **THEN** the change SHALL require explicit maintainer refinement approval and coherent updates to the planning artifacts
- **AND** new or affected scope SHALL remain unchecked until its implementation and evidence are complete

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
