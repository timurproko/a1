## ADDED Requirements

### Requirement: Private environment renames preserve cross-version release execution
Changing a private environment spelling SHALL NOT require a running updater, installed launcher, retained release, rollback target, or recovery process to upgrade simultaneously. The transition SHALL preserve every caller/target environment-contract combination already supported by release activation and retention. A new release SHALL accept the classified legacy launch data sent by supported older callers, and a new caller SHALL supply the launch data understood by a supported older target. Legacy names SHALL remain only as exact compatibility data at the environment boundary, not as new branded internal identifiers.

Compatibility SHALL preserve release root, identity, digest, dependency-layer selection, launch profile, and required warmup or startup context, together with unchanged public configuration overrides. It SHALL NOT weaken immutable-root verification, content certification, ownership checks, containment, or existing startup and update budgets. It SHALL NOT rewrite immutable older releases, migrate persisted schemas, move user state, or terminate preserved sessions merely to remove a private spelling.

#### Scenario: An older updater activates a new release
- **WHEN** an updater using the pre-transition environment contract installs and activates a transition-aware release
- **THEN** the target SHALL receive and interpret the required release and warmup context successfully
- **AND** activation SHALL retain its existing verification and readiness requirements

#### Scenario: A new launcher starts a retained older release
- **WHEN** normal launch selects a supported retained release that reads legacy private environment keys
- **THEN** the caller SHALL supply that release's supported environment contract
- **AND** the guardian and UI SHALL retain the selected profile, session arguments, and cohort identity

#### Scenario: A new updater rolls back to an older release
- **WHEN** activation fails and rollback selects a verified pre-transition release
- **THEN** the prior release SHALL receive its required launch data and remain launchable under the existing rollback rules
- **AND** the environment rename SHALL NOT introduce a second rollback failure

#### Scenario: A session remains active during transition
- **WHEN** an update installs a release with neutral private environment spellings while an older retained session is working
- **THEN** the existing session SHALL retain its release, transcript, input, containment, and cohort connection
- **AND** subsequent launches SHALL select the appropriate release without requiring that session to restart

#### Scenario: Update replacement is interrupted
- **WHEN** cancellation or interruption leaves a pre-transition recovery capsule or launcher responsible for recovery
- **THEN** retry and recovery SHALL remain callable with the supported environment contracts and unchanged persisted capsule format

### Requirement: Compatibility environment handling resolves ambiguity without weakening trust
Private launch context SHALL be validated as a coherent set before it is used. A receiving process supplied only the canonical form or only an approved legacy form SHALL apply the same value validation. Equivalent canonical and legacy forms SHALL resolve to the same context. Conflicting non-equivalent representations SHALL fail with a bounded diagnostic rather than silently select a release, mix identities, or fall back to user-default paths. Diagnostics SHALL identify the conflicting logical setting without dumping unrelated environment values.

An owning parent constructing context for a verified target SHALL replace inherited values for that owned context with the selected target's coherent values before emitting canonical and any required legacy forms. It SHALL preserve unrelated public and third-party settings, and SHALL not treat arbitrary ambient environment variables as proof of a target's release identity or compatibility support. Platform-specific environment-name casing SHALL not permit ambiguous duplicate private keys.

#### Scenario: Only the older contract is supplied
- **WHEN** a supported older parent supplies complete approved legacy context to a transition-aware child
- **THEN** the child SHALL normalize it and perform the same validation required for canonical context

#### Scenario: Both representations agree
- **WHEN** canonical and legacy context representations are equivalent
- **THEN** the child SHALL resolve one coherent context without duplicating work

#### Scenario: Both representations conflict
- **WHEN** canonical and legacy keys identify different release roots, identities, profiles, or other owned context values
- **THEN** the receiving process SHALL reject the conflict before using that context
- **AND** it SHALL NOT hide the conflict through alias precedence or default-path fallback

#### Scenario: A nested launch inherits stale context
- **WHEN** an owning launcher selects a verified target but inherits context from a different session or release
- **THEN** it SHALL replace the owned outgoing context with the selected target's values before launching the child
- **AND** unrelated user-facing configuration SHALL remain unchanged

### Requirement: Release environment transitions have independent compatibility evidence
Acceptance of a private environment transition SHALL require execution evidence for new-to-new, supported old-to-new, and new-to-supported-old boundaries, including activation, retained launch, rollback, and interrupted-update recovery. Legacy fixtures SHALL preserve the actual pre-transition key-writing and key-reading behavior; using the current implementation with only an older version label SHALL NOT constitute cross-version evidence. Existing public settings, platform path resolution, immutable-release verification, session continuity, and startup budgets SHALL remain acceptance gates.

#### Scenario: A compatibility fixture merely changes a version label
- **WHEN** a test labels current canonical-only code as an older release
- **THEN** that test SHALL NOT satisfy the legacy environment compatibility requirement

#### Scenario: A transition is accepted
- **WHEN** compatibility evidence is reviewed before the transition is shipped
- **THEN** it SHALL include independently preserved legacy-contract producers and consumers, both transition directions, conflict cases, recovery, and unchanged public-setting behavior on supported platforms
