## ADDED Requirements

### Requirement: The UI accent is a live Appearance setting

Bare A1 SHALL expose one persisted A1 setting `accentColor`, labeled `Accent color`, in an `Appearance` section after `Generic`. It SHALL offer `default`, `blue`, `cyan`, `green`, `orange`, and `pink` in that order, SHALL default to `default`, and SHALL declare live application. `default` SHALL mean the active base theme's semantic `accent` rather than a fixed color value. The setting SHALL be stored in the profile-local A1 settings document and SHALL NOT be written to Pi settings storage or presented as an engine descriptor.

Introducing the setting SHALL advance the owned settings version with a forward migration that preserves existing and unknown values. A missing, malformed, or unsupported stored value SHALL resolve to `default` without blocking startup. The setting SHALL remain visible and editable when engine settings are absent or unavailable. `a1 pi` SHALL neither expose nor apply it.

#### Scenario: Present the Appearance section
- **WHEN** bare A1 opens the owned settings screen
- **THEN** one `Appearance` section after `Generic` SHALL contain `Accent color`
- **AND** the value menu SHALL offer `default`, `blue`, `cyan`, `green`, `orange`, and `pink` in order

#### Scenario: Resolve an older or invalid profile
- **WHEN** a profile predates `accentColor`, omits it, or stores a value outside the declared choices
- **THEN** migration and validation SHALL preserve every other existing and unknown value
- **AND** `accentColor` SHALL resolve to `default` without blocking startup

#### Scenario: Change the accent live
- **WHEN** the reader selects another accent color
- **THEN** the A1 profile SHALL persist that value
- **AND** the active bare-A1 interface SHALL repaint with the selected semantic accent before the change reports success
- **AND** no Pi settings document SHALL change

#### Scenario: Restore the active theme default
- **WHEN** the reader selects `default`
- **THEN** the active interface SHALL use the base Pi theme's current semantic `accent` exactly
- **AND** it SHALL NOT restore a copied historical purple, violet variable, or RGB value

#### Scenario: Use the comparison profile
- **WHEN** the reader starts or configures `a1 pi`
- **THEN** no A1 `Accent color` entry SHALL be presented
- **AND** Pi's configured theme and accent behavior SHALL remain unchanged
