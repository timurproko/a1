## ADDED Requirements

### Requirement: Interactive launch forms are concurrently independent
A1 SHALL permit multiple simultaneous instances of bare `a1`, prerelease `a1 pi`, or both. Profile selection, profile data, lifecycle state, process containment, and closure SHALL remain scoped to the originating invocation rather than a product-wide foreground slot.

#### Scenario: Start the same profile twice
- **WHEN** the user starts two instances of the same retained profile
- **THEN** both SHALL launch independently without sharing foreground ownership

#### Scenario: Start both profile forms
- **WHEN** owned A1 or Pi-comparison instances are already active and another supported form is launched
- **THEN** the new invocation SHALL start independently without requiring an existing instance to exit

### Requirement: Launch-instance ownership preserves the shared rendering pipeline
The launch-instance lifecycle SHALL change process ownership and cleanup only. Bare `a1` and prerelease `a1 pi` SHALL retain the shared A1-owned rendering and input pipeline declared by the canonical launch profile, differing only in configuration root and product-surface availability.

#### Scenario: Compare profile paths under launch-instance ownership
- **WHEN** the user launches bare `a1` alongside prerelease `a1 pi`
- **THEN** both SHALL use the shared owned pipeline inside independent process-containment boundaries
