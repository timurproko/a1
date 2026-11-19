# multi-agent-tabs Delta

## ADDED Requirements

### Requirement: Utility tabs run without an Agent engine
A resident utility tab, Settings or Changelog, SHALL run a child process that neither loads nor starts the Pi engine, a session backend, extensions, prompt history, prompt suggestions, or draft recovery. The child SHALL choose this from its tab id before any A1 or Pi module loads. It SHALL present only the tab's pinned route screen, with the same theme, accent, background canvas, keybindings, mouse handling, interrupt chord, and controller-boundary handling as the full composition. It SHALL start the tab bridge, report its status and accent, publish the effective tab shortcuts, request the Plus Menu modal through `configure-plus`, detach the client on the double interrupt, close its tab when its screen closes, and stop on `bridge.stop`. Agent tabs, the standby, `a1 solo`, and `a1 pi` SHALL keep the full composition.

#### Scenario: A Settings tab loads no engine
- **WHEN** the client prewarms or opens the Settings tab
- **THEN** its child SHALL show the Settings screen without creating a Pi engine host or session

#### Scenario: A Changelog tab loads no engine
- **WHEN** the client prewarms or opens the Changelog tab
- **THEN** its child SHALL show the packaged changelog without creating a Pi engine host or session, and SHALL take no startup "What's New" claim

#### Scenario: Tab-bar behavior is unchanged
- **WHEN** a slim utility tab is viewed
- **THEN** tab shortcuts, `Alt+/`, `Configure` from Settings, the double interrupt, and closing the tab SHALL behave as they do for the full composition

#### Scenario: Agent tabs are unchanged
- **WHEN** the client creates an Agent tab or promotes the standby
- **THEN** its child SHALL run the full composition with the Pi engine
