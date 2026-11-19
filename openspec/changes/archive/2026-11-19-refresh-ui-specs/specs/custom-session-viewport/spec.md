## ADDED Requirements

### Requirement: Hyperlink cleanup preserves link targets and interaction
Hyperlink cleanup SHALL preserve file and URL link targets, activation policy, idle colors, semantic transcript text, selection and copy results, and non-link source styling. It SHALL NOT require disabling hyperlinks or changing user terminal settings. It SHALL be scoped to bare A1's owned fullscreen viewport, leaving `a1 pi` and installed Pi packages unchanged.

#### Scenario: Select and release linked content
- **WHEN** the reader selects linked transcript content, scrolls during selection, releases the pointer, and copies
- **THEN** selection and copy semantics SHALL be the same as for unlinked content
- **AND** restoring ordinary link presentation SHALL NOT leave stale solid underlines outside current link regions

#### Scenario: Use a pinned comparison profile
- **WHEN** the user launches `a1 pi`
- **THEN** its rendering, hyperlink handling, and selection behavior SHALL be the pinned ones

### Requirement: Informational command results are a transient dock notice
Bare A1 SHALL present informational workflow status messages, including thinking-level confirmations, reload and compaction confirmations, generic completed command results, `status`-kind workflow messages, and extension `info` notifications, as one transient notice at the top of the dock rather than as transcript content. A successful model change and a `/name` result SHALL produce no notice, because the footer already shows the new model or name. The notice SHALL consist of one blank row followed by the message in the existing dim status style with Pi's one-cell status padding regardless of the output pad setting, SHALL be placed after any non-live dock status rows and before above-editor widgets and the editor, and SHALL therefore sit directly below the live working status when that status is visible and directly above the editor group otherwise. The notice SHALL wrap at the dock width and SHALL NOT scroll with transcript content.

A successful `/new` result in bare A1 SHALL use the same transient prompt-adjacent ownership instead of transcript ownership, but SHALL preserve the existing accent `✓ New session started` wording, command-message wrapping, one-cell horizontal padding, and leading separation. While the replacement session is idle, its confirmation SHALL appear directly above the editor group at the bottom of the frame with exactly one blank row between the confirmation and input. When the first accepted prompt transitions the session from non-busy to busy, the confirmation SHALL be removed in the same presentation update that introduces the live working status, so `Working…` replaces it and the two SHALL NOT be visible together. A submission that fails before the busy transition MAY replace the confirmation with the existing truthful failure notice but SHALL NOT fabricate live working status.

A newer simple workflow notice of any informational, warning, or error severity SHALL replace the current notice in place. The notice SHALL be removed when a submitted prompt or shell command block is mounted, when a structured workflow presentation or celebratory component is appended to the transcript, and when workflow presentation is reset for a new, resumed, forked, or replaced session. Assistant, thinking, tool, custom, and compaction blocks that start or update while the agent works SHALL NOT remove an ordinary informational, warning, or error notice, the agent finishing SHALL NOT remove it, and no timer SHALL remove it. The notice SHALL NOT enter transcript order, the transcript document, semantic response copy, prompt navigation, persisted session content, or the pinned `a1 pi` route, whose transcript placement of status text and new-session confirmation SHALL remain unchanged.

#### Scenario: Show an informational notice in a fresh session
- **WHEN** an informational command result, such as a thinking-level confirmation, arrives in a bare-A1 session with no transcript content
- **THEN** the confirmation SHALL appear directly above the editor group with one blank row on each side
- **AND** no transcript row SHALL be added for it
- **AND** the top of the viewport SHALL remain empty

#### Scenario: Confirm a new session beside the prompt
- **WHEN** `/new` successfully creates an idle bare-A1 session
- **THEN** the accent `✓ New session started` confirmation SHALL appear directly above the input prompt at the bottom of the frame
- **AND** it SHALL preserve its existing accent, wrapping, one-cell horizontal padding, and leading separation
- **AND** exactly one blank row SHALL appear between the confirmation and input
- **AND** the selectable transcript document and the top of the viewport SHALL remain empty

#### Scenario: Replace the new-session confirmation with working status
- **WHEN** the reader submits the first prompt and the replacement session accepts it by transitioning to busy
- **THEN** the first busy frame SHALL show the live `Working…` status directly above the dock
- **AND** `✓ New session started` SHALL no longer be visible
- **AND** no frame composed from that accepted transition SHALL show both messages

#### Scenario: Report a prompt failure before work begins
- **WHEN** a prompt submission fails before the replacement session transitions to busy
- **THEN** the existing prompt failure notice MAY replace the idle new-session confirmation
- **AND** no live working status SHALL be fabricated

