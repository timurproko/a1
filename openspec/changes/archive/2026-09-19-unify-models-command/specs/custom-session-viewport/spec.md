## MODIFIED Requirements

### Requirement: Informational messages are a transient dock notice
Bare A1 SHALL present informational workflow status messages, including model and thinking-level confirmations, reload and compaction confirmations, generic completed command results, `status`-kind workflow messages, and extension `info` notifications, as one transient notice at the top of the dock rather than as transcript content. The notice SHALL consist of one blank row followed by the message in the existing dim status style with Pi's one-cell status padding regardless of the output pad setting, SHALL be placed after any non-live dock status rows and before above-editor widgets and the editor, and SHALL therefore sit directly below the live working status when that status is visible and directly above the editor group otherwise. The notice SHALL wrap at the dock width and SHALL NOT scroll with transcript content.

A newer informational message SHALL replace the current notice in place. The notice SHALL be removed when a submitted prompt or shell command block is mounted, when a non-informational workflow presentation such as an error, warning, structured command output, or celebratory component is appended to the transcript, and when workflow presentation is reset for a new, resumed, forked, or replaced session. Assistant, thinking, tool, custom, and compaction blocks that start or update while the agent works SHALL NOT remove it, the agent finishing SHALL NOT remove it, and no timer SHALL remove it. The notice SHALL NOT enter transcript order, the selectable document, copied text, prompt navigation, persisted session content, or the pinned `a1 pi` route, whose transcript placement of status text SHALL remain unchanged.

#### Scenario: Confirm a model switch in a fresh session
- **WHEN** model selection from `/models` completes in a bare-A1 session with no transcript content
- **THEN** the confirmation SHALL appear directly above the editor group with one blank row on each side
- **AND** no transcript row SHALL be added for it
- **AND** the top of the viewport SHALL remain empty

#### Scenario: Switch models while the agent is working
- **WHEN** an informational message arrives while the live working status is visible
- **THEN** the working status SHALL remain immediately above the dock and the notice SHALL render directly below it
- **AND** streamed updates, further assistant blocks, and tool blocks in that run SHALL NOT remove the notice
- **AND** the notice SHALL remain after the run finishes until the next submitted prompt

#### Scenario: Replace and dismiss
- **WHEN** a second informational message arrives before any new transcript content
- **THEN** it SHALL replace the first notice without adding a row
- **AND** a subsequently submitted prompt, appended error, or session reset SHALL remove the notice and its blank row

#### Scenario: Keep the notice out of content semantics
- **WHEN** a selection is dragged toward the dock, the transcript is copied, prompt navigation is used, or the session is persisted and resumed
- **THEN** the notice text SHALL be excluded from selection, copy, navigation targets, and persisted content
- **AND** returning to the session SHALL NOT resurrect a dismissed notice

#### Scenario: Keep the pinned route unchanged
- **WHEN** the same informational message is produced in the `a1 pi` route
- **THEN** it SHALL be appended to the transcript exactly as before, including back-to-back replacement of the previous status row
