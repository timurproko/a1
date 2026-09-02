## ADDED Requirements

### Requirement: The owned shell preserves setting-controlled Pi behavior
Every Pi setting the A1-owned settings replacement presents SHALL control the same active-session, presentation, terminal, startup, or shutdown behavior that the pinned Pi setting controls. The replacement SHALL not count persistence, callback reachability, or selector rendering as preservation of a pinned capability. An inventory entry with no effect in the active product mode or environment SHALL be omitted from the settings UI rather than rendered as an unavailable option. A supported setting that provides a defined terminal fallback remains present and SHALL render that fallback truthfully.

#### Scenario: Change a pinned live setting through bare A1
- **WHEN** the user changes a setting that pinned Pi applies live
- **THEN** bare A1 SHALL update the equivalent active agent, component, or terminal behavior in the same session

#### Scenario: Re-render existing transcript content
- **WHEN** an image, thinking-visibility, Mermaid, width, or output-padding setting changes
- **THEN** existing affected transcript blocks SHALL be reconstructed or invalidated with stable semantic identity and SHALL show the new presentation

#### Scenario: Use a terminal without inline-image support
- **WHEN** the transcript contains an image but the terminal advertises no protocol supported by the pinned renderer
- **THEN** the attachment SHALL remain visible through a textual fallback and inline-image availability SHALL not be claimed

#### Scenario: Exit the owned fullscreen surface
- **WHEN** the shell disposes after `fullscreenExitOutput` has selected transcript or resume-hint output
- **THEN** the output SHALL appear only after alternate-screen restoration and SHALL match the selected mode

#### Scenario: Start before project trust is known
- **WHEN** no effective project-trust decision has been resolved
- **THEN** the owned runtime SHALL not construct a project-trusted resource pipeline or load project-scoped resources

#### Scenario: An inventory setting has no behavioral consumer
- **WHEN** conformance finds a setting that cannot change its declared observable behavior in the active product mode or environment
- **THEN** the owned settings UI SHALL omit the option
- **AND** the owned-shell acceptance gate SHALL fail if the option is rendered even when disabled or accompanied by explanatory text

### Requirement: Setting-controlled owned surfaces preserve pinned Pi visual semantics
For the same terminal dimensions, theme, capabilities, semantic content, setting values, and lifecycle state, every visible surface controlled by a Pi setting SHALL match pinned Pi's terminal-cell presentation. Parity SHALL include visible text and punctuation, semantic foreground and background styling, bold/dim/italic/underline roles, borders, padding, blank rows, row order, wrapping, truncation, alignment, editor and footer geometry, cursor placement, and terminal-control ordering. Declared product identity, A1-only setting content, hidden bare-A1 entries, the owned settings interaction contract including its distinct floating scalar menus, profile/session values, dynamic usage data, absolute link targets, and nondeterministic render timing MAY differ; no other visual difference is implicit.

#### Scenario: Render a setting-controlled frame
- **WHEN** bare A1 and pinned Pi receive equivalent content and lifecycle events with the same visible setting value and terminal dimensions
- **THEN** their normalized terminal cells, semantic ANSI roles, geometry, and control ordering SHALL match except for declared substitutions

#### Scenario: Render the owned settings surface
- **WHEN** A1 presents its A1 and Agent settings sections
- **THEN** rows, values, selected state, numeric controls, menus, dialogs, notices, padding, wrapping, clipping, and narrow-terminal behavior SHALL retain the reviewed shared-component semantics
- **AND** selected-entry descriptions SHALL remain model metadata without rendering description rows
- **AND** search SHALL remain closed until `/` is invoked, then render through the shared ruled line-input composition with its search placeholder
- **AND** ordinary printable input outside an open search SHALL not become a query
- **AND** the standing status bar SHALL derive its visible guidance from the active settings shortcut declarations
- **AND** settings-list wheel movement SHALL use the current effective `scrollbarSpeed` through the shared scrollbar distance policy, including a pending live selection, without an independent row-count literal
- **AND** a scalar menu SHALL retain shared `ValueMenu` geometry and input behavior while rendering unselected choices on A1's dark floating-panel background, the active choice on its lighter background with white text, and `✓` beside the effective value independently of the active choice
- **AND** A1-specific grouping, hidden entries, and this owned settings interaction SHALL remain declared product differences

#### Scenario: Present project trust before loading project resources
- **WHEN** an undecided interactive launch requires a trust decision
- **THEN** the bounded preflight SHALL present a pinned-style startup selector with equivalent focus, accept, reject, cancel, clear, and terminal-restoration behavior
- **AND** no project-derived presentation or executable resource SHALL load before the decision

#### Scenario: Compare automated visual evidence
- **WHEN** automated parity evidence is evaluated
- **THEN** it SHALL compare independent pinned and A1 producers without stripping semantic SGR styling or replacing geometry with text-only snapshots

#### Scenario: Claim final visual acceptance
- **WHEN** deterministic parity checks pass
- **THEN** user-controlled physical-terminal comparison SHALL still verify the claimed terminal's rasterized result, selection, resize, cursor, restoration, and supported image behavior
