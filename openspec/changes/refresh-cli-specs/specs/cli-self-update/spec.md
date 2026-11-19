## MODIFIED Requirements

### Requirement: Sole public command exposes self-update
A1 SHALL recognize `update` as a non-interactive subcommand through the sole public
`a1` executable. `a1 update` SHALL select the channel of the running release: the
stable release when the running version has no prerelease part, and the current
development preview when it is a `-dev.N` build. `a1 update --release` SHALL select
the stable release. `a1 update --develop` SHALL select the current development
preview, and one optional value after `--develop` SHALL select either a positive
numbered preview or a full numbered preview version.

`a1 update --models` and `a1 pi update --models` SHALL be equivalent model-catalog
refresh commands against the A1 profile and SHALL NOT self-update A1 or its pinned
Pi runtime. `--models` SHALL NOT combine with `--release`, `--develop`, or a preview value.
`a1 update self` SHALL NOT be an update form: it SHALL fail with status 2 and one
diagnostic that names bare `a1 update`.

#### Scenario: Update through a1
- **WHEN** the user invokes `a1 update` while a stable release runs
- **THEN** A1 SHALL run the stable self-update workflow

#### Scenario: Update a development build
- **WHEN** the user invokes `a1 update` while a `-dev.N` build runs
- **THEN** A1 SHALL run the development-channel self-update workflow and SHALL NOT install the stable release

#### Scenario: Move to the stable release explicitly
- **WHEN** the user invokes `a1 update --release`
- **THEN** A1 SHALL run the stable self-update workflow from either channel

#### Scenario: Update in Pi's spelling
- **WHEN** the user invokes `a1 update self`
- **THEN** A1 SHALL exit with status 2 after one stderr diagnostic naming bare `a1 update`, without registry or update work

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
- **THEN** A1 SHALL resolve the unique published preview that records pull request 107 or ends in `-dev.107` and install it

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
- **WHEN** `--release`, `--develop`, its optional preview value, or `--models` are combined outside the declared grammar
- **THEN** A1 SHALL fail with status 2 before registry, package, release, or runtime work

## REMOVED Requirements

### Requirement: Private runtime execution uses one supported launch contract
**Reason**: The code does not implement a single-contract cutover. The launch-context owner reads the superseded private keys as a per-field fallback and writes them for a retained release that declares no contract, so an installation stays launchable across the contract change.
**Migration**: Replaced by "Private launch context is negotiated per release".

### Requirement: The initial private-contract cutover protects user data
**Reason**: It specified a one-time manual cutover procedure and its handoff instructions. No such cutover is required by the code, which negotiates the contract instead.
**Migration**: The lasting rule that a recovery capsule is never translated is part of "Private launch context is negotiated per release".

### Requirement: Current-contract lifecycle behavior retains its safety guarantees
**Reason**: It was phrased around the cutover and its acceptance evidence, and its statement that superseded keys never satisfy a missing field contradicts the per-field fallback in the code.
**Migration**: Replaced by "Launch context is rebuilt and validated for every owned process".

## ADDED Requirements

### Requirement: Private launch context is negotiated per release
The private launch contract SHALL be `neutral-launch-v1`, declared by the package manifest field `privateLaunchContract` and recorded in each release manifest this build writes. A process started for a release whose manifest declares that contract SHALL receive the release root, release identity, content digest, dependency layers, launch profile, and warmup flag under the `LAUNCH_CONTEXT_*` keys. A process started for a retained release whose manifest declares no contract SHALL receive the same fields under the superseded `A1_RELEASE_ROOT`, `A1_RELEASE_ID`, `A1_RELEASE_DIGEST`, `A1_RELEASE_LAYERS`, `A1_LAUNCH_PROFILE`, and `A1_IMMUTABLE_WARMUP` keys. A reader SHALL take each field from its current key and SHALL fall back to the superseded key only for a field whose current key is absent, so a current value always wins.

A release manifest that declares a contract other than `neutral-launch-v1` SHALL be rejected. The installed package SHALL be materialized or repaired into a release only when its own manifest declares `neutral-launch-v1`. An update recovery capsule, and the prior release manifest it names, SHALL be accepted only when each declares `neutral-launch-v1`; neither SHALL be translated. A launch that cannot take the installed package SHALL start the approved retained active release when one exists, and SHALL fail only when none does.

#### Scenario: A current-contract release is started
- **WHEN** bootstrap or warmup starts a release whose manifest declares `neutral-launch-v1`
- **THEN** the child SHALL receive its launch context under the `LAUNCH_CONTEXT_*` keys only

#### Scenario: A retained release declares no contract
- **WHEN** bootstrap or warmup starts a retained release whose manifest has no contract declaration
- **THEN** the child SHALL receive the same fields under the superseded `A1_*` keys

#### Scenario: An older launcher starts this build
- **WHEN** a process of this build receives only the superseded keys from an older launcher
- **THEN** it SHALL read its launch context from them

#### Scenario: Both key sets are present
- **WHEN** a process receives a field under both its current key and its superseded key
- **THEN** the current key's value SHALL be used

#### Scenario: The installed package cannot be taken
- **WHEN** a launch cannot materialize the installed package while an approved active release is retained
- **THEN** the launch SHALL start that retained release and leave activation to a later launch

#### Scenario: A recovery capsule predates the contract
- **WHEN** update recovery reads a capsule or prior release manifest that does not declare `neutral-launch-v1`
- **THEN** recovery SHALL refuse it with an unsupported-contract error and SHALL NOT execute or translate it

### Requirement: Launch context is rebuilt and validated for every owned process
Outgoing launch context SHALL be rebuilt from the selected release and current launch intent: both the current and the superseded key sets SHALL be removed from the inherited environment before the selected key set is written, and every other environment value SHALL pass through unchanged. A reader SHALL reject a launch profile other than `a1` or `pi`, a warmup flag other than `1`, a content digest that is not 64 lowercase hexadecimal characters, an empty or NUL-bearing value, and, on Windows, differently cased spellings of one key that carry different values. An entry that requires a profile, a release, or warmup permission SHALL fail when a required field is absent after fallback, without substituting another release or a default path; an absent dependency-layer list SHALL mean an empty list. A failure SHALL name the logical field and reason and SHALL NOT print environment values.

#### Scenario: A launch inherits stale private values
- **WHEN** a launcher starts a selected release while inheriting launch context from another session
- **THEN** the child SHALL receive only context built from the selected release and current intent
- **AND** unrelated public and third-party settings SHALL remain unchanged

#### Scenario: Required context is absent
- **WHEN** a private entry that requires release context finds no release root, identity, or digest under either key set
- **THEN** it SHALL fail validation before using that context

#### Scenario: Windows keys conflict by case
- **WHEN** a Windows environment carries two case-variant spellings of one private key with different values
- **THEN** the reader SHALL fail with a diagnostic naming the logical field