#### Scenario: Show a notice while the agent is working
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
- **THEN** the notice text, including a new-session confirmation, SHALL be excluded from the transcript document, semantic response copy, navigation targets, and persisted content
- **AND** its visible text SHALL remain selectable and copyable as an application message under `session-frame-selection`
- **AND** returning to the session SHALL NOT resurrect a dismissed notice

#### Scenario: Keep the pinned route unchanged
- **WHEN** the same informational message or successful `/new` result is produced in the `a1 pi` route
- **THEN** it SHALL be appended to the transcript, including back-to-back replacement of the previous status row and the existing accent new-session shape

### Requirement: Frame selectability is independent from transcript ownership

Bare A1 SHALL distinguish a surface's semantic ownership from whether its currently visible text participates in frame selection. Terms in this capability that classify pending steering, working status, alignment rows, dock notices, widgets, input rows, autocomplete chrome, or footer rows as non-persistent, non-transcript, outside the selectable document, or excluded from transcript copy SHALL continue to govern transcript history, scrolling, prompt navigation, persistence, model context, and semantic response-copy operations.

A selection MAY cross the viewport and dock boundary in either direction as one continuous range; its extent, clipping, and copy output are governed by `session-frame-selection`. Held-edge auto-scroll SHALL apply only to a gesture that began on transcript content.

A sticky prompt that replaces the first visible source row SHALL be treated as non-selectable pinned chrome: its complete screen row SHALL be excluded from transcript selection paint, pointer anchoring, and visible-frame copy. The same prompt SHALL remain normally selectable when it appears at its ordinary scrolling document position. Retained selection endpoints SHALL project from their document rows so selection paint shrinks and disappears as those rows scroll outside the content frame rather than transferring to sticky prompt, status, or dock rows.

Explicit controls, modals, overlays, and replacement surfaces SHALL retain their declared gesture ownership, and `a1 pi` SHALL remain unchanged.

#### Scenario: Select non-transcript text without persisting it
- **WHEN** a selection gesture begins on a visible dock or editor row
- **THEN** those visible glyphs SHALL remain eligible for frame-selection painting and visual copy
- **AND** they SHALL remain excluded from transcript history, prompt navigation, persisted conversation content, and model context according to their existing ownership

#### Scenario: Cross the viewport and dock boundary
- **WHEN** a dock-originated frame-selection drag crosses into semantic transcript rows
- **THEN** selection SHALL remain one continuous complete-frame range
- **AND** transcript scrolling and dock pinning SHALL retain their allocation and order

#### Scenario: Exclude a pinned prompt alias
- **WHEN** a submitted prompt is rendered as the sticky first row because its ordinary document row has scrolled away
- **THEN** the complete pinned row SHALL retain its ordinary presentation when a transcript selection crosses it
- **AND** the pinned row SHALL contribute no text to visible-frame copy
- **AND** a pointer press on the pinned alias SHALL NOT create a transcript selection anchor

#### Scenario: Select the prompt at its document position
- **WHEN** scrolling places that submitted prompt at its ordinary document row without sticky replacement
- **THEN** the prompt row SHALL participate in transcript selection and visible-frame copy normally

#### Scenario: Scroll selected source rows out of the frame
- **WHEN** viewport scrolling moves every retained source row of a transcript selection above or below the visible content rectangle
- **THEN** the selection paint SHALL disappear
- **AND** no endpoint SHALL transfer to a sticky prompt, jump/status control, editor, or footer row

#### Scenario: Float the scroll-to-bottom control above selection
- **WHEN** a transcript selection covers the row on which the scroll-to-bottom control is drawn
- **THEN** the control SHALL be painted above the selection with its ordinary presentation
- **AND** its cells SHALL contribute no text to visible-frame copy
- **AND** transcript cells on either side of the control SHALL remain selected

#### Scenario: Select the final content row without auto-scroll
- **WHEN** an active transcript selection's pointer rests on the final visible transcript row while dock rows exist below it
- **THEN** the transcript SHALL NOT auto-scroll
- **AND** auto-scroll SHALL begin only when the pointer moves below that row, or onto the first row, and SHALL use the declared per-speed distance of one, two, or three rows per 30-millisecond tick

#### Scenario: Keep the transcript still during dock selection
- **WHEN** a selection gesture begins on the editor, footer, or another dock row and its pointer moves within the dock or onto the final transcript row
- **THEN** the transcript SHALL NOT auto-scroll
- **AND** a click on a dock row SHALL leave the transcript position unchanged

#### Scenario: Preserve semantic response copying
- **WHEN** a response-only or command-driven copy route requests semantic agent content rather than a visible frame range
- **THEN** the transcript chrome exclusions SHALL remain in force
- **AND** complete-frame selectability SHALL NOT add transient or dock text to that semantic payload

## MODIFIED Requirements

