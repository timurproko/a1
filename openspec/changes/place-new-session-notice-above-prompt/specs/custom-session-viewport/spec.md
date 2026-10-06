## MODIFIED Requirements

### Requirement: Informational messages are a transient dock notice
Bare A1 SHALL present informational workflow status messages, including model and thinking-level confirmations, reload and compaction confirmations, generic completed command results, `status`-kind workflow messages, and extension `info` notifications, as one transient notice at the top of the dock rather than as transcript content. The notice SHALL consist of one blank row followed by the message in the existing dim status style with Pi's one-cell status padding regardless of the output pad setting, SHALL be placed after any non-live dock status rows and before above-editor widgets and the editor, and SHALL therefore sit directly below the live working status when that status is visible and directly above the editor group otherwise. The notice SHALL wrap at the dock width and SHALL NOT scroll with transcript content.

A successful `/new` result in bare A1 SHALL use the same transient prompt-adjacent ownership instead of transcript ownership, but SHALL preserve the existing accent `✓ New session started` wording, command-message wrapping, one-cell horizontal padding, and surrounding blank rows. While the replacement session is idle, its confirmation SHALL appear directly above the editor group at the bottom of the frame. When the first accepted prompt transitions the session from non-busy to busy, the confirmation SHALL be removed in the same presentation update that introduces the live working status, so `Working…` replaces it and the two SHALL NOT be visible together. A submission rejected before the busy transition SHALL NOT remove the confirmation.

A newer simple workflow notice of any informational, warning, or error severity SHALL replace the current notice in place. The notice SHALL be removed when a submitted prompt or shell command block is mounted, when a structured workflow presentation or celebratory component is appended to the transcript, and when workflow presentation is reset for a new, resumed, forked, or replaced session. Assistant, thinking, tool, custom, and compaction blocks that start or update while the agent works SHALL NOT remove an ordinary informational, warning, or error notice, the agent finishing SHALL NOT remove it, and no timer SHALL remove it. The notice SHALL NOT enter transcript order, the selectable document, copied text, prompt navigation, persisted session content, or the pinned `a1 pi` route, whose transcript placement of status text and new-session confirmation SHALL remain unchanged.

#### Scenario: Confirm a model switch in a fresh session
- **WHEN** model selection from `/models` completes in a bare-A1 session with no transcript content
- **THEN** the confirmation SHALL appear directly above the editor group with one blank row on each side
- **AND** no transcript row SHALL be added for it
- **AND** the top of the viewport SHALL remain empty

#### Scenario: Confirm a new session beside the prompt
- **WHEN** `/new` successfully creates an idle bare-A1 session
- **THEN** the accent `✓ New session started` confirmation SHALL appear directly above the input prompt at the bottom of the frame
- **AND** it SHALL preserve its existing wrapping, one-cell horizontal padding, and surrounding blank rows
- **AND** the selectable transcript document and the top of the viewport SHALL remain empty

#### Scenario: Replace the new-session confirmation with working status
- **WHEN** the reader submits the first prompt and the replacement session accepts it by transitioning to busy
- **THEN** the first busy frame SHALL show the live `Working…` status directly above the dock
- **AND** `✓ New session started` SHALL no longer be visible
- **AND** no frame composed from that accepted transition SHALL show both messages

#### Scenario: Keep the confirmation when prompt dispatch is rejected
- **WHEN** a prompt submission is rejected before the replacement session transitions to busy
- **THEN** the idle new-session confirmation SHALL remain visible
- **AND** no live working status SHALL be fabricated

#### Scenario: Switch models while the agent is working
- **WHEN** an ordinary informational message arrives while the live working status is visible
- **THEN** the working status SHALL remain immediately above the dock and the notice SHALL render directly below it
- **AND** streamed updates, further assistant blocks, and tool blocks in that run SHALL NOT remove the notice
- **AND** the notice SHALL remain after the run finishes until the next submitted prompt

#### Scenario: Replace and dismiss
- **WHEN** another simple informational, warning, or error message arrives before any new reader submission
- **THEN** it SHALL replace the first notice without adding a row
- **AND** a subsequently submitted prompt, appended structured presentation, or session reset SHALL remove the notice and its blank row

