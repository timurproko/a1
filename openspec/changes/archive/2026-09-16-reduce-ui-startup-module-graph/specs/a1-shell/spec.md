## ADDED Requirements

### Requirement: Interactive startup evaluates a bounded readiness graph
An installed interactive launch SHALL load and evaluate before first input-ready render only the runtime capabilities required to render the selected profile and safely accept user input. Settings, engine initialization, selected session state, model scope, executable resources, tools, extensions, terminal behavior, and launch containment that affect the first accepted prompt SHALL be ready before that frame. Optional workflows and presentation features that do not affect those guarantees SHALL NOT enlarge the eager startup graph.

On the accepted Defender-enabled Windows release runner, both `a1` and `a1 pi` SHALL reach the first input-ready frame within 2 seconds after a completed update and on a warm launch. When the active release has no live supervisor, both profiles SHALL reach that frame within 2.5 seconds. These budgets SHALL apply to every supported Windows Node lane and SHALL be evaluated on the first attempt.

#### Scenario: First launch follows update
- **WHEN** a completed exact-package update has activated and warmed a new release
- **THEN** either interactive profile SHALL paint a genuinely input-ready frame within 2 seconds without loading optional feature implementations solely for future use

#### Scenario: Warm launch starts another session
- **WHEN** the active release and dependency layer have already served an interactive launch
- **THEN** either interactive profile SHALL paint a genuinely input-ready frame within 2 seconds

#### Scenario: Launch replaces a missing supervisor
- **WHEN** an approved active release has valid durable certification but no live supervisor
- **THEN** either interactive profile SHALL validate the release, start its replacement supervisor, and paint a genuinely input-ready frame within 2.5 seconds

#### Scenario: User submits immediately after first render
- **WHEN** the editor accepts input at the first input-ready frame
- **THEN** the selected settings, model scope, resources, tools, extensions, terminal semantics, and session state SHALL already apply to that submission

#### Scenario: Optional feature is first requested
- **WHEN** the user invokes a deferred settings, selector, package, rich-rendering, clipboard, image, export, or similar optional capability
- **THEN** A1 SHALL load it without changing its documented behavior or losing the triggering interaction