### Requirement: The transcript occupies a bounded viewport above a pinned dock
Bare A1 SHALL render the session transcript, pending steering presentation, and live working-status surface inside the terminal rows above a bottom dock. The dock SHALL contain non-working status messages, above-editor widgets, the active input surface, below-editor widgets, and the footer in their existing relative order. Pending `Steering:` rows and their edit hint SHALL belong to non-persistent scrollable viewport content rather than the dock. The live working-status surface SHALL belong to that viewport content rather than the dock and SHALL be bottom-aligned immediately above the dock while all content fits. This declared bare-A1 layout difference SHALL change placement only, preserving the content, style, lifecycle, and extension contribution rules of these surfaces.

The complete frame SHALL remain within the current terminal width and height. A changing editor, dock widget, footer, or terminal size SHALL cause the transcript viewport to be reallocated rather than allowing the dock to scroll away. A pending-steering or working-status height change SHALL change transient viewport extent, not dock allocation. While content fits, the working status SHALL consume otherwise unused viewport space rather than displacing visible transcript or moving the editor/footer group.

#### Scenario: Launch with built-in startup help and resources
- **WHEN** bare A1 first renders the custom viewport
- **THEN** it SHALL omit Pi's version/help introduction, documentation suggestion, and loaded-resource inventory
- **AND** pinned comparison profiles SHALL retain their existing startup presentation

#### Scenario: Transcript exceeds the terminal
- **WHEN** transcript content and its transient steering and working surfaces are taller than the rows available above the dock
- **THEN** only the transcript viewport, including those transient surfaces, SHALL scroll
- **AND** the active input surface and footer SHALL remain at the bottom in their existing order

#### Scenario: Dock height changes
- **WHEN** the editor wraps, a widget appears, a selector replaces the editor, or the footer changes height
- **THEN** the transcript viewport SHALL give or reclaim rows for the dock
- **AND** no dock row SHALL be appended to transcript history

#### Scenario: Queue steering while the agent works
- **WHEN** the reader submits steering messages during an active run
- **THEN** Pi's accepted current steering message SHALL appear through its normal user-message event
- **AND** later pending messages SHALL render as `Steering:` rows followed by `↳ Alt+Up to edit all queued messages`
- **AND** those pending rows SHALL appear after semantic transcript content as non-persistent viewport rows while the queue is nonempty
- **AND** scrolling toward older content SHALL be able to move both pending steering and working-status rows out of view
- **AND** the editor, widgets, and footer SHALL remain pinned

#### Scenario: Status rendering is unchanged
- **WHEN** the working status is rendered in the viewport or the footer is rendered inside the dock
- **THEN** its text, color, spacing, animation, extension statuses, and lifecycle SHALL NOT depend on that placement

#### Scenario: Resize the terminal
- **WHEN** the terminal width or height changes
- **THEN** the frame SHALL be recomputed within the new dimensions
- **AND** the dock SHALL remain pinned while transcript, steering, and working-status wrapping, viewport height, scrollbar geometry, and hit regions update to the new size

### Requirement: Working status is a transient scrollable tail
Bare A1 SHALL place its live working-status surface, including status-owned blank spacing and retry, compaction, or extension working replacements, in a non-persistent transient viewport tail after semantic transcript and pending steering rows. While all semantic and transient content fits above the dock, otherwise unused viewport rows SHALL precede the pending-steering and working-status group so that pending steering appears immediately above the status and the status remains immediately above the dock without moving already visible semantic transcript rows. When content overflows, that flexible alignment space SHALL be zero and the same steering and working surfaces SHALL participate in normal viewport scrolling. The surfaces SHALL NOT be duplicated in the dock, converted into persisted conversation content, counted as completed assistant messages, or treated as submitted prompts.

Pending steering and working rows SHALL contribute to overflow, scrollbar geometry, and end-following navigation while present. While detached, new transcript output, queue updates, and status animation, replacement, or removal SHALL preserve the current transcript position unless the new extent requires clamping to a valid scroll position. Removing transient rows SHALL remove their owned spacing and leave no stale copy. Failure messages SHALL retain their existing placement; idle informational messages are governed by the transient dock notice requirement. The pinned `a1 pi` route SHALL retain its existing presentation and behavior.

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
- **AND** end following SHALL advance the overflowing viewport while keeping the pending-steering and working-status group visible immediately above the dock
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
- **THEN** pending steering rows and their edit hint SHALL appear immediately above the working-status surface
- **AND** the working-status surface SHALL appear immediately above the dock
- **AND** unused rows SHALL remain between semantic transcript content and the steering/status group
- **AND** existing semantic transcript rows and the editor/footer group SHALL remain at their current terminal rows

