## MODIFIED Requirements

### Requirement: Bare-A1 session naming supports direct and prompted entry

Bare A1 SHALL accept `/name <name>` as an immediate session-name update. When the user invokes `/name` without an argument, bare A1 SHALL present a compact single-line input instead of appending the usage warning or only reporting the current name. The input SHALL use the accent title `Session Name`, the standard focused text-entry row, and the shared `Enter submit` and `Esc close` shortcut hints. It SHALL initially contain the current session name fully selected with its caret at the end so typing immediately replaces it, or an empty value when the session has no name. Each invocation SHALL read the current name anew.

The name field SHALL support mouse drag selection, double-click word selection, triple-click selection of the entire name including horizontally hidden text, Ctrl+A to select all, Ctrl+Z to undo user edits, Ctrl+X to cut selected text, Ctrl+C to copy selected text, and Ctrl+V to paste clipboard text. Typing or pasting over a selection SHALL replace that selection; cut and paste SHALL be undoable. Editing SHALL remain single-line and use the existing text-input sanitation and length bounds. Selection SHALL use the same foreground and background treatment as selected text in the ordinary prompt input, including the active theme. Pointer mapping and selection rendering SHALL remain correct for the modal inset, wide graphemes, horizontal scrolling, clipping, and resize. These editing shortcuts SHALL NOT be added to the dialog's visible shortcut footer.

Ctrl+C with selected name text SHALL copy without closing, submitting, or mutating the name. Ctrl+C without selected text SHALL retain silent dismissal. Escape SHALL always cancel. Submitting a non-empty value SHALL apply it through the same session-name workflow as the direct command. Successful direct or prompted bare-A1 naming SHALL update the footer and terminal title without appending `Session name set:` or another redundant success message; genuine errors SHALL remain visible. Cancelling, or submitting only whitespace, SHALL restore the ordinary prompt and its retained draft and attachments without changing the session name or appending a warning, error, or completion message. Clipboard completion after dismissal SHALL NOT mutate another input surface. The explicit `a1 pi` comparison profile and unrelated input dialogs SHALL retain their established behavior.

#### Scenario: Name a session directly
- **WHEN** the user invokes `/name Project Alpha` in bare A1
- **THEN** the session name SHALL be updated immediately through the existing naming workflow
- **AND** no name-input dialog SHALL open

#### Scenario: Open the name input
- **WHEN** the user invokes `/name` without an argument in bare A1
- **THEN** a compact input titled `Session Name` SHALL replace the ordinary prompt
- **AND** it SHALL show the shared `Enter submit` and `Esc close` shortcut hints without editing-shortcut guidance
- **AND** no usage warning or current-name-only result SHALL be appended

#### Scenario: Edit the current name
- **WHEN** a session named `Project Alpha` opens `/name`
- **THEN** the field SHALL contain fully selected `Project Alpha` with its caret at the end
- **AND** immediate typing SHALL replace it while explicit caret movement SHALL allow appending
- **AND** reopening after a successful rename SHALL show the new current name

#### Scenario: Name an unnamed session
- **WHEN** a session without a name opens `/name`
- **THEN** the name field SHALL start empty

#### Scenario: Select and replace name text
- **WHEN** the user drags over name text with the mouse or presses Ctrl+A
- **THEN** the selected text SHALL use the ordinary prompt input's selection colors
- **AND** typing SHALL replace the selection while Ctrl+Z SHALL restore the prior field value

#### Scenario: Select a word or the entire name by repeated clicks
- **WHEN** the user double-clicks a word in the name field
- **THEN** that word SHALL be selected through button release using grapheme-aware boundaries
- **WHEN** the user triple-clicks in the field
- **THEN** the entire name SHALL be selected, including horizontally hidden text
- **AND** copy, cut, replacement, and undo SHALL operate on that selection

#### Scenario: Cut, copy, paste, and undo
- **WHEN** the user selects name text and presses Ctrl+C
- **THEN** the selected text SHALL be copied and the dialog SHALL remain open without changing the name
- **WHEN** the user selects text and presses Ctrl+X
- **THEN** the selected text SHALL be copied and removed from the field
- **WHEN** the user presses Ctrl+V
- **THEN** clipboard text SHALL be inserted at the caret or replace the selection as single-line input
- **AND** Ctrl+Z SHALL undo the cut or paste without changing the stored session name

