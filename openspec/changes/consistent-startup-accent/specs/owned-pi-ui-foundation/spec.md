## ADDED Requirements

### Requirement: Pre-resource A1 presentation follows the global profile accent

Before the bare-A1 theme or project resources are available, A1-owned interactive startup and safety presentation SHALL use the selected Accent color from the effective global A1 profile, or the blue declared default when no valid choice can be read. Its accent-colored title, selector cursor, and derived rule border SHALL use the same named semantic color family as the running bare-A1 UI. It SHALL NOT read project-local settings, project themes, extensions, or untrusted resources to choose a color, alter trust decision handling, or change the pinned `a1 pi` comparison presentation. An unreadable, malformed, unsupported, or absent global settings document SHALL not block a trust prompt.

#### Scenario: Trust a project with a saved accent
- **WHEN** the user launches bare A1 from an undecided project with an explicit global `accentColor`
- **THEN** the project-trust heading, chosen option, and rule border SHALL reflect that accent family before project resources load
- **AND** an untrusted project-local color SHALL have no effect on those colors

#### Scenario: Trust a project without a valid accent
- **WHEN** no valid A1 global accent can be read for the effective profile
- **THEN** the trust dialog SHALL use the blue default accent family and retain its normal decision, input, and restoration behavior

#### Scenario: Launch another profile or comparison mode
- **WHEN** different profiles have different saved accents or `a1 pi` is started instead
- **THEN** each bare-A1 startup presentation SHALL reflect only its own selected profile
- **AND** the comparison route SHALL retain its existing pinned styling
