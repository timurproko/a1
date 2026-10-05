## MODIFIED Requirements

### Requirement: Command failures and warnings are a transient dock notice
Bare A1 SHALL present simple workflow failures and warnings, including built-in command failures, explicit `error`- or `warning`-kind workflow messages, and extension error/warning notifications, through the same single transient dock-notice region used by informational messages rather than as transcript content. The notice SHALL preserve the existing contextual wording, `Error:` or `Warning:` prefix, severity theme role, output-padding rule, leading blank row, and width-aware wrapping supplied by the command-message presenter. It SHALL sit directly above the editor group, or directly below live working status when that status is visible, and SHALL NOT scroll with transcript content.

The latest simple workflow notice SHALL replace any earlier informational, warning, or error notice in place. A submitted prompt or shell command, a structured transcript-bound workflow presentation, an owned full-screen reference route, or workflow/session reset SHALL dismiss it under the common notice lifecycle. Structured command output SHALL remain transcript content unless its command is declared as an owned full-screen replacement; such a route SHALL append no transcript content. The pinned `a1 pi` route SHALL retain its chronological transcript placement of command failures, warnings, and structured session information.

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
- **WHEN** an error or warning follows an informational notice, or an informational notice follows an error or warning
- **THEN** the newer message SHALL replace the older notice in the same dock position
- **AND** no stale notice row or transcript component SHALL remain

#### Scenario: Show an extension failure
- **WHEN** an extension emits an error or warning notification in bare A1
- **THEN** it SHALL use the same prompt-adjacent severity presentation and lifecycle as a built-in simple workflow message
- **AND** no extension-specific duplicate SHALL be appended to the transcript

#### Scenario: Keep structured output in the transcript
- **WHEN** a route presents new/name/debug output or another structured component that is not declared as an owned full-screen replacement
- **THEN** that component SHALL retain its existing transcript placement
- **AND** it SHALL dismiss any stale simple dock notice

#### Scenario: Keep owned reference output out of the transcript
- **WHEN** bare A1 opens session information, hotkeys, or changelog through its declared owned full-screen route
- **THEN** the screen SHALL dismiss any stale simple dock notice and append no structured component, status, or placeholder to the transcript

#### Scenario: Keep pinned command-message placement
- **WHEN** the same command failure or warning is produced through `a1 pi`
- **THEN** it SHALL remain chronological transcript content with its pinned spacing, prefix, style, and wording
- **AND** no custom-viewport dock notice SHALL be introduced
