## MODIFIED Requirements

### Requirement: Pre-resource A1 presentation follows the global profile accent

Before the bare-A1 theme or project resources are available, A1-owned interactive startup and safety presentation SHALL use the validated invocation-only startup color when supplied, otherwise the saved Default color (`defaultAccentColor`) from the effective global A1 profile, or the blue declared default when no valid choice can be read. The invocation value SHALL be resolved and applied before the first visible owned startup or project-trust frame rather than repainting a saved-Default frame afterward. Its accent-colored title, selector cursor, selected-background family, and derived rule border SHALL use the same named semantic color family as the running bare-A1 UI. It SHALL NOT read project-local settings, project themes, extensions, or untrusted resources to choose a color, write the invocation color to settings, alter trust decision handling, or change the pinned `a1 pi` comparison presentation. Legacy saved `accentColor` SHALL NOT initialize this startup color. An unreadable, malformed, unsupported, or absent global settings document SHALL not block a trust prompt or suppress a valid invocation override. Unrelated installer/update progress SHALL remain unchanged.

#### Scenario: Trust a project with a saved accent
- **WHEN** the user launches bare A1 without an invocation override from an undecided project with an explicit valid global `defaultAccentColor`
- **THEN** the project-trust heading, chosen option, and rule border SHALL reflect that Default color family before project resources load
- **AND** an untrusted project-local color or legacy saved `accentColor` SHALL have no effect on those colors

#### Scenario: Trust a project without a valid accent
- **WHEN** no invocation override exists and no valid A1 global Default color can be read for the effective profile
- **THEN** the trust dialog SHALL use the blue default accent family and retain its normal decision, input, and restoration behavior

#### Scenario: Launch another profile or comparison mode
- **WHEN** different profiles have different saved defaults or `a1 pi` is started instead
- **THEN** each bare-A1 startup presentation without an invocation override SHALL reflect only its own selected profile
- **AND** the comparison route SHALL retain its existing pinned styling

#### Scenario: Override the first trust frame
- **WHEN** bare A1 starts with green as invocation color while its global saved Default is pink and project trust is undecided
- **THEN** the first visible trust frame SHALL already use green's semantic family without a prior pink frame
- **AND** trust choices, resource isolation, persistence, cancellation, raw mode, cursor restoration, and comparison behavior SHALL remain unchanged

#### Scenario: Override despite an unreadable profile
- **WHEN** a valid invocation color is supplied but global settings are absent, unreadable, malformed, or unsupported
- **THEN** pre-resource presentation SHALL use the invocation color without requiring project-resource reads or a settings write

#### Scenario: Reject invalid color before a startup frame
- **WHEN** the recognized invocation option is missing its value or names an invalid color
- **THEN** startup SHALL fail with focused nonzero grammar guidance before any interactive trust, startup, or editor frame is rendered
