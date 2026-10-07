## ADDED Requirements

### Requirement: Every dismissible owned-shell surface closes on an implicit Ctrl+C alias

Every dismissible dialog, selector, nested modal flow, extension-hosted modal, and owned full-screen application presented by the owned shell SHALL treat one Ctrl+C input as the same silent cancel/close operation as Escape. The active dismissible surface SHALL consume the input before any search field, form editor, underlying agent editor, application exit chord, or parent surface can act on it. Ctrl+C SHALL close immediately even when the surface contains nonempty typed input and SHALL use its established cancellation lifecycle for disposal, focus restoration, parent restoration, and operation-specific effects.

Close shortcut guidance SHALL keep Ctrl+C implicit. A close or cancel hint SHALL advertise the surface's ordinary Escape/Esc key and SHALL NOT include Ctrl+C, while all other shortcut entries retain their effective keys and actions. Outside dismissible-surface ownership, Ctrl+C SHALL retain the existing behavior of the active editor, terminal surface, comparison profile, or application host that does not opt into close-on-interrupt behavior.

#### Scenario: Close a dialog with Ctrl+C
- **WHEN** any dismissible owned, adapted pinned, overlay, nested, or extension-hosted dialog has focus and receives Ctrl+C
- **THEN** the active dialog SHALL invoke its existing cancel/close path exactly once and restore the expected parent surface and focus
- **AND** the input SHALL NOT reach the underlying editor, application interrupt handler, or parent dialog

#### Scenario: Close a dismissible full-screen application with Ctrl+C
- **WHEN** Settings, Changelog, Keyboard Shortcuts, Session Info, or another owned application whose host opts into close-on-interrupt behavior receives Ctrl+C
- **THEN** the application SHALL close on that first input through the same host close lifecycle as Escape
- **AND** the input SHALL NOT reach a Settings filter, menu, structured editor, underlying editor, or application exit chord

#### Scenario: Close a surface containing typed input
- **WHEN** a searchable or editable dismissible surface contains a nonempty value and receives Ctrl+C
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
