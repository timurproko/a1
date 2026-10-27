# owned-ui-settings Delta

## ADDED Requirements

### Requirement: Tab Bar settings expose the plus menu
During resident launches, the `Tab Bar` section SHALL expose `Plus menu` with the value `configure`. Activating it SHALL open the plus-menu dialog, which lists `Agent`, `Settings`, and `Changelog` with `●` for each kind `+` offers and `○` otherwise and toggles the selected kind with `Space`. The enabled kinds SHALL be stored as the A1 setting `tabBarPlusMenu` in A1-owned profile-local persistence and applied to attached resident clients without a restart; the default SHALL be `Agent` alone. Direct `a1 solo` and `a1 pi` SHALL continue to omit the section.

#### Scenario: Open the plus-menu dialog from Settings
- **WHEN** the user selects `Plus menu` in the Tab Bar section and presses `Enter`
- **THEN** the plus-menu dialog SHALL open with `Agent` marked `●` and `Settings` and `Changelog` marked `○` under the default

#### Scenario: Store a toggle
- **WHEN** the user toggles `Settings` on in the dialog
- **THEN** `tabBarPlusMenu` SHALL store `agent` and `settings` in kind order and no Pi or Agent setting SHALL be written

## MODIFIED Requirements

### Requirement: Tabs settings expose tab-bar position
During resident launches, the owned Settings screen SHALL expose `Tab bar position` in the existing section titled `Tab Bar` with exactly `top` and `bottom` choices, in that order, and `top` as the default. The setting SHALL use A1-owned profile-local persistence and live application. Direct `a1 solo` and `a1 pi` SHALL continue to omit the Tab Bar section and SHALL NOT apply this setting to their interfaces.

#### Scenario: Inspect resident Tabs settings
- **WHEN** the resident Settings utility presents the Tab Bar section
- **THEN** it SHALL include `Auto name`, `Tab bar position`, and `Plus menu`
- **AND** `Tab bar position` SHALL offer `top` and `bottom`

#### Scenario: Resolve the default position
- **WHEN** the active profile stores no tab-bar position
- **THEN** the setting SHALL resolve to `top`

#### Scenario: Change the position
- **WHEN** the user changes `Tab bar position`
- **THEN** the value SHALL be stored in the A1 settings namespace and applied to attached resident clients without an Agent restart
- **AND** no Pi or Agent setting SHALL be written

#### Scenario: Keep direct modes strip-free
- **WHEN** the user opens Settings in `a1 solo` or starts `a1 pi`
- **THEN** no tab-bar position entry SHALL be shown or applied
