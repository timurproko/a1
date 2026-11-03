## ADDED Requirements

### Requirement: Tab Bar right-side items are configured through a live multi-select setting
During resident launches, the `Tab Bar` section SHALL expose a `Right side` setting with the displayed value `configure`, ordered after `Plus menu` and before `Auto name`. Activating it SHALL open a searchable multi-select dialog titled `Tab Bar Right Side` with the description `Choose what the right side of the tab bar shows.` and the rows `Version` and `Time` in that order. Enabled rows SHALL use `●`, disabled rows SHALL use `○`, and `Space` SHALL toggle the selected row without closing the dialog.

The enabled keys SHALL be stored in the profile-local A1 setting `tabBarRightItems` as a comma-joined ordered subset of `version,time`. Its default SHALL be `version,time`; every subset, including empty, SHALL be valid. Each toggle SHALL persist immediately under the existing settings lock and apply live to attached resident clients. Direct `a1 solo` and `a1 pi` settings SHALL omit the Tab Bar section and this setting.

#### Scenario: Open right-side configuration
- **WHEN** the user selects `Right side` in the Tab Bar section and presses Enter
- **THEN** the `Tab Bar Right Side` dialog SHALL list enabled Version and Time rows in fixed order
- **AND** the dialog SHALL provide the same search, navigation, Space-toggle, and Escape-close behavior as the Plus Menu multi-select dialog

#### Scenario: Toggle an item
- **WHEN** the user toggles Version or Time
- **THEN** `tabBarRightItems` SHALL persist the resulting ordered subset immediately
- **AND** attached resident tab strips SHALL apply it without restart

#### Scenario: Existing profile has no setting
- **WHEN** a profile predates `tabBarRightItems`
- **THEN** Version and Time SHALL both be enabled by default without requiring migration input

#### Scenario: Settings run without a tab bar
- **WHEN** Settings runs through `a1 solo` or `a1 pi`
- **THEN** the Tab Bar section and `Right side` entry SHALL not be presented
