## ADDED Requirements

### Requirement: Fullscreen copy on select reaches Changelog reference selection

Bare A1 SHALL apply Pi's live `fullscreenCopyOnSelect` value to owned Changelog and startup `What's New` reference-screen selection as well as session-frame selection. The reference screen SHALL read the current effective setting when a selection completes, so an accepted settings change affects the next selection without restarting or reopening the document. Explicit `Ctrl+C` copy SHALL remain available regardless of the setting value.

#### Scenario: Change automatic Changelog copy live

- **WHEN** the reader changes `Copy on select` while a Changelog or `What's New` screen remains open
- **THEN** the next completed text selection SHALL use the new effective value
- **AND** explicit selected-text copy SHALL remain available in either state