#### Scenario: Select clipped or wide text
- **WHEN** the field contains wide graphemes or horizontally scrolled text and the user drags a selection or resizes the terminal
- **THEN** selection boundaries and highlight cells SHALL track the visible name text within the framed field
- **AND** the underlying transcript SHALL NOT receive the selection drag

#### Scenario: Submit a prompted name
- **WHEN** the user enters a non-empty name and presses Enter
- **THEN** the input SHALL close and the session SHALL use that name
- **AND** the footer and terminal title SHALL show the resulting name without a redundant success message

#### Scenario: Cancel prompted naming
- **WHEN** the user presses Escape, presses Ctrl+C without selected text, or submits only whitespace in the name input
- **THEN** the input SHALL close and restore the ordinary prompt with its retained draft and attachments
- **AND** the existing session name SHALL remain unchanged
- **AND** no command-result message SHALL be appended

#### Scenario: Dismiss during clipboard retrieval
- **WHEN** the name dialog closes before a requested clipboard read completes
- **THEN** the completion SHALL NOT modify the restored prompt or a later dialog

#### Scenario: Use the comparison profile
- **WHEN** the user invokes argument-free `/name` in the explicit `a1 pi` comparison profile
- **THEN** the pinned comparison workflow SHALL remain unchanged

### Requirement: Every dismissible owned-shell surface closes on an implicit Ctrl+C alias

Every dismissible dialog, selector, nested modal flow, extension-hosted modal, and owned full-screen application presented by the owned shell SHALL treat one Ctrl+C input as the same silent cancel/close operation as Escape, except when the bare-A1 Session Name field has selected text. In that field, Ctrl+C SHALL copy the selection and keep the dialog open; without selected text it SHALL cancel normally. The active dismissible surface SHALL consume the input before any underlying agent editor, application exit chord, or parent surface can act on it. Outside that explicit selected-name-text exception, Ctrl+C SHALL close immediately even when the surface contains nonempty typed input and SHALL use its established cancellation lifecycle for disposal, focus restoration, parent restoration, and operation-specific effects.

Close shortcut guidance SHALL keep Ctrl+C implicit. A close or cancel hint SHALL advertise the surface's ordinary Escape/Esc key and SHALL NOT include Ctrl+C, while all other shortcut entries retain their effective keys and actions. Outside dismissible-surface ownership, Ctrl+C SHALL retain the existing behavior of the active editor, terminal surface, comparison profile, or application host that does not opt into close-on-interrupt behavior.

#### Scenario: Close a dialog with Ctrl+C
- **WHEN** a dismissible owned, adapted pinned, overlay, nested, or extension-hosted dialog receives Ctrl+C outside the selected-name-text exception
- **THEN** the active dialog SHALL invoke its existing cancel/close path exactly once and restore the expected parent surface and focus
- **AND** the input SHALL NOT reach the underlying editor, application interrupt handler, or parent dialog

#### Scenario: Copy selected name text instead of cancelling
- **WHEN** the bare-A1 Session Name field has selected text and receives Ctrl+C
- **THEN** the selected text SHALL be copied without closing the dialog or changing the stored session name
- **AND** the input SHALL NOT propagate to a cancellation wrapper or underlying surface

#### Scenario: Close a dismissible full-screen application with Ctrl+C
- **WHEN** Settings, Changelog, Keyboard Shortcuts, Session Info, or another owned application whose host opts into close-on-interrupt behavior receives Ctrl+C
- **THEN** the application SHALL close on that first input through the same host close lifecycle as Escape
- **AND** the input SHALL NOT reach a Settings filter, menu, structured editor, underlying editor, or application exit chord

#### Scenario: Close a surface containing typed input
- **WHEN** a searchable or editable dismissible surface contains a nonempty value and receives Ctrl+C outside the selected-name-text exception
- **THEN** the surface SHALL close immediately rather than clearing or editing the value first
- **AND** it SHALL NOT select, submit, save, or otherwise commit that value

#### Scenario: Keep cancellation silent
- **WHEN** Ctrl+C closes a dismissible surface whose Escape path is silent
- **THEN** no generic cancellation transcript, workflow, notification, or status row SHALL be appended
- **AND** any operation-specific cancellation effect SHALL remain identical to that surface's Escape path

#### Scenario: Render close shortcut guidance
- **WHEN** a dismissible surface renders its close or cancel shortcut entry
- **THEN** the entry SHALL show its ordinary Escape/Esc key and existing close/cancel action wording
- **AND** Ctrl+C SHALL NOT appear in that shortcut row

