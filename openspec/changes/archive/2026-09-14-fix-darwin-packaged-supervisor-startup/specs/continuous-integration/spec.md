## ADDED Requirements

### Requirement: macOS release validation proves packaged supervision and containment
Pull-request and exact-package validation for changes affecting supervision, containment, release startup, or native guardian artifacts SHALL exercise the supported macOS path rather than accepting build success alone. Exact-package preview publication SHALL remain ineligible unless the macOS package starts a correlated supervisor, launches the packaged public command through certified Darwin containment, completes representative resume and cleanup behavior, and reports actionable startup diagnostics on injected failure.

#### Scenario: macOS supervisor starts from exact packaged bytes
- **WHEN** the macOS exact-package lane materializes and launches a preview candidate
- **THEN** the selected supervisor SHALL publish verified endpoint metadata for the candidate and the packaged public launch chain SHALL reach input-ready state

#### Scenario: Darwin native containment regresses
- **WHEN** process identity, process-group creation, foreground transfer, parent-loss cleanup, artifact support, or guardian integrity fails on macOS
- **THEN** a required pull-request or exact-package macOS check SHALL fail before publication

#### Scenario: Detached supervisor fails before listening
- **WHEN** a macOS validation fixture injects a pre-listen supervisor failure
- **THEN** validation SHALL observe the bounded correlated diagnostic rather than waiting for an undifferentiated endpoint timeout

#### Scenario: Development publication is accepted
- **WHEN** `npm run develop` selects a new authoritative candidate after this correction merges
- **THEN** Windows Node 22/24, Linux Node 24, and macOS Node 24 exact-package lanes, the npm publisher, the aggregate result, and registry `next` verification SHALL all succeed for the same package bytes
