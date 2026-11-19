## REMOVED Requirements

### Requirement: A structured-setting dialog has one upper boundary rule

When the owned Settings screen opens a structured-setting dialog, the dialog's own standard top rule SHALL replace the ordinary divider between Settings content and footer guidance. The frame SHALL show exactly one full-width boundary rule above the dialog title rather than stacking the Settings divider with the dialog rule. A generic structured dialog SHALL then show its setting title, the selected part's muted description, its menu rows, concise shortcut/action hints, and its standard bottom rule.

#### Scenario: Open a structured setting

- **WHEN** the user opens a setting whose value is edited through the structured dialog
- **THEN** exactly one full-width rule SHALL separate the Settings list from the dialog title
- **AND** no second Settings footer-divider rule SHALL be rendered above that dialog rule

#### Scenario: Use the structured dialog after removing the redundant divider

- **WHEN** the user navigates in the open structured dialog
- **THEN** its title SHALL remain one row below the sole top rule
- **AND** the selected part's muted description SHALL appear below the title and above the menu rows
- **AND** the dialog's shortcut guidance and bottom rule SHALL remain visible

## ADDED Requirements

### Requirement: Every Settings configure workflow uses one centered modal frame

When the owned Settings screen opens a configure workflow, it SHALL keep the Settings list and standing footer visible as a dimmed backdrop and present the workflow on the shared centered floating configure-modal frame. Warnings, generic object-valued settings, both steps of the per-model Thinking Level selector, the TypeScript Plus Menu fallback, and future structured settings SHALL use that frame rather than replacing the Settings footer with a full-width docked panel. Resident Settings MAY continue delegating Plus Menu to the native tab-bar dialog, which uses the same centered modal presentation.

The centered modal SHALL use the shared component's native-matching floating panel background across its complete rectangular area, retain the active theme's semantic title, description, row, selection, input, and shortcut roles, and use the established compact dialog width when the terminal permits. Warnings, both Thinking Level steps, fallback Plus Menu, generic structured settings, and future configure workflows SHALL receive that palette through the same semantic panel role rather than route- or dialog-specific background values. Its selected row SHALL fill the inner content width with the active selection background while the two-column outer inset remains on the panel background. The existing configure workflow SHALL continue to own its keyboard behavior, pointer policy, writes, undo state, filtering, step transitions, and close behavior. The model and choice windows SHALL adapt to available height so title, active search or selection, and shortcut guidance remain visible on compact terminals.

#### Scenario: Configure warnings

- **WHEN** the user activates `Warnings` from Settings
- **THEN** Settings SHALL remain visible at reduced intensity behind a centered floating `Warnings` modal
- **AND** the modal SHALL show the selected warning description, warning rows, and semantic `Enter change`, `Ctrl+Z undo`, and `Esc close` guidance

#### Scenario: Configure per-model thinking levels

- **WHEN** the user opens either step of the per-model Thinking Level workflow
- **THEN** that step SHALL use the same centered floating frame and dimmed Settings backdrop as other configure workflows
- **AND** model search, provider suffix styling, level selection, step markers, and active-step shortcut guidance SHALL retain their existing behavior

#### Scenario: Configure another structured setting

- **WHEN** a current or future object-valued setting opens through `configure`
- **THEN** it SHALL inherit the centered configure frame without a setting-specific placement branch
- **AND** changing, undoing, or closing it SHALL retain the setting's declared backend behavior

#### Scenario: Render Settings on a compact terminal

- **WHEN** a configure workflow opens with fewer rows or columns than its preferred modal geometry
- **THEN** the modal SHALL stay within the Settings frame and preserve its title, active control or selected row, and shortcut guidance
- **AND** the returned Settings frame SHALL still contain exactly the requested rows with no row wider than the requested width