#### Scenario: Grow content while it still fits
- **WHEN** streamed content consumes one or more previously unused rows while the complete viewport content still fits
- **THEN** the flexible space before the pending-steering and working-status group SHALL shrink by the consumed rows
- **AND** the steering/status group and pinned dock SHALL remain at their current terminal rows
- **AND** no follow scroll SHALL occur solely to keep the fitting group visible

#### Scenario: Suppress pointer sequences begun on transient rows
- **WHEN** a pointer sequence begins on pending steering, working-status, or status-owned alignment rows outside a viewport control
- **THEN** the complete pointer sequence SHALL be consumed without creating transcript or fullscreen selection
- **AND** wheel input over those rows SHALL retain ordinary viewport scrolling

### Requirement: Transient surface ownership is stable across overflow
Pending steering rows and their edit hint, live working rows, and extension-working rows SHALL retain one non-persistent viewport ownership after semantic transcript content while a run crosses from fitting content to overflowing content or back. Non-working status, widgets, active input, and footer SHALL retain one dock ownership and relative order. While all viewport content fits, unused viewport rows SHALL precede a present live status so it remains immediately above the dock without moving earlier transcript or steering rows. At overflow that alignment gap SHALL be zero. The fit/overflow boundary SHALL NOT move a transient row between viewport and dock, duplicate or omit it for an intermediate frame, or move the stable editor/footer group.

#### Scenario: Cross from fitting to overflowing while working
- **WHEN** streamed rows consume the unused alignment space and then cause semantic transcript, pending steering, and live working rows to exceed the rows above the dock
- **THEN** the one working status SHALL remain in its transient viewport region and order
- **AND** the fitting alignment gap SHALL shrink to zero before ordinary end-following movement begins
- **AND** pending steering SHALL remain before the status in transient viewport content while the editor/footer group remains in the dock
- **AND** no frame SHALL show the status twice, omit its visible portion, or move it before actual overflow

#### Scenario: Queue input at the fit boundary
- **WHEN** a queued-input row appears while streamed content is at the fit/overflow boundary
- **THEN** the queued row SHALL appear after semantic transcript content and before any working status without entering the dock
- **AND** it SHALL contribute to transient viewport extent without becoming semantic transcript history
- **AND** unchanged input, widget, and footer rows SHALL remain at their existing dock coordinates

#### Scenario: Detach while the run continues
- **WHEN** the reader detaches from the end while pending steering or working rows are present
- **THEN** both surfaces SHALL remain transient viewport content according to their lifecycles
- **AND** transcript scrolling SHALL be able to scroll both surfaces out of view according to their actual positions
- **AND** neither surface nor fitting alignment rows SHALL count as selectable transcript content

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
- **AND** it SHALL NOT become transcript, semantic response-copy, prompt-navigation, or persisted-session content

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

## REMOVED Requirements

### Requirement: Selection precision and latency use exact-artifact acceptance
**Reason**: Acceptance-evidence requirement (physical-terminal comparison, recording results before merge) with no product behaviour of its own.
**Migration**: None; selection behaviour is specified by `session-frame-selection`, and acceptance is owned by the shared delivery workflow.

### Requirement: Content acceptance is independent of deferred native-link repairs
**Reason**: Acceptance-evidence requirement that also recorded a scope split against a tracked issue.
**Migration**: None; acceptance and its evidence are owned by the shared delivery workflow.

### Requirement: Hyperlink cleanup preserves interaction and has physical-terminal acceptance
**Reason**: One paragraph and two scenarios prescribed physical-terminal acceptance evidence.
**Migration**: The behaviour is kept by "Hyperlink cleanup preserves link targets and interaction".

### Requirement: Bottom-control hover is validated through terminal paint
**Reason**: Acceptance-evidence and diagnostic-procedure requirement with no product behaviour of its own.
**Migration**: None; acceptance and its evidence are owned by the shared delivery workflow.

### Requirement: Clipboard freeze acceptance includes stalled delivery and physical evidence
**Reason**: Acceptance-evidence requirement with no product behaviour of its own.
**Migration**: None; the non-blocking copy and paste behaviour is specified by the response-copy and paste requirements of this capability, and acceptance is owned by the shared delivery workflow.

### Requirement: Informational messages are a transient dock notice
**Reason**: It listed model-change confirmations, which bare A1 does not show, and excluded the notice from selection and copy although frame selection copies visible application messages.
**Migration**: Covered by "Informational command results are a transient dock notice".

### Requirement: Visual selection is independent from transcript ownership
**Reason**: It required a transcript-originated selection to stay clipped to the transcript rectangle; the code extends such a drag into dock rows and copies off-screen selected rows, as `session-frame-selection` specifies.
**Migration**: Ownership, sticky-prompt, control and auto-scroll rules are kept by "Frame selectability is independent from transcript ownership"; selection extent and copy are covered by `session-frame-selection` requirement "Frame selection remains boundary-precise".
