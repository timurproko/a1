## ADDED Requirements

### Requirement: Every owned-shell dialog closes on an implicit Ctrl+C alias

Every dismissible dialog, selector, nested modal flow, and extension-hosted modal presented by the owned shell SHALL treat one Ctrl+C input as the same silent cancel/close operation as Escape. The active dialog SHALL consume the input before any search field, form editor, underlying agent editor, application interrupt chord, or parent surface can act on it. Ctrl+C SHALL close immediately even when the dialog contains nonempty typed input and SHALL use the dialog's established cancellation lifecycle for disposal, focus restoration, parent restoration, and operation-specific effects.

Dialog shortcut guidance SHALL keep Ctrl+C implicit. A close or cancel hint SHALL advertise the dialog's ordinary Escape/Esc key and SHALL NOT include Ctrl+C, while all other shortcut entries retain their effective keys and actions. Outside dialog ownership, Ctrl+C SHALL retain the existing behavior of the active editor, full-screen application, or terminal surface.

#### Scenario: Close a dialog with Ctrl+C
- **WHEN** any dismissible owned, adapted pinned, overlay, nested, or extension-hosted dialog has focus and receives Ctrl+C
- **THEN** the active dialog SHALL invoke its existing cancel/close path exactly once and restore the expected parent surface and focus
- **AND** the input SHALL NOT reach the underlying editor, application interrupt handler, or parent dialog

#### Scenario: Close a dialog containing typed input
- **WHEN** a searchable or editable dialog contains a nonempty value and receives Ctrl+C
- **THEN** the dialog SHALL close immediately rather than clearing or editing the value first
- **AND** it SHALL NOT select, submit, save, or otherwise commit that value

#### Scenario: Keep cancellation silent
- **WHEN** Ctrl+C closes a dialog whose Escape path is silent
- **THEN** no generic cancellation transcript, workflow, notification, or status row SHALL be appended
- **AND** any operation-specific cancellation effect SHALL remain identical to that dialog's Escape path

#### Scenario: Render dialog shortcut guidance
- **WHEN** a dialog renders its close or cancel shortcut entry
- **THEN** the entry SHALL show its ordinary Escape/Esc key and existing close/cancel action wording
- **AND** Ctrl+C SHALL NOT appear in that shortcut row

#### Scenario: Press Ctrl+C outside a dialog
- **WHEN** no dialog owns input and the active editor, full-screen application, or terminal surface receives Ctrl+C
- **THEN** that surface's existing interrupt, clear, copy, close-chord, or exit behavior SHALL remain unchanged
