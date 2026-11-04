## MODIFIED Requirements

### Requirement: Fresh installation and self-update share one target grammar
The installer SHALL use the same release-target grammar as A1 self-update. Bare invocation SHALL select the stable `latest` channel. `--develop` without a value SHALL select the moving development `next` channel. `--develop <positive-preview-number>` SHALL select the unique published development version carrying that preview number, and `--develop <full-development-version>` SHALL select that exact published preview.

The published application version list SHALL remain authoritative for requested previews. An absent or ambiguous numeric preview, absent exact preview, stable version after `--develop`, zero or malformed preview, repeated selector, missing usable selector value, unsupported option, or extra argument SHALL fail before installation mutation. The installer SHALL NOT support `--version`, `--latest`, or `--next` as compatibility aliases. npm package suffixes on `@timurproko/a1-install` SHALL remain installer-acquisition selectors and SHALL NOT be interpreted as application-target syntax.

When an existing valid installation is found, bare invocation SHALL delegate through `a1 update --release`, `--develop` SHALL delegate through `a1 update --develop`, and an exact preview request SHALL delegate through `a1 update --develop <full-development-version>`. Documentation and help SHALL present only this aligned grammar through the preferred `npm x -y -- @timurproko/a1-install` invocation.

#### Scenario: A user selects stable installation
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install`
- **THEN** the installer SHALL resolve and install the application package's `latest` channel
- **AND** for an existing installation the form SHALL match `a1 update --release`

#### Scenario: A user selects the development head
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop`
- **THEN** the installer SHALL resolve and install the application package's `next` channel
- **AND** the form SHALL match `a1 update --develop`

#### Scenario: A user selects a numbered preview
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop 107`
- **THEN** the installer SHALL inspect published application versions and select the unique version ending in `-dev.107`
- **AND** it SHALL fail rather than guess when that number is absent or ambiguous

#### Scenario: A user selects an exact preview
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop 0.1.8-dev.107`
- **THEN** the installer SHALL select that version only when the registry lists it
- **AND** the form SHALL match `a1 update --develop 0.1.8-dev.107`

#### Scenario: A removed selector is supplied
- **WHEN** the user supplies `--version`, `--latest`, or `--next`
- **THEN** the installer SHALL reject the unsupported option before registry discovery or installation
- **AND** help and documentation SHALL NOT advertise a compatibility alias

## ADDED Requirements

### Requirement: Development requests run the development installer
When invoked with `--develop` from a non-development installer build and without the installer's handoff marker, the installer SHALL, before its runtime check or any other installation work, run `npm x -y -- @timurproko/a1-install@next` with the original arguments, inherited standard streams, and the handoff marker set, and SHALL exit with that child's status. A development installer build, or a process carrying the marker, SHALL NOT hand off again.

#### Scenario: A stable installer receives a development request
- **WHEN** the user runs `npm x -y -- @timurproko/a1-install --develop` and npm resolves the stable installer
- **THEN** the development installer SHALL perform the installation with the same arguments
- **AND** the user SHALL see one installer's output and exit status

#### Scenario: The handed-off installer starts
- **WHEN** the development installer starts with the handoff marker
- **THEN** it SHALL proceed with installation and SHALL NOT start another installer

### Requirement: An installation at or above the target is success
After resolution or delegated update, an installed application whose version is equal to or newer than the resolved target on the same channel SHALL be reported as installed with status zero. A delegated update whose activation was deferred for resident continuity SHALL also count as installed. Failures SHALL print one line holding the concise reason and one next step, followed by `Details: <log path>` when diagnostics were recorded, without requiring `--verbose`.

#### Scenario: The channel head is older than the installation
- **WHEN** the installed development build is newer than the current `next` head
- **THEN** the installer SHALL report success and SHALL NOT report a version mismatch

#### Scenario: Activation is deferred
- **WHEN** the delegated update exits zero with a prepared candidate waiting for continuity
- **THEN** the installer SHALL report success
