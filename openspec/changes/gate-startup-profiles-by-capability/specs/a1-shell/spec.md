## MODIFIED Requirements

### Requirement: Interactive startup evaluates a bounded readiness graph
An installed interactive launch SHALL load and evaluate before first input-ready render only the runtime capabilities required to render the selected profile and safely accept user input. Settings, engine initialization, selected session state, model scope, executable resources, tools, extensions, terminal behavior, and launch containment that affect the first accepted prompt SHALL be ready before that frame. Optional workflows and presentation features that do not affect those guarantees SHALL NOT enlarge the eager startup graph.

On the accepted Defender-enabled Windows release runner, every interactive profile the candidate itself advertises SHALL reach the first input-ready frame within 2 seconds after a completed update and on a warm launch. When the active release has no live supervisor, each advertised profile SHALL reach that frame within 2.5 seconds. The measured set SHALL follow the candidate's own version-derived capabilities rather than a fixed pair: a prerelease candidate advertises `a1` and `a1 pi` and SHALL measure both, while a stable candidate advertises `a1` alone and SHALL measure it alone and SHALL prove that `a1 pi` remains the quiet no-op that a non-prerelease build is required to expose. The deliberate absence of the comparison profile SHALL NOT be recorded as a startup failure or as a missing measurement. These budgets SHALL apply to every supported Windows Node lane and SHALL be evaluated on the first attempt of every measurement. Stable publication SHALL fail on any first-attempt overrun. Development previews, nightly publication, and complete regression SHALL record every measurement as evidence and SHALL judge a lane, profile, and launch kind regressed only when its three most recent consecutive `develop` measurements of the same workflow all exceed the budget; a single overrun on those channels is a warning with the measured phases, never a run failure.

#### Scenario: First launch follows update
- **WHEN** a completed exact-package update has activated and warmed a new release
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds without loading optional feature implementations solely for future use

#### Scenario: Warm launch starts another session
- **WHEN** the active release and dependency layer have already served an interactive launch
- **THEN** every advertised interactive profile SHALL paint a genuinely input-ready frame within 2 seconds

#### Scenario: Launch replaces a missing supervisor
- **WHEN** an approved active release has valid durable certification but no live supervisor
- **THEN** every advertised interactive profile SHALL validate the release, start its replacement supervisor, and paint a genuinely input-ready frame within 2.5 seconds

#### Scenario: A stable candidate advertises no comparison profile
- **WHEN** first-attempt startup validation runs against a candidate whose version declares no prerelease
- **THEN** the gate SHALL measure the `a1` profile alone against the same budgets and lanes
- **AND** it SHALL confirm that `a1 pi` exits quietly without launching an interactive profile
- **AND** that quiet exit SHALL NOT be reported as a launch that ended before first render

#### Scenario: User submits immediately after first render
- **WHEN** the editor accepts input at the first input-ready frame
- **THEN** the selected settings, model scope, resources, tools, extensions, terminal semantics, and session state SHALL already apply to that submission

#### Scenario: Optional feature is first requested
- **WHEN** the user invokes a deferred settings, selector, package, rich-rendering, clipboard, image, export, or similar optional capability
- **THEN** A1 SHALL load it without changing its documented behavior or losing the triggering interaction

#### Scenario: A scheduled channel measures one overrun
- **WHEN** a nightly publication or complete regression measurement exceeds its budget while the two previous `develop` measurements of that lane, profile, and launch kind did not
- **THEN** the run SHALL record the measurement, annotate the overrun with its dominant phases, and succeed

#### Scenario: A scheduled channel measures a persistent overrun
- **WHEN** the three most recent consecutive `develop` measurements of one lane, profile, and launch kind all exceed the budget
- **THEN** the startup budget SHALL be judged regressed for that key and the nightly regression triage SHALL propose its fix with the three measurements as evidence
