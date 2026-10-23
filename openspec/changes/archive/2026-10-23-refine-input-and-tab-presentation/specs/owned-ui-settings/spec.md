## ADDED Requirements

### Requirement: Tabs settings expose tab-bar position
During resident launches, the owned Settings screen SHALL expose `Tab bar position` in the existing Tabs section with exactly `top` and `bottom` choices, in that order, and `top` as the default. The setting SHALL use A1-owned profile-local persistence and live application. Direct `a1 solo` and `a1 pi` SHALL continue to omit the Tabs section and SHALL NOT apply this setting to their interfaces.

#### Scenario: Inspect resident Tabs settings
- **WHEN** the resident Settings utility presents the Tabs section
- **THEN** it SHALL include `Auto name` and `Tab bar position`
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

### Requirement: Settings text inputs omit prompt markers
The owned Settings search input and every Settings-owned auxiliary filter, including the per-model thinking selector search, SHALL render no chevron or ASCII greater-than prompt marker. Their top and bottom rules, content inset, placeholder, block caret, filtering, navigation, and cancellation behavior SHALL remain unchanged. This requirement supersedes earlier Settings requirements that specified `❯` or `> ` for these inputs.

#### Scenario: Open Settings search
- **WHEN** the user opens the `search settings` input
- **THEN** its input row SHALL begin with the placeholder or caret at the shared content inset
- **AND** no chevron or greater-than marker SHALL precede it

#### Scenario: Filter per-model thinking settings
- **WHEN** the per-model Thinking Level selector shows its step-one search input
- **THEN** typed text and the empty placeholder SHALL use the marker-free input row
- **AND** model filtering, navigation, selection, and Escape behavior SHALL remain unchanged
