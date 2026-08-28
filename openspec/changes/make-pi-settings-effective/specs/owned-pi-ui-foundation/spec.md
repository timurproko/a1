## ADDED Requirements

### Requirement: The owned shell preserves setting-controlled Pi behavior
Every Pi setting the A1-owned settings replacement presents as writable SHALL control the same active-session, presentation, terminal, startup, or shutdown behavior that the pinned Pi setting controls. The replacement SHALL not count persistence, callback reachability, or selector rendering as preservation of a pinned capability. Product-fixed or terminal-unsupported behavior SHALL be represented as unavailable with a reason rather than as a writable value.

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

#### Scenario: A writable setting has no behavioral consumer
- **WHEN** conformance finds a setting that can be written but cannot change its declared observable behavior
- **THEN** the owned-shell acceptance gate SHALL fail even if settings persistence and route-reachability tests pass
