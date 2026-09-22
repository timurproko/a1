## ADDED Requirements

### Requirement: Bare-A1 dialogs share one shortcut-hint presentation

Every shortcut-bearing modal, selector, dialog, nested flow, custom input/editor, confirmation, authentication surface, startup trust selector, extension-hosted modal, and owned full-screen dialog presented by bare A1 SHALL use the shared shortcut-row presentation. Full-screen dialogs include Settings and the shared Changelog/Hotkeys reference screen. Effective shortcut labels SHALL continue to come from the bindings and platform rules used by the corresponding action. Applying the presentation SHALL NOT change wording, focus, navigation, search, editing, save/confirm behavior, cancellation, viewport behavior, transitions, restoration, or disposal.

The explicit `a1 pi` comparison profile SHALL retain its pinned dialog presentation. Ordinary shell help, status, transcript, and footer surfaces SHALL remain outside this dialog styling rule.

#### Scenario: Open a bare-A1 modal
- **WHEN** any shortcut-bearing bare-A1 modal node is presented
- **THEN** its instruction row SHALL show shortcut labels and action names in distinct semantic colors
- **AND** adjacent shortcut entries SHALL use whitespace without middle-dot or bullet separators

#### Scenario: Open a full-screen owned dialog
- **WHEN** Settings, Changelog, or Hotkeys is presented as a full-screen owned route
- **THEN** its standing shortcut row SHALL use distinct key/action colors and whitespace-only entry gaps
- **AND** its frame, content, scrolling, search, and close behavior SHALL remain unchanged

#### Scenario: Open a nested or extension-hosted modal
- **WHEN** a modal flow replaces its parent with a nested confirmation, input, editor, authentication, or extension-hosted surface
- **THEN** every shortcut-bearing depth SHALL retain the same shared hint presentation
- **AND** completing, cancelling, or returning SHALL preserve the existing transition and focus-restoration behavior

#### Scenario: Resolve customized or platform-specific bindings
- **WHEN** a modal action has a customized binding, no effective binding, or a platform-specific display label
- **THEN** its hint SHALL use the same effective label and omission behavior as dispatch
- **AND** styling SHALL NOT manufacture a default key or change the invoked action

#### Scenario: Ask for project trust before resources load
- **WHEN** the pre-resource trust selector is presented
- **THEN** its fixed-color shortcut row SHALL provide the same distinct key/action roles and separator-free spacing
- **AND** rendering it SHALL NOT load project settings, themes, extensions, packages, skills, or post-trust Pi components

#### Scenario: Use the comparison profile
- **WHEN** the same modal route is presented through `a1 pi`
- **THEN** its pinned shortcut presentation SHALL remain unchanged by the bare-A1 customization

#### Scenario: Audit dialog completeness
- **WHEN** modal inventory and owned full-screen route coverage run
- **THEN** every shortcut-bearing bare-A1 dialog node or route SHALL be mapped to the shared presentation or the isolated pre-resource equivalent
- **AND** an unmapped shortcut row, a whole-line single-color hint, or a middle-dot/bullet entry separator SHALL fail coverage
