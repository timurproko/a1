## ADDED Requirements

### Requirement: Published-predecessor evidence avoids duplicate exact installations

Complete exact-package validation SHALL allow its published-predecessor owner to consume the package shard's one already prepared exact candidate installation only after the validation runner verifies its receipt, candidate digest, package identity, installed content identity, runtime lane, run attempt, and authorized consumer before the invocation. The runner SHALL verify the installation again after the invocation and SHALL retain its existing bounded cleanup. An arbitrary, cross-run, cross-runtime, stale, or unverified installed tree SHALL NOT substitute for the exact candidate.

Within one sequential predecessor fixture, the newest selected predecessor MAY retain its one npm-installed private prefix after materialization and warmup and use that same still-owned, previously unmodified tree for the applicable Windows protected-replacement assertion. Every other selected recent predecessor SHALL still execute its own published release code, and an explicitly declared historical bridge SHALL retain a separate exact npm installation. Installation reuse SHALL NOT reduce predecessor count, skip behavior, share mutable state between shards, run npm installations concurrently, increase deadlines, retry failures, or replace npm-produced topology with copied, linked, or manually extracted package trees.

#### Scenario: Predecessor validation starts after exact-package preparation
- **WHEN** the package shard has authenticated one exact candidate installation for all declared package consumers
- **THEN** published-predecessor validation SHALL use that same verified candidate root without a second candidate npm installation
- **AND** pre- and post-invocation verification SHALL bind the root to the exact candidate and current runtime lane

#### Scenario: The immediate predecessor serves both compatibility assertions
- **WHEN** the newest selected predecessor has completed materialization and warmup from its npm-installed private prefix
- **THEN** the Windows direct protected-replacement case MAY consume that same fixture-owned unmodified installation
- **AND** the predecessor SHALL still perform its real replacement, launcher, activation, and callable-command behavior before the root is discarded

#### Scenario: Other predecessor identities are selected
- **WHEN** validation selects the remaining recent predecessors and the declared historical bridge
- **THEN** each distinct selected package SHALL retain its own exact npm installation and execute its own shipped release code
- **AND** retaining the immediate predecessor SHALL NOT satisfy or suppress another version's evidence

#### Scenario: Shared installation authority is absent or changes
- **WHEN** the candidate handoff is absent, stale, belongs to another lane or run, has changed installed bytes, or does not authorize the predecessor consumer
- **THEN** predecessor validation SHALL fail before using that root rather than installing an untracked fallback or accepting partial evidence
- **AND** fixture and exact-package cleanup SHALL retain their existing ownership and failure semantics
