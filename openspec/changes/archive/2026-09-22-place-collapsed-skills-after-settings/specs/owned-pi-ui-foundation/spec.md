## ADDED Requirements

### Requirement: The collapsed skills command keeps a primary built-in position

While bare A1 presents skills in collapsed form, the synthetic `skills` command SHALL appear exactly once in the top-level slash-command catalog immediately after `settings`. All other built-in commands SHALL retain their declared relative order, including `quit` as the final built-in command, and all remaining prompt-template, extension, and other resource commands SHALL retain their existing relative order after the built-in catalog.

This ordering SHALL apply only to the synthetic collapsed command. Expanded `skill:<name>` entries SHALL retain their engine-provided placement, a catalog with no synthetic collapsed command SHALL remain unchanged, and the `a1 pi` comparison profile SHALL retain the pinned catalog.

#### Scenario: Open the collapsed command menu
- **WHEN** bare A1 has discovered skills, skill commands are enabled, `skillsPresentation` is `collapse`, and the user opens the top-level slash-command menu
- **THEN** `skills` SHALL appear exactly once immediately after `settings`
- **AND** the remaining built-ins SHALL follow in their existing relative order through `quit`
- **AND** ordinary resource commands SHALL retain their existing relative order after `quit`

#### Scenario: Open the expanded command menu
- **WHEN** bare A1 uses `skillsPresentation` value `expand`
- **THEN** no synthetic `skills` command SHALL be inserted after `settings`
- **AND** discovered `skill:<name>` entries SHALL retain their existing engine-provided placement

#### Scenario: Compare the pinned profile
- **WHEN** the command menu is opened through the `a1 pi` comparison profile
- **THEN** the pinned command catalog SHALL remain unchanged and no synthetic `skills` command SHALL be inserted
