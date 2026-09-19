## MODIFIED Requirements

### Requirement: Shortcut help regression evidence respects platform presentation
Shortcut-help regression checks SHALL distinguish the configured binding identity from its platform-specific visible label. Checks SHALL retain live override, unbound-command fallback, and pinned-profile coverage rather than accepting arbitrary labels or changing runtime presentation to satisfy a host-specific expectation.

#### Scenario: A live model-selection override uses Alt
- **WHEN** the effective model-selection binding is changed to `alt+m` after the startup header is created
- **THEN** the regression check SHALL require the refreshed header to display `option+m` on macOS and `alt+m` on Windows and Linux
- **AND** the logical binding SHALL remain `alt+m`
- **AND** invoking it in bare A1 SHALL open the unified Models dialog

#### Scenario: Model selection is unbound
- **WHEN** the owned profile has no effective model-selection shortcut
- **THEN** the regression check SHALL require the `/models` fallback rather than an invented keybinding
- **AND** pinned comparison coverage SHALL continue to require its unchanged `/model` fallback
