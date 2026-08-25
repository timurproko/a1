## ADDED Requirements

### Requirement: A numbered development preview can be installed by name
What follows the colon on `update` SHALL select a development preview. `develop`
SHALL mean the development channel head, a positive decimal value SHALL mean the
preview whose prerelease development number equals that value, and a full published
preview version SHALL continue to mean that exact preview. A release version SHALL
remain invalid on the preview update path.

The named preview SHALL be resolved against versions the registry actually
published rather than constructed from the running base version. A number matching
nothing SHALL be refused and named in the refusal. Nothing SHALL be installed when
resolution fails.

#### Scenario: Development preview 107 is named
- **WHEN** the user runs `a1 update:107` and npm contains exactly one preview ending in `-dev.107`
- **THEN** A1 SHALL install that exact published preview, whatever base version it carries

#### Scenario: A full numbered preview version is named
- **WHEN** the user runs `a1 update:0.1.8-dev.107` and that preview exists
- **THEN** A1 SHALL install that exact version

#### Scenario: The number was not published
- **WHEN** the user runs `a1 update:107` and no published preview ends in `-dev.107`
- **THEN** A1 SHALL refuse, name `107`, and install nothing

#### Scenario: The newest development preview is wanted
- **WHEN** the user runs `a1 update:develop`
- **THEN** A1 SHALL install whatever numbered preview the internal npm development dist-tag currently names

### Requirement: Development update terminology is consistent
The public development-channel name SHALL be `develop`. CLI usage, validation
errors, update progress, completion context, version statistics, README examples,
and operations documentation SHALL use `develop` or `Develop` as grammatically
appropriate and SHALL NOT present the channel as `next` or `Next`.

`a1 update:next` SHALL no longer select a channel. It SHALL fail before registry,
supervisor, or installation work and direct the user to `a1 update:develop`.
Internally, the implementation MAY continue resolving and publishing the
conventional npm `next` dist-tag; that registry detail SHALL NOT leak into public
command or status wording.

#### Scenario: Development update starts
- **WHEN** the user runs `a1 update:develop`
- **THEN** progress SHALL begin with `a1 update: <running> → <target>`, without a channel label

#### Scenario: Versions are displayed
- **WHEN** the user runs `a1 version`
- **THEN** the preview channel SHALL be labeled `Develop`, not `Next`

#### Scenario: Removed next spelling is requested
- **WHEN** the user runs `a1 update:next`
- **THEN** A1 SHALL refuse before runtime or registry work and direct the user to `a1 update:develop`
