## ADDED Requirements

### Requirement: Development publication recovery and observation

The local develop command SHALL report an already-published preview only when both exact application and installer package versions exist and both dedicated public next tags name that version. An absent or partially present package pair, staged-only pair, or partially promoted pair SHALL dispatch the existing authoritative development publication workflow. Recovery SHALL show explicit intent followed by the same run link, live job statuses and available step counts, and final outcome as a fresh publication. Existing immutable-byte verification, native smoke, promotion prerequisites, newer-tag refusal, and safe interruption behavior SHALL remain unchanged. Workflow success SHALL be followed by verification of both exact versions and both public next tags; registry errors, malformed tag responses, absent versions, or wrong tags SHALL NOT be reported as successful publication. Recovery SHALL NOT overwrite existing package bytes or write npm tags locally.

#### Scenario: Both packages are already promoted

- **WHEN** both exact package versions exist and both next tags name that preview
- **THEN** the command SHALL report the preview already published without dispatching another workflow

#### Scenario: Staged or partially promoted packages exist

- **WHEN** one or both exact package versions exist but either next tag does not name the preview
- **THEN** the command SHALL report recovery intent and dispatch the existing development publication workflow
- **AND** existing registry bytes SHALL be verified and exercised before public promotion rather than overwritten

#### Scenario: No packages exist yet

- **WHEN** neither exact package version exists
- **THEN** the command SHALL request ordinary publication through the same workflow and observer

#### Scenario: Recovery is running or fails

- **WHEN** the recovery workflow has started
- **THEN** the terminal SHALL show its run link, live job outcomes and available step counts through the ordinary publication observer
- **AND** a failed workflow SHALL retain the existing actionable failure summary instead of reporting success because package versions exist

#### Scenario: Successful workflow leaves registry publication incomplete

- **WHEN** the workflow succeeds but an exact package is absent or a next tag names another version
- **THEN** the command SHALL fail with the affected package or tag instead of claiming publication completed

#### Scenario: Registry state cannot be read safely

- **WHEN** an exact-version or dedicated dist-tag request fails or returns malformed tag data
- **THEN** the command SHALL surface that failure rather than infer completed publication or silently dispatch recovery from an unknown state
