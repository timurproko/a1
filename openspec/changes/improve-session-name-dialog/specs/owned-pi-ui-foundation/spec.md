## MODIFIED Requirements

### Requirement: Bare-A1 session naming supports direct and prompted entry

Bare A1 SHALL accept `/name <name>` as an immediate session-name update. When the user invokes `/name` without an argument, bare A1 SHALL present a compact single-line input instead of appending the usage warning or only reporting the current name. The input SHALL use the accent title `Session Name`, the standard focused text-entry row, and the shared `Enter submit` and `Esc close` shortcut hints. It SHALL initially contain the current session name with its caret at the end, or an empty value when the session has no name. Each invocation SHALL read the current name anew.

The name field SHALL support mouse text selection, Ctrl+A to select all, Ctrl+Z to undo user edits, Ctrl+X to cut selected text, Ctrl+C to copy selected text, and Ctrl+V to paste clipboard text. Typing or pasting over a selection SHALL replace that selection; cut and paste SHALL be undoable. Editing SHALL remain single-line and use the existing text-input sanitation and length bounds. Selection SHALL use the same foreground and background treatment as selected text in the ordinary prompt input, including the active theme. Pointer mapping and selection rendering SHALL remain correct for the modal inset, wide graphemes, horizontal scrolling, clipping, and resize. These editing shortcuts SHALL NOT be added to the dialog's visible shortcut footer.

Ctrl+C with selected name text SHALL copy without closing, submitting, or mutating the name. Ctrl+C without selected text SHALL retain silent dismissal. Escape SHALL always cancel. Submitting a non-empty value SHALL apply it through the same session-name workflow as the direct command and SHALL report the resulting normalized name. Cancelling, or submitting only whitespace, SHALL restore the ordinary prompt and its retained draft and attachments without changing the session name or appending a warning, error, or completion message. Clipboard completion after dismissal SHALL NOT mutate another input surface. The explicit `a1 pi` comparison profile and unrelated input dialogs SHALL retain their established behavior.

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
- **THEN** the field SHALL contain `Project Alpha` with its caret at the end
- **AND** reopening after a successful rename SHALL show the new current name

#### Scenario: Name an unnamed session
- **WHEN** a session without a name opens `/name`
- **THEN** the name field SHALL start empty

#### Scenario: Select and replace name text
- **WHEN** the user drags over name text with the mouse or presses Ctrl+A
- **THEN** the selected text SHALL use the ordinary prompt input's selection colors
- **AND** typing SHALL replace the selection while Ctrl+Z SHALL restore the prior field value

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
- **AND** the ordinary normalized-name result SHALL be reported

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

## ADDED Requirements

### Requirement: Footer session names offer draft-preserving context editing

The visible session-name span in bare A1's status footer SHALL highlight on mouse hover while retaining its ordinary foreground. Right-clicking that span SHALL open a compact context menu containing `Edit`. The menu SHALL use the pre-pivot popup treatment: a borderless dark grey surface, one-cell horizontal padding, normal-weight white actionable text, no initial highlighted item, and the live accent-selected background on hover. It SHALL appear above its bottom-bar anchor and remain clamped within terminal bounds. Clicking outside or pressing Escape or Ctrl+C SHALL dismiss it without changing the session or prompt.

Choosing `Edit` by mouse or keyboard SHALL open the same prefilled Session Name dialog as argument-free `/name`, without submitting, clearing, or replacing the ordinary prompt draft or its attachments. Submitting or cancelling the dialog SHALL restore that retained draft and attachments. Hit testing SHALL cover only visible name cells, account for clipping and resize, and exclude adjacent footer metadata. An unnamed session SHALL expose no invisible name target. The comparison profile SHALL retain its established footer behavior.

#### Scenario: Hover and edit a footer name
- **WHEN** the pointer enters the visible session-name span in the bare-A1 footer
- **THEN** that span SHALL receive subtle accent-selected hover background without changing neighboring footer cells
- **WHEN** the user right-clicks that span
- **THEN** a borderless dark popup containing `Edit` SHALL open above the footer without an initially highlighted item
- **AND** hovering Edit SHALL change only its background to the live selected-background role

#### Scenario: Keep an entered prompt through name editing
- **WHEN** the user has an ordinary prompt draft with attachments and chooses Edit from the footer-name context menu
- **THEN** the prefilled name dialog SHALL open without sending or clearing that draft
- **WHEN** the user submits a new name or cancels the dialog
- **THEN** the prompt draft and attachments SHALL remain available for continued editing

#### Scenario: Dismiss the context menu
- **WHEN** the user clicks outside the open name menu or presses Escape or Ctrl+C
- **THEN** the menu SHALL close without changing the name, submitting the prompt, or losing the prompt draft

#### Scenario: Bound name interaction to its painted geometry
- **WHEN** the footer name is clipped or the terminal resizes
- **THEN** hover and right-click hit testing SHALL follow only its current visible cells and the menu SHALL stay inside terminal bounds
- **AND** adjacent footer metadata and unnamed or comparison sessions SHALL NOT acquire a name-edit target
