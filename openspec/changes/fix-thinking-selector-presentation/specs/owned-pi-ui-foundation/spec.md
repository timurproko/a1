## ADDED Requirements

### Requirement: The bare-A1 thinking selector uses the established heading treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. The presentation change SHALL preserve the selector's borders, spacing, search input, level descriptions, current/default markers, navigation, selection, default persistence, cancellation, focus, and restoration behavior.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, saves a default level, or cancels the selector
- **THEN** the selector SHALL retain its existing interaction and restoration outcomes
- **AND** heading styling SHALL NOT alter list geometry, focus, or instruction placement
