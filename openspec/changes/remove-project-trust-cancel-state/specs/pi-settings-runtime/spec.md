## MODIFIED Requirements

### Requirement: Project trust is decided before project resources load
A1 SHALL resolve saved project trust and `defaultProjectTrust` for every launch working directory before Pi loads project settings, context files, skills, prompts, extensions, themes, or other project-scoped executable resources. A saved exact or ancestor path decision SHALL override the default exactly as pinned Pi specifies. Under `ask`, an uncovered working directory SHALL require an explicit decision when interaction is available even when no trust-requiring project resource is currently discoverable; current resource absence SHALL NOT grant implicit trust. `always` SHALL allow project resources and `never` SHALL withhold them without interaction. A1 SHALL fail closed when a required decision cannot be obtained. Interactive preflight SHALL use a bounded startup-safe selector constructed without project-derived resources and SHALL preserve focus, explicit exit, interruption, clearing, and terminal-restoration semantics rather than using a plain line-oriented prompt.

#### Scenario: Ask for an undecided project
- **WHEN** the default is `ask` and no saved exact or ancestor decision covers the working directory
- **THEN** A1 SHALL obtain a trust decision before constructing the project-aware runtime
- **AND** it SHALL do so whether or not a trust-requiring project resource is currently discoverable

#### Scenario: Keep unrelated folders independent
- **WHEN** one working directory has an exact saved decision and another directory is neither that path nor its descendant
- **THEN** the saved decision SHALL NOT cover the unrelated directory
- **AND** the unrelated directory SHALL follow its own saved/default policy

#### Scenario: Inherit an explicit ancestor decision
- **WHEN** the nearest saved decision belongs to an ancestor of the working directory
- **THEN** A1 SHALL apply that ancestor decision without prompting again
- **AND** an exact child decision SHALL override the ancestor decision

#### Scenario: Honor a configured default
- **WHEN** an uncovered working directory resolves `defaultProjectTrust` to `always` or `never`
- **THEN** A1 SHALL apply the configured decision without interaction

#### Scenario: Start an untrusted project
- **WHEN** the effective trust decision is untrusted
- **THEN** project settings and resources SHALL not load while permitted global resources remain available

#### Scenario: Start a trusted project
- **WHEN** the effective trust decision is trusted
- **THEN** project settings and resources SHALL load through the ordinary pinned resource pipeline

#### Scenario: Trust cannot be requested
- **WHEN** the effective default requires a decision but the launch has no interactive trust surface
- **THEN** A1 SHALL treat the project as untrusted and report the reason

#### Scenario: Present interactive trust preflight
- **WHEN** an undecided interactive launch requests trust
- **THEN** the preflight frame, options, selected state, footer hints, key handling, and terminal cleanup SHALL follow the owned startup-selector contract

#### Scenario: Exit bare-A1 trust preflight
- **WHEN** Escape is pressed in the bare-A1 startup trust selector
- **THEN** A1 SHALL restore the terminal without writing parent-buffer rows, preserve the undecided trust state, and terminate startup successfully
- **AND** it SHALL NOT construct project settings, resources, or the owned shell

#### Scenario: Interrupt bare-A1 trust preflight
- **WHEN** Ctrl+C is pressed in the bare-A1 startup trust selector
- **THEN** A1 SHALL follow the same clean terminal-restoration path with the conventional interrupted outcome, without replacing Escape as the visible exit action
- **AND** it SHALL NOT construct project settings, resources, or the owned shell

#### Scenario: Fail bare-A1 trust preflight
- **WHEN** interaction is unavailable, input ends, or ordinary trust resolution fails
- **THEN** project resources SHALL remain withheld
- **AND** bare A1 SHALL present one bounded diagnostic through its prompt-adjacent warning notice rather than at the top of an otherwise empty transcript viewport

#### Scenario: Cancel or fail trust preflight
- **WHEN** the selector is cancelled through `a1 pi`, or ordinary trust preflight fails in either profile
- **THEN** project resources SHALL remain withheld
- **AND** bare A1 SHALL place an applicable failure diagnostic in its prompt-adjacent notice while `a1 pi` retains its pinned cancellation and startup-diagnostic behavior
