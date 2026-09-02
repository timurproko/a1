## ADDED Requirements

### Requirement: Successful update initiates bounded release cleanup
Before reporting a completed update, A1 SHALL durably commit the protected release set and a restart-safe cleanup disposition for obsolete releases. Potentially long physical deletion MAY continue after that commit, but update and later noninteractive maintenance entry points SHALL resume incomplete cleanup without requiring manual state or directory deletion.

#### Scenario: Update activates a new release
- **WHEN** the new release is certified, active, and served by a verified supervisor
- **THEN** the update SHALL commit retention of the active, rollback, pending, live, and externally held releases
- **AND** SHALL initiate collection of every other known release

#### Scenario: Historical append-only state exists
- **WHEN** the first cleanup-aware update reads a valid older cohort state whose retention list contains every previously activated release
- **THEN** A1 SHALL migrate it to the bounded protected set without deleting a release used by a verified live cohort or rollback

#### Scenario: Physical deletion is slow
- **WHEN** removing an obsolete release tree would materially delay return to the invoking shell
- **THEN** A1 SHALL preserve the committed cleanup disposition and continue deletion through bounded maintenance rather than retaining the release indefinitely

#### Scenario: Cleanup cannot delete one release
- **WHEN** an obsolete contained release cannot be moved or deleted because of a transient filesystem failure
- **THEN** the successful activation SHALL remain authoritative, A1 SHALL retain actionable cleanup diagnostics, and a later maintenance pass SHALL retry safely

### Requirement: Abandoned release artifacts are reconciled
A1 SHALL eventually remove abandoned candidate directories, managed trash, and certification evidence that no protected release or active transaction references. Reconciliation SHALL remain bounded during interactive launch and SHALL not delete profile settings, credentials, sessions, extensions, skills, prompts, themes, or unrelated files.

#### Scenario: Update was interrupted before candidate commit
- **WHEN** a private candidate directory remains from an update process that is no longer live and no active transaction can commit it
- **THEN** bounded cleanup SHALL remove that candidate

#### Scenario: Old certification evidence remains
- **WHEN** its release record and immutable root have been safely detached and no protected reference names the release
- **THEN** A1 SHALL remove the corresponding obsolete certification evidence

#### Scenario: Interactive launch encounters a large backlog
- **WHEN** launch discovers more obsolete content than its bounded maintenance allowance can remove
- **THEN** launch SHALL continue toward the interactive UI and SHALL preserve enough cleanup state for later maintenance to finish
