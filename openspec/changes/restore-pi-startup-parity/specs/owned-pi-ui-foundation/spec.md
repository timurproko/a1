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

#### Scenario: Apply the configured model scope

- **WHEN** `enabledModels` patterns resolve to one or more available models
  and a fresh session starts
- **THEN** the session's scoped model list SHALL be the resolved scope
- **AND** the initial model SHALL be the saved default model when it is in
  scope, otherwise the first scoped model, as in pinned Pi

#### Scenario: Announce available extension-package updates

- **WHEN** the startup probe finds extension packages with available updates
- **THEN** the owned UI SHALL surface a recoverable startup diagnostic naming
  the packages and pinned Pi's `pi update --extensions` instruction
- **AND** with `PI_OFFLINE` set, or when the probe fails, no notice SHALL
  appear
