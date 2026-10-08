## ADDED Requirements

### Requirement: Accent customization targets semantic roles rather than current colors

A1 customization of a vendor-backed accent SHALL be expressed at the owned theme boundary in terms of an explicitly enumerated semantic family: the vendor's declared `accent`, `border`, `selectedBg`, and `userMessageBg` roles. Components SHALL continue to request those roles rather than reading a user preference, naming a palette variable, embedding a literal color, or deciding whether a resolved color looks like the previous accent. The resting jump-to-bottom control MAY choose the projected user-message surface when a named accent is active. No role SHALL join the family merely because it shares a value in one theme version.

The default preference SHALL delegate every role to the current vendor theme value. Named A1 choices MAY provide owned appearance-aware color values for the enumerated family, but SHALL preserve all unrelated vendor theme roles. Vendor synchronization SHALL verify the semantic token inventory and the owned rendering paths that can consume the family so an incompatible addition, removal, rename, or bypass fails before release.

#### Scenario: The vendor changes its accent implementation
- **WHEN** a vendor update changes the accent's value, variable name, or resource representation while retaining the semantic `accent` role
- **THEN** the default A1 preference SHALL follow the new value without an implementation edit
- **AND** named A1 preferences SHALL continue to replace the declared semantic family without value matching

#### Scenario: Another role happens to share the accent color
- **WHEN** a syntax, Markdown, status, background, or message role resolves to the same color as `accent`
- **THEN** selecting an A1 accent SHALL NOT recolor that role solely because the values match
- **AND** only an explicitly enumerated role MAY receive a derived same-hue variation

#### Scenario: A rendering path bypasses the owned theme boundary
- **WHEN** governed source or synchronization discovers a bare-A1 accent consumer that reads another theme singleton or embeds an accent value
- **THEN** validation SHALL fail and identify the bypass before the change can be released
