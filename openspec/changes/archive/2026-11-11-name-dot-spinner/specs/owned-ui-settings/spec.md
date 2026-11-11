## MODIFIED Requirements

### Requirement: Spinner style is a live Appearance setting with native previews
Bare A1 SHALL expose a persisted A1 setting `spinnerStyle`, labeled `Spinner style`, in Appearance. Its ordered display choices SHALL be lowercase `dots`, `circle`, `diamond`, `square`, and `none` in both the settings row and dropdown, stored respectively as `current`, `circle`, `diamond`, `square`, and `none`. The `dots` choice, stored as `current`, SHALL remain the default and individual fallback for omitted or invalid values. Existing saved `current` values SHALL display as `dots` without migration; other explicitly saved valid selections SHALL remain unchanged. The choice SHALL use the existing profile-local A1 settings manager and live application boundary, without modifying Pi root settings or engine descriptors. Ordinary acceptance, persistence, cancellation, failed-write rollback, reload, and profile isolation SHALL apply.

The setting's dropdown SHALL use the shared value-menu preview column, like Accent color, to show each animated style's native glyph in the active semantic accent. The focused animated choice SHALL animate in place using the same frame set as the actual status indicator; the other choices SHALL retain representative glyphs. `none` SHALL have an empty preview slot. All labels SHALL remain aligned and menu geometry SHALL remain stable across animation frames. Merely focusing an option SHALL NOT persist a value or change the actual running status. Closing, replacing, canceling, or disposing the menu SHALL stop its preview animation.

#### Scenario: Open the spinner choice menu
- **WHEN** the reader opens Spinner style in bare-A1 Settings
- **THEN** the dropdown SHALL offer exactly lowercase `dots`, `circle`, `diamond`, `square`, and `none` in order with aligned native previews
- **AND** the focused animated choice SHALL animate without shifting its label or neighboring rows

#### Scenario: Preview and cancel
- **WHEN** the reader navigates among spinner options and cancels the dropdown
- **THEN** no value SHALL be saved or applied to the running status
- **AND** the dropdown's preview animation SHALL stop

#### Scenario: Accept a spinner style
- **WHEN** the reader accepts a valid different spinner style
- **THEN** the normal settings path SHALL persist and apply the new style live to every eligible owned progress surface
- **AND** a failed change SHALL retain or restore one consistent previous effective value
- **AND** accepting `dots` SHALL use the existing `current` storage identifier and unchanged dot animation

#### Scenario: Load a missing or invalid choice
- **WHEN** the profile omits Spinner style or stores an unsupported value
- **THEN** `dots`, represented internally as `current`, SHALL apply without blocking startup or changing other accepted settings

#### Scenario: Load existing saved choices
- **WHEN** the profile contains an existing valid Spinner style selection
- **THEN** saved `current` SHALL display as `dots` and retain the existing dot animation
- **AND** saved circle, diamond, square, and none selections SHALL remain selected rather than being reset to the default

#### Scenario: Keep the comparison profile pinned
- **WHEN** the reader launches the explicit comparison profile
- **THEN** it SHALL neither expose nor apply the A1 Spinner style setting
