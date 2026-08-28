## MODIFIED Requirements

### Requirement: Sole public command exposes self-update
A1 SHALL recognize `update` as a non-interactive subcommand through the sole public
`a1` executable. `a1 update` SHALL select the stable release. `a1 update --develop`
SHALL select the current development preview, and one optional value after
`--develop` SHALL select either a positive numbered preview or a full numbered
preview version.

`a1 update --models` and `a1 pi update --models` SHALL be equivalent model-catalog
refresh commands against the A1 profile and SHALL NOT self-update A1 or its pinned
Pi runtime. `--models` SHALL NOT combine with `--develop` or a preview value.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update`
- **THEN** A1 SHALL run the stable self-update workflow

#### Scenario: Update in Pi's spelling
- **WHEN** the user invokes the removed `a1 update self` form
- **THEN** A1 SHALL return successfully and silently without registry or update work

#### Scenario: Update installed packages
- **WHEN** the user invokes `a1 pi update --extensions`
- **THEN** A1 SHALL update the packages configured in the A1 profile and SHALL NOT self-update

#### Scenario: Update one package
- **WHEN** the user invokes `a1 pi update <source>` for a configured package source
- **THEN** A1 SHALL update that package alone and SHALL NOT self-update

#### Scenario: Refresh model catalogs
- **WHEN** the user invokes `a1 update --models`
- **THEN** A1 SHALL refresh the model catalogs of the A1 profile and SHALL NOT self-update

#### Scenario: Pinned Pi is targeted
- **WHEN** the user invokes `a1 update pi`
- **THEN** A1 SHALL fail before update work and explain that Pi is pinned to the certified A1 release

#### Scenario: Update current development A1
- **WHEN** the user invokes `a1 update --develop`
- **THEN** A1 SHALL run the development-channel self-update workflow

#### Scenario: Update one numbered development preview
- **WHEN** the user invokes `a1 update --develop 107`
- **THEN** A1 SHALL resolve the unique published preview ending in `-dev.107` and install it

#### Scenario: Update one exact development preview
- **WHEN** the user invokes `a1 update --develop 0.1.8-dev.107`
- **THEN** A1 SHALL validate and install that exact published preview

#### Scenario: Refresh models in top-level notation
- **WHEN** the user invokes `a1 update --models`
- **THEN** A1 SHALL refresh A1's model catalogs without self-update

#### Scenario: Refresh models in Pi-compatible notation
- **WHEN** the user invokes `a1 pi update --models`
- **THEN** A1 SHALL perform the same model refresh as `a1 update --models`

#### Scenario: Update selectors conflict
- **WHEN** `--develop`, its optional preview value, or `--models` are combined outside the declared grammar
- **THEN** A1 SHALL fail before registry, package, supervisor, or runtime work

## ADDED Requirements

### Requirement: Development preview selectors are strict
A value after `--develop` SHALL be either a positive decimal or an exact semantic
version matching `<major>.<minor>.<patch>-dev.<positive-decimal>`. A stable version,
zero, source hash, unknown flag, second value, or missing value for another option
SHALL fail before registry discovery or installation.

#### Scenario: Zero is selected
- **WHEN** the user runs `a1 update --develop 0`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Stable version is selected
- **WHEN** the user runs `a1 update --develop 0.1.8`
- **THEN** A1 SHALL fail without registry or installation work

#### Scenario: Extra selector is supplied
- **WHEN** the user runs `a1 update --develop 107 108`
- **THEN** A1 SHALL fail without registry or installation work
