## MODIFIED Requirements

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, in a non-persistent, non-selectable transient viewport tail after semantic transcript and pending steering rows. While all semantic and transient content fits above the dock, otherwise unused viewport rows SHALL precede the working-status surface so that it remains immediately above the dock without moving already visible transcript or steering rows. When content overflows, that flexible alignment space SHALL be zero and the same working surface SHALL participate in normal viewport scrolling. The surface SHALL NOT be duplicated in the dock, converted into persisted conversation content, counted as a completed assistant message, or treated as a submitted prompt.

Pending steering and working rows SHALL contribute to overflow, scrollbar geometry, and end-following navigation while present. While detached, new transcript output, queue updates, and status animation, replacement, or removal SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing transient rows SHALL remove their owned spacing and leave no stale copy. Idle informational messages and simple workflow failures and warnings are governed by their transient dock-notice requirements. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

#### Scenario: Scroll the active indicator out of view
- **WHEN** the viewport overflows with pending steering or live working rows present and the reader scrolls toward older content
- **THEN** the viewport SHALL detach and those transient rows SHALL move with the scrollable content
- **AND** each row SHALL disappear once its actual position leaves the viewport
- **AND** no pinned copy or reserved dock row for either surface SHALL remain
- **AND** the editor and footer SHALL stay pinned

#### Scenario: Return to active work
- **WHEN** the reader scrolls to the end, presses `Ctrl+End` in the ordinary prompt context, or activates jump-to-bottom while transient rows remain present
- **THEN** the viewport SHALL follow the complete current tail, including pending steering and working status
- **AND** those rows SHALL be visible to the extent allowed by the viewport height
- **AND** the jump-to-bottom control SHALL disappear as following resumes

#### Scenario: Cross the fit boundary
- **WHEN** growing content exhausts the flexible space and then exceeds the rows available above the dock
- **THEN** the one working-status surface SHALL remain the final transient viewport surface without duplication or omission
- **AND** end following SHALL advance the overflowing viewport while keeping the working status visible immediately above the dock
- **AND** the editor/footer position SHALL NOT change solely because of that boundary crossing

#### Scenario: Update status while detached
- **WHEN** pending steering changes, working animation ticks, or the status is replaced by retry, compaction, or extension working content while the reader is detached
- **THEN** the reader's transcript position SHALL remain unchanged whenever it is still valid
- **AND** the newest transient content SHALL appear at the tail if the reader returns while it remains active
- **AND** an off-screen update SHALL NOT paint either surface over the visible transcript or dock

#### Scenario: Finish work while detached
- **WHEN** the lifecycle removes the working status while the reader is away from the tail
- **THEN** the status and its owned alignment spacing SHALL disappear from viewport extent without leaving historical or pinned remnants
- **AND** the viewport SHALL preserve the current transcript position when valid, otherwise clamp to the new end and resume following there
- **AND** returning to the end SHALL NOT resurrect the finished indicator

#### Scenario: Copy near the live tail
- **WHEN** a transcript selection extends toward pending steering, working-status, or status-owned alignment rows and is copied
- **THEN** copied and highlighted content SHALL stop at the semantic transcript boundary
- **AND** steering text, its edit hint, status text, spinner, and alignment spacing SHALL be excluded

#### Scenario: Keep queue and editor behavior independent
- **WHEN** pending steering rows are visible or scrolled out of view while widgets, a replacement input, or a footer update is present
- **THEN** their existing queue lifecycle and `Alt+Up` edit action SHALL remain available
- **AND** changing their placement SHALL NOT convert them into persisted transcript messages
- **AND** widgets, the input surface, and the footer SHALL retain their established lifecycle, focus, and input handling

#### Scenario: Reset or replace the session
- **WHEN** a session is reset, replaced, or disposed while transient steering or working rows are visible or off-screen
- **THEN** no such rows, alignment spacing, scroll extent, pointer suppression, or stale painting from that session SHALL survive into the next session

#### Scenario: Keep a fitting status above the input
- **WHEN** live work begins or updates while semantic transcript, pending steering, and working rows all fit above the dock
- **THEN** the working-status surface SHALL appear immediately above the dock
- **AND** unused rows SHALL remain between earlier viewport content and the working status
- **AND** existing transcript and steering rows and the editor/footer group SHALL remain at their current terminal rows

