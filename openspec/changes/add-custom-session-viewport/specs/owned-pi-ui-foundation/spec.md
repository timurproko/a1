## ADDED Requirements

### Requirement: The declared bare-A1 viewport customizes layout without replacing shell behavior
After the pinned shell baseline and customization prerequisite are accepted, bare A1 SHALL apply the custom session viewport as a declared layout customization over the owned shell's existing engine, transcript components, input surfaces, status/footer components, extension bridge, commands, selectors, dialogs, and lifecycle. The customization SHALL own viewport composition and navigation but SHALL NOT patch installed Pi code, inspect private Pi renderer state, infer transcript semantics from rendered terminal text, or introduce a second agent or terminal authority.

The viewport's intentional differences SHALL be limited to its declared capability: a bounded transcript above a pinned dock, A1 scrollbar presentation, detached/follow navigation, the scroll-to-bottom control, and timestamped sticky submitted prompts. Correct text or behavior from an existing shell surface SHALL NOT be reimplemented as viewport-specific status, editor, workflow, or extension behavior.

#### Scenario: Compose the custom viewport
- **WHEN** bare A1 starts after the customization prerequisite is satisfied
- **THEN** the viewport SHALL compose the accepted owned-shell surfaces through their existing public A1 boundaries
- **AND** the docked status, input, footer, commands, modal surfaces, and extension contributions SHALL keep their existing behavior

#### Scenario: Open a pinned workflow from the custom viewport
- **WHEN** the reader invokes a command, selector, dialog, authentication flow, session flow, or extension interaction not declared as replaced
- **THEN** its controller, result, cancellation, focus restoration, and lifecycle SHALL remain the accepted pinned-shell behavior

#### Scenario: Compare an explicit profile
- **WHEN** `a1 pi` or `a1 sandbox` is started
- **THEN** the declared viewport layout customization SHALL be absent
- **AND** those profiles SHALL remain suitable for observing the pinned presentation without A1 viewport rows, controls, prompt timestamps, or scrollbar settings

#### Scenario: Upgrade the pinned integration
- **WHEN** the pinned Pi or Pi TUI version changes
- **THEN** the viewport SHALL continue to depend only on documented public runtime/component contracts and A1-owned ports
- **AND** an unabsorbed input, layout, or component-boundary change SHALL fail conformance rather than being handled through a private-field or prototype workaround

#### Scenario: Viewport customization is not yet accepted
- **WHEN** its implementation, focused regression evidence, or user-controlled manual acceptance is incomplete or contradicted
- **THEN** the custom viewport milestone SHALL remain unaccepted
- **AND** that incomplete milestone SHALL NOT authorize the held multi-agent workspace work
