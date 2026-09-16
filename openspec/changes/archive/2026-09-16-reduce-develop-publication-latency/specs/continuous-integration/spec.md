## ADDED Requirements

### Requirement: Publication lanes deduplicate exact-package installation
When one preview, nightly, or stable publication platform/runtime lane selects multiple exact-package owners that consume the same candidate and require the same clean installed package, validation SHALL reuse a compatible downloaded candidate receipt without repacking and SHALL prepare that immutable installation once for the lane. The lane-local receipt SHALL bind the downloaded candidate to the same exact build receipt used by validation. Each selected owner SHALL retain a distinct outcome, its declared assertions, and all applicable platform/runtime coverage. Validation SHALL record the preparation identity, count, duration, candidate digest, and consuming owners, and SHALL fail closed if any consumer cannot prove it used that exact preparation.

Reusable preparation SHALL remain scoped to one lane and one exact candidate. It SHALL NOT cross platform, architecture, Node runtime, workflow run, run attempt, candidate digest, or installation-policy identity boundaries. Failure or cancellation of shared preparation SHALL fail every dependent owner and SHALL block publication without reporting an owner as passed or skipped.

#### Scenario: Package contracts and startup share one lane
- **WHEN** one publication lane selects package-contract and first-attempt startup owners for the same exact candidate
- **THEN** the lane SHALL reuse compatible downloaded candidate evidence and perform exactly one clean installed-package preparation for those owners
- **AND** startup SHALL execute immediately after preparation and before package-contract workload
- **AND** each owner SHALL execute once and report a separate result

#### Scenario: Downloaded candidate receipt is compatible
- **WHEN** a lane receives exact candidate bytes and source identity with a package receipt bound to that lane's exact build receipt
- **THEN** validation SHALL accept the existing candidate without invoking lane-local packing
- **AND** contradictory candidate, source, or build evidence SHALL remain fail-closed

#### Scenario: Preparation identity differs
- **WHEN** selected consumers differ by candidate digest, platform, architecture, Node runtime, run attempt, or installation-policy identity
- **THEN** validation SHALL NOT reuse the installed package across that boundary
- **AND** every required lane SHALL retain its own verified preparation

#### Scenario: Shared preparation fails
- **WHEN** the lane's exact-package installation fails, is cancelled, or produces missing or contradictory identity evidence
- **THEN** every dependent owner SHALL remain unsuccessful
- **AND** publication SHALL be blocked before npm is contacted

#### Scenario: Publication timing is inspected
- **WHEN** validation evidence for a lane selecting multiple exact-package consumers is reviewed
- **THEN** it SHALL show one preparation count and duration plus each consuming owner's independent duration and outcome
- **AND** a repeated equivalent clean install SHALL fail the structural regression contract rather than being hidden in aggregate elapsed time
