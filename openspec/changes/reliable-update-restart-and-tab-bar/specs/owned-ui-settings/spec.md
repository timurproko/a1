## ADDED Requirements

### Requirement: Tab Bar canvas is a live resident setting

The resident `Tab Bar` settings section SHALL expose a live `Background` choice with `Transparent` as the default and `Black` and `Accent` as alternatives. The profile-local `tabBarBackgroundStyle` setting SHALL store the selected choice and apply without restarting the viewed Agent. Transparent SHALL restore the terminal default background on every unoccupied strip cell; Black and Accent SHALL use the established dark and selected-accent canvas semantics. Tab chips and popups SHALL retain their independent readable surfaces.

#### Scenario: Select transparent canvas

- **WHEN** `tabBarBackgroundStyle` is absent or the user selects Transparent
- **THEN** the strip SHALL explicitly restore the terminal default background across its unoccupied row

#### Scenario: Change canvas while attached

- **WHEN** the user changes the tab-bar Background from Transparent to Black or Accent while attached
- **THEN** the full strip row SHALL repaint with that canvas
- **AND** the retained Agent surface and input target SHALL remain unchanged
