## ADDED Requirements

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Each level SHALL render its description inline after the level title in semantic muted grey regardless of cursor selection. The active session level SHALL have exactly one semantic success-green checkmark after its description and SHALL NOT be repeated in a detail row below the list. The presentation change SHALL preserve the selector's borders, spacing, search input, default marker, navigation, selection, default persistence, cancellation, focus, and restoration behavior.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** each description SHALL appear immediately after its level title in semantic muted grey
- **AND** only the active session level SHALL end with one semantic success-green checkmark
- **AND** no selected-level detail SHALL be repeated below the list

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, saves a default level, or cancels the selector
- **THEN** the selector SHALL retain its existing interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, focus, or instruction placement
