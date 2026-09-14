## ADDED Requirements

### Requirement: Successful update initiates bounded release cleanup
Before reporting a completed update, A1 SHALL durably commit the protected release set and a restart-safe cleanup disposition for obsolete releases. Potentially long physical deletion MAY continue after that commit, but the update SHALL start background maintenance that continues ordinary eligible work to completion without requiring another user command. Update and later maintenance entry points SHALL resume interrupted or temporarily blocked cleanup without requiring manual state or directory deletion, and SHALL retain bounded evidence of worker progress, continuation, and top-level failure.

#### Scenario: Update activates a new release
- **WHEN** the new release is certified, active, and served by a verified supervisor
- **THEN** the update SHALL commit retention of the active, rollback, pending, live, and externally held releases
- **AND** SHALL initiate collection of every other known release

#### Scenario: Historical append-only state exists
- **WHEN** the first cleanup-aware update reads a valid older cohort state whose retention list contains every previously activated release
- **THEN** A1 SHALL migrate it to the bounded protected set without deleting a release used by a verified live cohort or rollback

#### Scenario: Physical deletion is slow
- **WHEN** removing an obsolete release tree would materially delay return to the invoking shell
- **THEN** A1 SHALL preserve the committed cleanup disposition and continue deletion through bounded background maintenance rather than retaining the release indefinitely

#### Scenario: Backlog exceeds one maintenance allowance
- **WHEN** a successful update leaves more eligible obsolete content than one bounded maintenance batch can process
- **THEN** background maintenance SHALL continue or arrange its own continuation until the eligible backlog is drained without requiring another launch or update

#### Scenario: Preparation consumes the batch allowance
- **WHEN** discovery, ownership checks, or durable state preparation consume the nominal duration of a non-empty maintenance batch
- **THEN** the background worker SHALL still attempt eligible cleanup work and SHALL NOT repeatedly exit with zero progress

#### Scenario: Cleanup cannot delete one release
- **WHEN** an obsolete contained release cannot be moved or deleted because of a transient filesystem failure
- **THEN** the successful activation SHALL remain authoritative, A1 SHALL retain actionable cleanup diagnostics, other eligible items SHALL remain able to progress, and bounded maintenance SHALL retry safely

#### Scenario: Detached worker fails unexpectedly
- **WHEN** a scheduled cleanup worker exits before recording successful completion
- **THEN** A1 SHALL retain every incomplete disposition, record bounded worker failure or incomplete-run evidence, and resume safely through its continuation or the next maintenance entry point

### Requirement: Abandoned release artifacts are reconciled
A1 SHALL eventually remove abandoned candidate directories, managed trash, and certification evidence that no protected release or active transaction references. Reconciliation SHALL remain bounded during interactive launch and SHALL not delete profile settings, credentials, sessions, extensions, skills, prompts, themes, or unrelated files.

#### Scenario: Update was interrupted before candidate commit
- **WHEN** a private candidate directory remains from an update process that is no longer live and no active transaction can commit it
- **THEN** bounded cleanup SHALL remove that candidate

#### Scenario: Old certification evidence remains
- **WHEN** its release record and immutable root have been safely detached and no protected reference names the release
- **THEN** A1 SHALL remove the corresponding obsolete certification evidence

#### Scenario: Legacy Windows path casing differs
- **WHEN** valid legacy state spells the managed Windows data directory with different letter casing from the current canonical path
- **THEN** A1 SHALL recognize the same managed identity, remove only the canonical obsolete evidence, and SHALL NOT authorize deletion outside the managed data directory

#### Scenario: Interactive launch encounters a large backlog
- **WHEN** launch discovers more obsolete content than its bounded scheduling allowance can remove
- **THEN** launch SHALL continue toward the interactive UI and SHALL start or signal background maintenance with enough durable cleanup state to finish

#### Scenario: Several artifact classes remain
- **WHEN** detached releases, managed trash, stale candidates, obsolete certifications, dependency artifacts, or caches are simultaneously eligible
- **THEN** bounded maintenance SHALL make fair progress without allowing one repeatedly failing identity or artifact class to starve the others
