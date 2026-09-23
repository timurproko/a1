## ADDED Requirements

### Requirement: Bare A1 progress labels share one quiet animated presentation
Every built-in or extension working message rendered by bare A1's spinner-backed status surface SHALL use the shared A1 progress presentation. This SHALL include ordinary working, retry, compaction, measured compaction progress, and extension override labels. Changing the presentation SHALL NOT change semantic work-state transitions, spinner glyphs, status placement, replacement behavior, extension lifecycle, cancellation, teardown, or the pinned comparison profile.

#### Scenario: Show each built-in work state
- **WHEN** bare A1 displays working, retry, compaction, or measured compaction progress beside its spinner
- **THEN** the label SHALL end in one Unicode ellipsis and use the same restrained accent animation
- **AND** its spinner and semantic wording SHALL retain their existing behavior

#### Scenario: Show extension-provided work
- **WHEN** an extension supplies or replaces the active working message
- **THEN** bare A1 SHALL normalize and animate that label through the same shared progress presentation
- **AND** clearing or replacing the extension state SHALL retain the existing lifecycle behavior

#### Scenario: Use the pinned comparison profile
- **WHEN** the user runs `a1 pi`
- **THEN** its spinner-backed status SHALL retain pinned Pi's text, styling, timing, and geometry
- **AND** the A1-only Unicode marker and text animation SHALL be absent

#### Scenario: Finish active work
- **WHEN** a working state settles, is replaced by a non-spinner status, or the session is disposed
- **THEN** the animated label SHALL stop with the existing spinner lifecycle
- **AND** no animation timer or stale styled status SHALL remain
