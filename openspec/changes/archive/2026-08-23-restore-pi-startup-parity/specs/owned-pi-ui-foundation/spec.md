## ADDED Requirements

### Requirement: Startup consumes the pinned model scope and update-probe configuration

The owned runtime SHALL resolve the profile's `enabledModels` settings patterns
at startup exactly as pinned Pi's CLI does, and the owned shell SHALL run
pinned Pi's startup extension-package update probe. Configuration pinned Pi
acts on at startup SHALL NOT be silently ignored by the owned surface.

#### Scenario: Warn about unmatched model patterns

- **WHEN** an `enabledModels` pattern in the profile's settings matches no
  available model at startup
- **THEN** the owned UI SHALL surface pinned Pi's
  `No models match pattern "<pattern>"` warning as a startup diagnostic

#### Scenario: Render startup diagnostics in pinned style and position

- **WHEN** startup diagnostics exist when the owned shell renders
- **THEN** every startup diagnostic SHALL render above the banner in pinned
  `reportDiagnostics` style — the whole line in chalk's basic ANSI severity
  colour (yellow warning, red error, dim info), not the theme's tokens, with
  the `Warning: ` or `Error: ` prefix and info lines unprefixed
- **AND** no startup diagnostic SHALL be dropped by a display cap

#### Scenario: Apply the configured model scope

- **WHEN** `enabledModels` patterns resolve to one or more available models
  and a fresh session starts
- **THEN** the session's scoped model list SHALL be the resolved scope
- **AND** the initial model SHALL be the saved default model when it is in
  scope, otherwise the first scoped model, as in pinned Pi

#### Scenario: Announce available extension-package updates

- **WHEN** the startup probe finds extension packages with available updates
- **THEN** the owned UI SHALL render pinned Pi's notification banner —
  warning-coloured dynamic borders around the bold `Package Updates Available`
  title, the muted instruction with the accent `pi update --extensions`
  command, and the package list — after the banner and loaded resources
- **AND** with `PI_OFFLINE` set, or when the probe fails, no notice SHALL
  appear