#### Scenario: Keep the notice out of content semantics
- **WHEN** a selection is dragged toward the dock, the transcript is copied, prompt navigation is used, or the session is persisted and resumed
- **THEN** the notice text, including a new-session confirmation, SHALL be excluded from selection, copy, navigation targets, and persisted content
- **AND** returning to the session SHALL NOT resurrect a dismissed notice

#### Scenario: Keep the pinned route unchanged
- **WHEN** the same informational message or successful `/new` result is produced in the `a1 pi` route
- **THEN** it SHALL be appended to the transcript exactly as before, including back-to-back replacement of the previous status row and the existing accent new-session shape

### Requirement: Command failures and warnings are a transient dock notice
Bare A1 SHALL present simple workflow failures and warnings, including built-in command failures, explicit `error`- or `warning`-kind workflow messages, and extension error/warning notifications, through the same single transient dock-notice region used by informational messages and the bare-A1 new-session confirmation rather than as transcript content. The notice SHALL preserve the existing contextual wording, `Error:` or `Warning:` prefix, severity theme role, output-padding rule, leading blank row, and width-aware wrapping supplied by the command-message presenter. It SHALL sit directly above the editor group, or directly below live working status when that status is visible, and SHALL NOT scroll with transcript content.

The latest simple workflow notice SHALL replace any earlier informational, warning, error, or new-session notice in place. A submitted prompt or shell command, a structured transcript-bound workflow presentation, an owned full-screen reference route, or workflow/session reset SHALL dismiss it under the common notice lifecycle, subject to the new-session confirmation's accepted-busy replacement rule. Structured command output SHALL remain transcript content unless its command is declared as an owned full-screen replacement or as the bare-A1 new-session confirmation; such a route SHALL append no transcript content. The pinned `a1 pi` route SHALL retain its chronological transcript placement of command failures, warnings, new-session confirmations, and structured session information.

#### Scenario: Fail to export an empty session
- **WHEN** `/export` fails in a fresh bare-A1 session because there is nothing to export
- **THEN** `Error: Failed to export session: Nothing to export yet - start a conversation first` SHALL appear immediately above the prompt group in the existing error color
- **AND** the message SHALL NOT appear at the top-left of the transcript or leave a large empty gap below it
- **AND** the selectable document range SHALL remain empty

#### Scenario: Show a warning near the prompt
- **WHEN** a workflow emits a simple warning in bare A1
- **THEN** the warning SHALL appear in the same dock region with its `Warning:` prefix, warning color, existing padding, and wrapping
- **AND** it SHALL NOT become transcript, selection, copy, prompt-navigation, or persisted-session content

#### Scenario: Replace notices across severity
- **WHEN** an error or warning follows an informational or new-session notice, or an informational notice follows an error or warning
- **THEN** the newer message SHALL replace the older notice in the same dock position
- **AND** no stale notice row or transcript component SHALL remain

#### Scenario: Show an extension failure
- **WHEN** an extension emits an error or warning notification in bare A1
- **THEN** it SHALL use the same prompt-adjacent severity presentation and lifecycle as a built-in simple workflow message
- **AND** no extension-specific duplicate SHALL be appended to the transcript

#### Scenario: Keep structured output in the transcript
- **WHEN** a route presents name/debug output or another structured component that is neither an owned full-screen replacement nor the bare-A1 new-session confirmation
- **THEN** that component SHALL retain its existing transcript placement
- **AND** it SHALL dismiss any stale simple dock notice

#### Scenario: Keep owned reference output out of the transcript
- **WHEN** bare A1 opens session information, hotkeys, or changelog through its declared owned full-screen route
- **THEN** the screen SHALL dismiss any stale simple dock notice and append no structured component, status, or placeholder to the transcript

#### Scenario: Keep pinned command-message placement
- **WHEN** the same command failure, warning, or successful `/new` result is produced through `a1 pi`
- **THEN** it SHALL remain chronological transcript content with its pinned spacing, prefix or accent style, and wording
- **AND** no custom-viewport dock notice SHALL be introduced