#### Scenario: Press Ctrl+C outside a dismissible surface
- **WHEN** no dismissible surface owns input and the active editor, terminal surface, comparison profile, or non-opted-in application host receives Ctrl+C
- **THEN** that surface's existing interrupt, clear, copy, close-chord, or exit behavior SHALL remain unchanged

### Requirement: The bare-A1 thinking selector uses the established selector treatment
The bare-A1 thinking selector SHALL render `Thinking Level` in bold semantic accent color, matching the heading treatment used by the Models configuration surface. Its resolved cycle hint SHALL render in semantic muted grey on the immediately following row. Repeated available-level values SHALL collapse to one row. Every level row SHALL begin with a fixed-width exclusive-radio marker that differs from the Models dialog's multi-select state: the configured default SHALL use exactly one semantic accent-colored `◉`, and every non-default level SHALL use a semantic dim `○`. One space after that marker, every row SHALL render its unpadded level name. The active session level SHALL have exactly one semantic success-green checkmark one space immediately after the final visible cell of its level name, matching the item-adjacent active treatment used by other dialogs; the checkmark SHALL NOT be delayed to a shared marker column. Width-balancing padding SHALL follow the optional active marker so every description renders inline in semantic muted grey and begins at the same column regardless of active/default placement. The selector SHALL NOT render the textual `[default]` marker. Space SHALL immediately persist the highlighted level as the configured global default, move the single selected radio to that row, and replace the previous row's marker with an unselected radio without closing the selector, changing the active session level, or creating an unsaved state. Enter SHALL continue selecting the highlighted session level, and only Escape SHALL close the selector. Ctrl+C SHALL NOT close the selector or invoke cancellation. The shortcut footer SHALL use semantic hint styling and read `Type search  Enter select  Space default  Esc close`. While the bare-A1 selector is open, the shell footer SHALL keep its current thinking-level suffix visible with its normal foreground. Default-only changes SHALL NOT change that displayed active level; selecting a new session level SHALL update it through the existing workflow. The interaction change SHALL preserve the selector's borders, search input, navigation, filtering, focus, restoration behavior, narrow-width bounds, and comparison-profile isolation.

#### Scenario: Render the thinking selector heading
- **WHEN** the user opens the bare-A1 thinking selector
- **THEN** the heading SHALL read `Thinking Level`
- **AND** every heading cell SHALL use the active theme's accent color and bold emphasis
- **AND** the resolved cycle hint SHALL use semantic muted grey on the row directly below the heading

#### Scenario: Render level rows
- **WHEN** the selector displays selected and unselected level rows
- **THEN** repeated available-level values SHALL render exactly once
- **AND** every row SHALL begin with a fixed exclusive-radio marker followed by one space and the unpadded level name
- **AND** only the configured default level SHALL use a semantic accent-colored `◉`
- **AND** every non-default level SHALL use a semantic dim `○`
- **AND** no row SHALL render the Models multi-select `●` or the textual `[default]` marker
- **AND** only the active session level SHALL place one semantic success-green checkmark one space immediately after its name
- **AND** trailing width-balancing space SHALL follow the optional active checkmark rather than separate it from the name
- **AND** every description SHALL use semantic muted grey and begin at the same column regardless of active/default placement
- **AND** the shell footer SHALL retain its current thinking-level suffix while the selector is open
- **AND** closing the selector SHALL leave the current suffix visible without a hide/restore transition

#### Scenario: Interact with the styled selector
- **WHEN** the user filters or navigates levels, selects a session level, changes the default level, or closes the selector
- **THEN** the selector SHALL retain its specified interaction and restoration outcomes
- **AND** heading and row styling SHALL NOT alter list geometry, narrow-width bounds, focus, or instruction placement

#### Scenario: Stage and save a default level
- **WHEN** the user highlights a level and presses Space
- **THEN** the single selected radio `◉` SHALL move to that level immediately
- **AND** the previous default row SHALL render `○`
- **AND** that level SHALL be persisted as the global default immediately
- **AND** the selector SHALL remain open
- **AND** the active session level, its footer suffix, and its item-adjacent checkmark SHALL remain unchanged
- **AND** no unsaved label or staged state SHALL appear

#### Scenario: Select or close
- **WHEN** the user presses Enter on a highlighted level
- **THEN** that level SHALL be selected for the session through the existing selection workflow
- **WHEN** the user presses Escape
- **THEN** the selector SHALL close and restore its parent surface
- **WHEN** the user presses Ctrl+C
- **THEN** the selector SHALL remain open and SHALL NOT invoke cancellation