#### Scenario: Grow content while it still fits
- **WHEN** streamed content consumes one or more previously unused rows while the complete viewport content still fits
- **THEN** the flexible space before the working status SHALL shrink by the consumed rows
- **AND** the working status and pinned dock SHALL remain at their current terminal rows
- **AND** no follow scroll SHALL occur solely to keep the fitting status visible

#### Scenario: Suppress pointer sequences begun on transient rows
- **WHEN** a pointer sequence begins on pending steering, working-status, or status-owned alignment rows outside a viewport control
- **THEN** the complete pointer sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** wheel input over those rows SHALL retain ordinary viewport scrolling

### Requirement: Informational messages are a transient dock notice
Bare A1 SHALL present informational workflow status messages, including model and thinking-level confirmations, reload and compaction confirmations, generic completed command results, `status`-kind workflow messages, and extension `info` notifications, as one transient notice at the top of the dock rather than as transcript content. The notice SHALL consist of one blank row followed by the message in the existing dim status style with Pi's one-cell status padding regardless of the output pad setting, SHALL be placed after any non-live dock status rows and before above-editor widgets and the editor, and SHALL therefore sit directly below the live working status when that status is visible and directly above the editor group otherwise. The notice SHALL wrap at the dock width and SHALL NOT scroll with transcript content.

A newer simple workflow notice of any informational, warning, or error severity SHALL replace the current notice in place. The notice SHALL be removed when a submitted prompt or shell command block is mounted, when a structured workflow presentation or celebratory component is appended to the transcript, and when workflow presentation is reset for a new, resumed, forked, or replaced session. Assistant, thinking, tool, custom, and compaction blocks that start or update while the agent works SHALL NOT remove it, the agent finishing SHALL NOT remove it, and no timer SHALL remove it. The notice SHALL NOT enter transcript order, the selectable document, copied text, prompt navigation, persisted session content, or the pinned `a1 pi` route, whose transcript placement of status text SHALL remain unchanged.

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
- **WHEN** another simple informational, warning, or error message arrives before any new reader submission
- **THEN** it SHALL replace the first notice without adding a row
- **AND** a subsequently submitted prompt, appended structured presentation, or session reset SHALL remove the notice and its blank row

#### Scenario: Keep the notice out of content semantics
- **WHEN** a selection is dragged toward the dock, the transcript is copied, prompt navigation is used, or the session is persisted and resumed
- **THEN** the notice text SHALL be excluded from selection, copy, navigation targets, and persisted content
- **AND** returning to the session SHALL NOT resurrect a dismissed notice

#### Scenario: Keep the pinned route unchanged
- **WHEN** the same informational message is produced in the `a1 pi` route
- **THEN** it SHALL be appended to the transcript exactly as before, including back-to-back replacement of the previous status row

## ADDED Requirements

### Requirement: Command failures and warnings are a transient dock notice
Bare A1 SHALL present simple workflow failures and warnings, including built-in command failures, explicit `error`- or `warning`-kind workflow messages, and extension error/warning notifications, through the same single transient dock-notice region used by informational messages rather than as transcript content. The notice SHALL preserve the existing contextual wording, `Error:` or `Warning:` prefix, severity theme role, output-padding rule, leading blank row, and width-aware wrapping supplied by the command-message presenter. It SHALL sit directly above the editor group, or directly below live working status when that status is visible, and SHALL NOT scroll with transcript content.

The latest simple workflow notice SHALL replace any earlier informational, warning, or error notice in place. A submitted prompt or shell command, a structured transcript-bound workflow presentation, or workflow/session reset SHALL dismiss it under the common notice lifecycle. Structured command output SHALL remain transcript content. The pinned `a1 pi` route SHALL retain its chronological transcript placement of command failures and warnings.

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
- **WHEN** a route presents session information, hotkeys, changelog, new/name/debug output, or another structured component
- **THEN** that component SHALL retain its existing transcript placement
- **AND** it SHALL dismiss any stale simple dock notice

#### Scenario: Keep pinned command-message placement
- **WHEN** the same command failure or warning is produced through `a1 pi`
- **THEN** it SHALL remain chronological transcript content with its pinned spacing, prefix, style, and wording
- **AND** no custom-viewport dock notice SHALL be introduced
