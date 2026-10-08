## ADDED Requirements

### Requirement: Accent customization targets semantic roles rather than current colors

A1 customization of a vendor-backed accent SHALL be expressed at the owned theme boundary in terms of an explicitly enumerated semantic family: the vendor's declared `accent`, `border`, `selectedBg`, `userMessageBg`, `mdHeading`, and `mdListBullet` roles. Components, including active dialog filters and keyboard-shortcut key spans, SHALL continue to request those roles rather than reading a user preference, naming a palette variable, embedding a literal color, or deciding whether a resolved color looks like the previous accent. Resting sticky prompts and jump-to-bottom controls SHALL continue to request the unprojected neutral `toolPendingBg`, switching to the projected `selectedBg` only while hovered. No role SHALL join the family merely because it shares a value in one theme version. The hotkeys renderer SHALL override inline-code painting locally with `mdHeading` rather than projecting the global Markdown-code role.

Every A1 palette choice, including the initial `purple` choice, SHALL provide only an owned appearance-aware primary accent; one palette-ID-independent transform SHALL derive the enumerated family from any concrete primary color while preserving all unrelated vendor theme roles. The projected `border` SHALL be a darker neighboring-hue variation that remains visibly distinct from the main accent, and `mdHeading` SHALL provide a brighter complementary variation shared by secondary titles, active dialog-filter values, keyboard-shortcut key spans, and Markdown list markers; filled scope/default state markers SHALL instead request neutral `text`. The projected `selectedBg` SHALL use roughly half the prior chroma and a value closer to the terminal background to emulate a half-opacity tint. Vendor synchronization SHALL verify the semantic token inventory and the owned rendering paths that can consume the family so an incompatible addition, removal, rename, or bypass fails before release.

#### Scenario: The vendor changes its accent implementation
- **WHEN** a vendor update changes the accent's value, variable name, or resource representation while retaining the semantic `accent` role
- **THEN** A1 palette preferences SHALL continue to replace the declared semantic family without value matching
- **AND** unrelated roles SHALL continue to follow the changed vendor theme

#### Scenario: Another role happens to share the accent color
- **WHEN** a syntax, Markdown role other than `mdHeading` or `mdListBullet`, status, background, or message role resolves to the same color as `accent`
- **THEN** selecting an A1 accent SHALL NOT recolor that role solely because the values match
- **AND** only an explicitly enumerated role MAY receive an accent replacement or derived same-hue variation

#### Scenario: A rendering path bypasses the owned theme boundary
- **WHEN** governed source or synchronization discovers a bare-A1 accent consumer that reads another theme singleton or embeds an accent value
- **THEN** validation SHALL fail and identify the bypass before the change can be released

#### Scenario: A retained package dialog renders its frame
- **WHEN** bare A1 opens a retained package dialog whose border factory reads Pi's shared theme slot
- **THEN** the slot SHALL expose only A1's projected `border` over the package base theme
- **AND** comparison mode SHALL restore the complete unmodified package base theme
