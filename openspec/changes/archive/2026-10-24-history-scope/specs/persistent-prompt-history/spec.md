## MODIFIED Requirements

### Requirement: Prompt history lives in profile-isolated application data
Bare A1 SHALL keep durable prompt history at `<history-root>/history/<profile-id>.sqlite3` in Shared mode and at a distinct, session-specific database in the same history directory in Unique mode, separately from control metadata and agent resources. Without an explicit `A1_DATA_DIR`, the history root SHALL be `<effective-home>/.a1/data` on Windows, Linux, and macOS. The effective home SHALL follow the existing A1 launch-profile home policy, including `A1_PROFILE_HOME`. An explicit `A1_DATA_DIR` SHALL select the history root instead, retaining its existing path-resolution behavior. This history-only default change SHALL NOT relocate other product data, settings, agent resources, releases, runtime files, logs, or caches.

Profile identity SHALL be stable for the same normalized effective A1 profile root across launches and releases, independent of cwd, session identity, and the history storage root. The existing profile identity algorithm, Shared database and sidecar paths, and database schema SHALL remain compatible. Different effective profile roots SHALL have different history identities. In Unique mode, a separate, stable, filesystem-safe identity SHALL be derived from that profile and the agent's durable session ID, with separate image sidecars. Different session IDs SHALL NOT share durable entries, while a resumed session SHALL reuse its own database and sidecars. An unavailable or invalid session ID SHALL NOT fall back to Shared storage.

Default history access SHALL NOT probe, read, migrate, copy, merge, modify, delete, or fall back to the former platform history locations. If the selected new location has no database, A1 SHALL initialize an empty durable store through its ordinary enabled-history startup. Existing local recall and loaded-conversation fallback SHALL remain unchanged and SHALL NOT import old durable history. Disabled persistence and the Pi comparison SHALL NOT initialize A1 history storage or access either default history location.

#### Scenario: Use the default Windows location
- **WHEN** an enabled bare-A1 instance first needs history with effective home `C:/Users/Example` and no data-directory override
- **THEN** its selected database and any journal sidecars SHALL live under `C:/Users/Example/.a1/data/history`
- **AND** no history database SHALL be created under `%LOCALAPPDATA%/a1/history`, `~/.a1/agent`, `~/.a1/cache`, the repository, or the release payload
- **AND** prompt content SHALL NOT be written into `control.sqlite3`

#### Scenario: Override the application-data root
- **WHEN** A1 starts with `A1_DATA_DIR` set to an isolated directory
- **THEN** all selected history database and sidecar access SHALL use that directory's `history` child
- **AND** it SHALL NOT read, copy, or mutate history at the default root
- **AND** the override SHALL take precedence over `A1_PROFILE_HOME` for history storage without changing profile identity

#### Scenario: Reuse a profile across projects and launches
- **WHEN** two bare-A1 processes use Shared mode with the same effective profile and history root from different projects or release checkouts
- **THEN** they SHALL address the same existing durable history without grouping recall by project or prioritizing the current session over committed recency

#### Scenario: Keep overridden profiles separate
- **WHEN** two different effective A1 profile roots share one history root
- **THEN** each SHALL read and modify only its own history in either mode
- **AND** matching prompt text or session labels SHALL NOT merge the profiles

#### Scenario: Use the default Linux or macOS location
- **WHEN** an enabled bare-A1 instance starts on Linux or macOS with effective home `H` and no data-directory override
- **THEN** its selected database and sidecars SHALL live under `H/.a1/data/history`
- **AND** setting `XDG_DATA_HOME` SHALL NOT relocate default prompt history
- **AND** the existing platform locations for all other product data SHALL remain unchanged

#### Scenario: Respect the effective profile home
- **WHEN** A1 uses `A1_PROFILE_HOME=H` without an explicit data-directory override
- **THEN** its default history root SHALL be `H/.a1/data`
- **AND** it SHALL NOT use the operating-system home or the parent of a separately overridden agent-profile directory as an alternative default history root

#### Scenario: Old default history exists on first launch after the change
- **WHEN** no data-directory override is set, the selected profile database is absent, and history exists at the former platform default
- **THEN** A1 SHALL begin with an empty durable history at the selected location
- **AND** it SHALL NOT access or alter the old database or its sidecars
- **AND** subsequent launches SHALL NOT perform automatic old-location cleanup or import

#### Scenario: The selected history root is unavailable
- **WHEN** the selected root cannot be opened or written
- **THEN** A1 SHALL record a bounded, sanitized developer-only persistence failure without normal UI or terminal output and retain current-session functionality
- **AND** it SHALL NOT fall back to the former platform root or another directory

#### Scenario: Persistence is disabled or the comparison is launched
- **WHEN** bare A1 starts with persistence disabled or the user launches the Pi comparison
- **THEN** it SHALL NOT initialize, probe, or clean up A1's home or former default history stores
- **AND** its existing current-session history behavior SHALL remain unchanged

## ADDED Requirements

### Requirement: Durable history can be isolated by agent session
Unique mode SHALL keep separate durable prompt history and image sidecars for each stable agent session within a profile, whether the agents run in distinct `a1 solo` processes or concurrent resident tabs. Shared mode SHALL continue to use the existing profile-wide database and sidecars for all agent sessions in that profile. Switching scope SHALL NOT transfer, import, merge, delete, or silently read records from the other scope. Both modes SHALL preserve the existing per-store limits, failure behavior, and transcript-based/session-local recall.

#### Scenario: Two solo agents run concurrently with Unique history
- **WHEN** two new `a1 solo` sessions share a profile and history root with Unique selected
- **THEN** each SHALL recall only its own committed durable prompts, plus its own existing local and transcript fallback
- **AND** neither SHALL modify the other's database or image sidecars

#### Scenario: Resident tabs have distinct durable histories
- **WHEN** two new resident Agent tabs run under the same profile with Unique selected
- **THEN** each SHALL read and write a different durable history while sharing the same global scope setting

#### Scenario: Resume or fork an agent session
- **WHEN** the same agent session ID is resumed after a process restart in Unique mode
- **THEN** its prior committed prompts and image sidecars SHALL be available again
- **AND** a new session or fork with another ID SHALL NOT inherit that durable store

#### Scenario: Preserve the existing shared store
- **WHEN** Shared is selected on a profile with an existing profile-wide history database
- **THEN** concurrent sessions SHALL see the same committed prompts using the same existing database and image-sidecar locations
- **AND** no data migration or schema rewrite SHALL be required

#### Scenario: Propagate a new shared prompt
- **WHEN** two agents with distinct Unique stores switch to Shared and the first submits a new prompt after observing the change
- **THEN** that prompt SHALL be written to the existing profile-wide database and appear in the second agent's next shared-history refresh
- **AND** the old Unique prompts SHALL remain only in their respective per-session databases

#### Scenario: Keep submitted work in its original scope
- **WHEN** a submission was captured for a store before its agent observed a scope change
- **THEN** the pending write SHALL finish in its original store, not the newly selected one
- **AND** subsequent submissions SHALL be recorded only in the new store

#### Scenario: Change scope in either direction
- **WHEN** the saved scope changes between Unique and Shared
- **THEN** new and running agents SHALL use only the newly selected store after observing the change
- **AND** the other scope's data SHALL remain intact without appearing in the newly selected store
- **AND** unsent drafts SHALL remain intact while each agent's visible recall switches to the selected store
