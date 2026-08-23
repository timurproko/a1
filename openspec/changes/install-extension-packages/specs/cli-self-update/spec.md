## MODIFIED Requirements

### Requirement: Sole public command exposes self-update
A1 SHALL recognize `update` as a non-interactive subcommand through the sole public
`a1` executable. Bare `a1 update` SHALL mean A1 self-update from the stable release,
and `a1 update self` SHALL mean the same thing in pinned Pi's spelling.

`update` SHALL additionally carry the package targets pinned Pi gives it:
`--extensions` for every package installed in the A1 profile, a positional source
for one of them, and `--models` for the model catalogs of that profile. A package
target SHALL NOT run self-update, and self-update SHALL NOT update packages, so each
invocation does exactly one of the two.

`a1 update pi` SHALL be refused. A1 pins one Pi version and certifies each release
against it, so updating Pi from inside A1 would invalidate what was certified; the
refusal SHALL say so and name `a1 update` as the way to move A1 forward.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update`
- **THEN** A1 SHALL run the self-update workflow

#### Scenario: Update in Pi's spelling
- **WHEN** the user invokes `a1 update self`
- **THEN** A1 SHALL run the same self-update workflow as bare `a1 update`

#### Scenario: Update installed packages
- **WHEN** the user invokes `a1 update --extensions`
- **THEN** A1 SHALL update the packages configured in `<home>/.a1/agent` and SHALL NOT self-update

#### Scenario: Update one package
- **WHEN** the user invokes `a1 update <source>` for a configured package source
- **THEN** A1 SHALL update that package alone and SHALL NOT self-update

#### Scenario: Refresh model catalogs
- **WHEN** the user invokes `a1 update --models`
- **THEN** A1 SHALL refresh the model catalogs of the A1 profile and SHALL NOT self-update

#### Scenario: Pinned Pi is targeted
- **WHEN** the user invokes `a1 update pi`
- **THEN** A1 SHALL refuse, explain that its Pi version is pinned to the certified release, and point at `a1 update`