#### Scenario: Render compact controls
- **WHEN** the bare-A1 thinking selector is open
- **THEN** its semantic shortcut footer SHALL read `Type search  Enter select  Space default  Esc close` in that order
- **AND** `Type` SHALL use the quiet key role while `search` uses the action-text role
- **AND** it SHALL NOT advertise Ctrl+S, `Escape/Ctrl+C`, or the verbose `to select`, `to set as default`, or `to cancel` wording

#### Scenario: Preserve comparison behavior
- **WHEN** the user opens the thinking selector through `a1 pi`
- **THEN** the pinned comparison selector SHALL retain its existing interactions and presentation

## ADDED Requirements

### Requirement: Footer controls offer draft-preserving direct editing

Bare A1's visible session name, active model name, and thinking level SHALL independently highlight on hover using the subtle live accent-selected background while retaining their ordinary foreground. Each control's hover and click target SHALL fit its visible text only and SHALL NOT insert blank side characters. Hover SHALL NOT shift layout or cover neighboring labels, separators, or provider metadata. A normal left-click SHALL directly open Session Name, Models, or Thinking Level respectively, without a context menu or prompt submission.

When the existing provider-count and width rules show a provider qualifier, bare A1 SHALL render it in square brackets immediately after the active model name and before the thinking-level separator, as `model [provider] • level`, matching the Models dialog. Provider metadata SHALL remain outside the model and thinking hover/click targets. Existing qualifier visibility, omission before clipping higher-priority content, routed-model meaning, foreground roles, and comparison-profile formatting SHALL remain unchanged.

Opening, submitting, or cancelling these dialogs SHALL retain the ordinary prompt draft and its attachments. Footer hover SHALL remain active while a dock dialog is open; clicking a footer control in that state SHALL close the active dialog through its ordinary Escape/cancel path without saving edits or opening a nested dialog. Floating overlays SHALL continue blocking background footer controls. Hit testing SHALL follow explicit current painted spans, including clipping, gutters, suppressed fields, and resize. Invisible, unnamed, missing-model, suppressed-level, comparison-profile, and extension-replaced footer controls SHALL expose no fabricated target. The initiating pointer gesture SHALL NOT propagate to the opened dialog or underlying prompt.

#### Scenario: Hover and directly edit a footer name
- **WHEN** the pointer enters the visible footer-name text
- **THEN** only that text SHALL receive subtle hover background without extra spaces or layout shift
- **WHEN** the user normally left-clicks the target
- **THEN** the fully selected name dialog SHALL open directly without a context menu

#### Scenario: Keep an entered prompt through footer editing
- **WHEN** the user has an ordinary prompt draft with attachments and clicks a footer control
- **THEN** its corresponding dialog SHALL open without sending or clearing that draft
- **WHEN** the user submits or cancels the dialog
- **THEN** the prompt draft and attachments SHALL remain available for continued editing

#### Scenario: Open model and thinking selectors consistently
- **WHEN** the user hovers and left-clicks the visible model name
- **THEN** it SHALL use the shared text-only hover treatment and open Models
- **WHEN** the user hovers and left-clicks the visible thinking level
- **THEN** it SHALL use the same treatment and open Thinking Level

#### Scenario: Toggle an open dock dialog from the footer
- **WHEN** Session Name, Models, or Thinking Level is open in the dock and the pointer enters a footer control
- **THEN** its text SHALL still highlight on hover
- **WHEN** the user clicks the control again
- **THEN** the active dialog SHALL close through its Escape path without committing edits or losing the prompt draft and attachments

#### Scenario: Render the provider after the model
- **WHEN** the bare-A1 footer has multiple providers and sufficient width for its optional provider qualifier
- **THEN** it SHALL render `model [provider] • level` rather than `(provider) model • level`
- **AND** the provider and its brackets SHALL remain outside both interactive text spans
- **WHEN** the qualifier no longer fits or the existing provider-count rule omits it
- **THEN** the model and level targets SHALL remain aligned with their visible text
- **AND** the comparison profile SHALL retain its established qualifier format

#### Scenario: Bound footer interaction to painted geometry
- **WHEN** footer controls are clipped, suppressed, absent, or resized
- **THEN** only their currently visible text spans SHALL be interactive
- **AND** neighboring metadata and comparison or extension-replaced footers SHALL NOT acquire those targets
