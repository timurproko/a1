## ADDED Requirements

### Requirement: Publication lanes deduplicate exact-package installation
When one preview, nightly, or stable publication platform/runtime lane selects multiple exact-package owners that consume the same candidate and require the same clean installed package, validation SHALL prepare that immutable installation once for the lane. Each selected owner SHALL retain a distinct outcome, its declared assertions, and all applicable platform/runtime coverage. Validation SHALL record the preparation identity, count, duration, candidate digest, and consuming owners, and SHALL fail closed if any consumer cannot prove it used that exact preparation.

Reusable preparation SHALL remain scoped to one lane and one exact candidate. It SHALL NOT cross platform, architecture, Node runtime, workflow run, run attempt, candidate digest, or installation-policy identity boundaries. Failure or cancellation of shared preparation SHALL fail every dependent owner and SHALL block publication without reporting an owner as passed or skipped.

#### Scenario: Package contracts and startup share one lane
- **WHEN** one publication lane selects package-contract and first-attempt startup owners for the same exact candidate
- **THEN** the lane SHALL perform exactly one clean installed-package preparation for those owners
- **AND** each owner SHALL execute once and report a separate result

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
