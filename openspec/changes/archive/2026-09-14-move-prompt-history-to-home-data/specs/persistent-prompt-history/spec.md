## MODIFIED Requirements

### Requirement: Prompt history lives in profile-isolated application data
Bare A1 SHALL keep durable prompt history at `<history-root>/history/<profile-id>.sqlite3`, separately from control metadata and agent resources. Without an explicit `A1_DATA_DIR`, the history root SHALL be `<effective-home>/.a1/data` on Windows, Linux, and macOS. The effective home SHALL follow the existing A1 launch-profile home policy, including `A1_PROFILE_HOME`. An explicit `A1_DATA_DIR` SHALL select the history root instead, retaining its existing path-resolution behavior. This history-only default change SHALL NOT relocate other product data, settings, agent resources, releases, runtime files, logs, or caches.

Profile identity SHALL be stable for the same normalized effective A1 profile root across launches and releases, independent of cwd, session identity, and the history storage root. The existing profile identity algorithm and database schema SHALL remain compatible. Different effective profile roots SHALL have different history identities.

Default history access SHALL NOT probe, read, migrate, copy, merge, modify, delete, or fall back to the former platform history locations. If the selected new location has no database, A1 SHALL initialize an empty durable store through its ordinary enabled-history startup. Existing local recall and loaded-conversation fallback SHALL remain unchanged and SHALL NOT import old durable history. Disabled persistence and the Pi comparison SHALL NOT initialize A1 history storage or access either default history location.

#### Scenario: Use the default Windows location
- **WHEN** an enabled bare-A1 instance first needs history with effective home `C:/Users/Example` and no data-directory override
- **THEN** its database and any journal sidecars SHALL live under `C:/Users/Example/.a1/data/history`
- **AND** no history database SHALL be created under `%LOCALAPPDATA%/a1/history`, `~/.a1/agent`, `~/.a1/cache`, the repository, or the release payload
- **AND** prompt content SHALL NOT be written into `control.sqlite3`

#### Scenario: Use the default Linux or macOS location
- **WHEN** an enabled bare-A1 instance starts on Linux or macOS with effective home `H` and no data-directory override
- **THEN** its database and sidecars SHALL live under `H/.a1/data/history`
- **AND** setting `XDG_DATA_HOME` SHALL NOT relocate default prompt history
- **AND** the existing platform locations for all other product data SHALL remain unchanged

#### Scenario: Respect the effective profile home
- **WHEN** A1 uses `A1_PROFILE_HOME=H` without an explicit data-directory override
- **THEN** its default history root SHALL be `H/.a1/data`
- **AND** it SHALL NOT use the operating-system home or the parent of a separately overridden agent-profile directory as an alternative default history root

#### Scenario: Override the application-data root
- **WHEN** A1 starts with `A1_DATA_DIR` set to an isolated directory
- **THEN** all history database and sidecar access SHALL use that directory's `history` child
- **AND** it SHALL NOT read, copy, or mutate history at the default root
- **AND** the override SHALL take precedence over `A1_PROFILE_HOME` for history storage without changing profile identity

#### Scenario: Reuse a profile across projects and launches
- **WHEN** two bare-A1 processes use the same effective profile and history root from different projects or release checkouts
- **THEN** they SHALL address the same durable history without grouping recall by project or prioritizing the current session over committed recency

#### Scenario: Keep overridden profiles separate
- **WHEN** two different effective A1 profile roots share one history root
- **THEN** each SHALL read and modify only its own history
- **AND** matching prompt text or session labels SHALL NOT merge the profiles

#### Scenario: Old default history exists on first launch after the change
- **WHEN** no data-directory override is set, the new profile database is absent, and history exists at the former platform default
- **THEN** A1 SHALL begin with an empty durable history at the new location
- **AND** it SHALL NOT access or alter the old database or its sidecars
- **AND** subsequent launches SHALL NOT perform automatic old-location cleanup or import

#### Scenario: The selected history root is unavailable
- **WHEN** the new default root cannot be opened or written
- **THEN** A1 SHALL report a bounded, sanitized persistence failure and retain current-session functionality
- **AND** it SHALL NOT fall back to the former platform root or another directory

#### Scenario: Persistence is disabled or the comparison is launched
- **WHEN** bare A1 starts with persistence disabled or the user launches the Pi comparison
- **THEN** it SHALL NOT initialize, probe, or clean up A1's home or former default history stores
- **AND** its existing current-session history behavior SHALL remain unchanged

### Requirement: History is private durable state rather than disposable cache
A1 SHALL protect history files and sidecars with owner-restrictive access where supported and SHALL never include their contents in logs, crash records, or validation evidence. These protections SHALL apply at the home-based default as well as explicitly overridden roots. Documentation SHALL identify history as unencrypted potentially sensitive user text, state its default and override locations, explain retention and next-start opt-out, and describe removal only after all instances using that profile have stopped. Documentation SHALL explain that the default-location change starts fresh without importing or deleting the old history.

Disabling persistence SHALL leave existing records intact. Upgrades, ordinary npm uninstall/reinstall, release rollback, cache cleanup, and conversation deletion SHALL NOT implicitly clear history. A1 SHALL NOT add automatic old-location deletion as part of the default-location change. No legacy import SHALL occur without a separately declared explicit operation.

#### Scenario: Clean caches or upgrade A1
- **WHEN** cache/dependency/release cleanup, an upgrade, or release rollback runs
- **THEN** the history directory SHALL remain outside those cleanup targets

#### Scenario: Uninstall and reinstall the package
- **WHEN** the user performs an ordinary npm uninstall and reinstall without explicitly deleting user data
- **THEN** existing history files and sidecars SHALL remain untouched
- **AND** a compatible version using the same profile and history root SHALL recall the retained prompts

#### Scenario: Inspect diagnostics after a storage failure
- **WHEN** a storage operation fails on a prompt containing sensitive text
- **THEN** logs and visible failure diagnostics SHALL contain only bounded classified failure information, not prompt text, SQL values, arbitrary exception payloads, or private provenance

#### Scenario: Existing prototype history is present
- **WHEN** A1 starts on a machine containing v2, Pi, or Claude history
- **THEN** it SHALL neither read nor import nor modify those histories automatically
