## ADDED Requirements

### Requirement: Prompt history is stored per profile under one history root
Bare A1 SHALL keep durable prompt history at `<history-root>/history/<profile-id>.sqlite3` in Shared mode and at a distinct, session-specific database in the same history directory in Unique mode, separately from control metadata and agent resources. Without an explicit `A1_DATA_DIR`, the history root SHALL be `<effective-home>/.a1/data` on Windows, Linux, and macOS. The effective home SHALL follow the existing A1 launch-profile home policy, including `A1_PROFILE_HOME`. An explicit `A1_DATA_DIR` SHALL select the history root instead, retaining its existing path-resolution behavior. The history root SHALL NOT determine the location of settings, agent resources, or releases.

Profile identity SHALL be stable for the same normalized effective A1 profile root across launches and releases, independent of cwd, session identity, and the history storage root. Different effective profile roots SHALL have different history identities. In Unique mode, a separate, stable, filesystem-safe identity SHALL be derived from that profile and the agent's durable session ID, with separate image sidecars. Different session IDs SHALL NOT share durable entries, while a resumed session SHALL reuse its own database and sidecars. An unavailable or invalid session ID SHALL NOT fall back to Shared storage.

History access SHALL NOT probe, read, migrate, copy, merge, modify, delete, or fall back to any other location, including the platform application-data directories. If the selected location has no database, A1 SHALL initialize an empty durable store through its ordinary enabled-history startup. Local recall and loaded-conversation fallback SHALL NOT import durable history from elsewhere. Disabled persistence and the Pi comparison SHALL NOT initialize A1 history storage.

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
- **THEN** they SHALL address the same durable history without grouping recall by project or prioritizing the current session over committed recency

#### Scenario: Keep overridden profiles separate
- **WHEN** two different effective A1 profile roots share one history root
- **THEN** each SHALL read and modify only its own history in either mode
- **AND** matching prompt text or session labels SHALL NOT merge the profiles

#### Scenario: Use the default Linux or macOS location
- **WHEN** an enabled bare-A1 instance starts on Linux or macOS with effective home `H` and no data-directory override
- **THEN** its selected database and sidecars SHALL live under `H/.a1/data/history`
- **AND** setting `XDG_DATA_HOME` SHALL NOT relocate default prompt history

#### Scenario: Respect the effective profile home
- **WHEN** A1 uses `A1_PROFILE_HOME=H` without an explicit data-directory override
- **THEN** its default history root SHALL be `H/.a1/data`
- **AND** it SHALL NOT use the operating-system home or the parent of a separately overridden agent-profile directory as an alternative default history root

#### Scenario: A history database exists in a platform application-data directory
- **WHEN** no data-directory override is set, the selected profile database is absent, and a history database exists under a platform application-data directory such as `%LOCALAPPDATA%/a1/history`
- **THEN** A1 SHALL begin with an empty durable history at the selected location
- **AND** it SHALL NOT access, import, clean up, or alter that other database or its sidecars

#### Scenario: The selected history root is unavailable
- **WHEN** the selected root cannot be opened or written
- **THEN** A1 SHALL record a bounded, sanitized developer-only persistence failure without normal UI or terminal output and retain current-session functionality
- **AND** it SHALL NOT fall back to another directory

#### Scenario: Persistence is disabled or the comparison is launched
- **WHEN** bare A1 starts with persistence disabled or the user launches the Pi comparison
- **THEN** it SHALL NOT initialize, probe, or clean up A1 history stores
- **AND** recall SHALL be limited to current-session history

### Requirement: History navigation places the caret by direction and restores the draft
With persistent history enabled, bare A1's default editor SHALL offer a bounded, deduplicated recall list incorporating current-process input, saved history, and existing loaded-conversation fallback without persisting fallback reads. At history-navigation boundaries, Up toward older entries SHALL place the caret at the end of the recalled prompt; Down toward newer entries SHALL place it at the beginning. Leaving browsing SHALL restore the pre-navigation draft. Pinned multiline movement outside those boundaries, autocomplete priority, keybindings, selection, undo, and unrelated editor behavior SHALL remain intact.

#### Scenario: Recall older multiline text
- **WHEN** Up crosses the history boundary into an older multiline prompt
- **THEN** that prompt SHALL replace the editor value and the caret SHALL land after the last character on its last line

#### Scenario: Recall newer text or leave history
- **WHEN** Down crosses the history boundary into a newer prompt
- **THEN** the caret SHALL land at the beginning of its first line
- **WHEN** Down leaves history past the newest entry
- **THEN** normal draft restoration SHALL recover the pre-navigation draft rather than losing it to a refresh

#### Scenario: Reach the end of history
- **WHEN** navigation cannot move beyond the oldest entry
- **THEN** neither selection nor caret position SHALL change and no unavailable-action message SHALL appear

#### Scenario: Browse without adding an undo step for every recalled entry
- **WHEN** the user enters history and steps through several prompts
- **THEN** entering history SHALL record a single draft undo boundary
- **AND** intermediate navigation SHALL NOT create the additional undo snapshots of ordinary programmatic text replacement
- **AND** subsequent editing and undo SHALL retain the pinned editor's grouping behavior

#### Scenario: Restore a draft with live pasted content
- **WHEN** the pre-navigation draft contains live paste markers and a nonterminal cursor position, and the user browses away and returns
- **THEN** its text, cursor, and live paste backing SHALL be restored intact
- **AND** history navigation SHALL NOT clear its paste store or re-normalize its contents as an ordinary set-text operation would

#### Scenario: Type or submit recalled input
- **WHEN** a prompt is recalled
- **THEN** it SHALL become editable real input, not a ghost suggestion
- **AND** it SHALL NOT execute until the user explicitly submits it

## MODIFIED Requirements

### Requirement: History position is shown in the existing editor border
During history browsing, bare A1 SHALL show the numeric label `position/total`, without a `History` word, inset after the leading cells of the existing top editor border and styled by the editor's history-label style, without adding dock rows. The newest entry SHALL be numbered `total/total` and the oldest `1/total`. The indicator SHALL be absent outside browsing, retain the applicable hidden-line overflow information, and fit the available terminal width.

#### Scenario: Browse three prompts
- **WHEN** the user recalls the newest of three entries
- **THEN** the border SHALL show `3/3`
- **WHEN** the user reaches the oldest
- **THEN** it SHALL show `1/3`
- **WHEN** the draft is restored
- **THEN** the ordinary editor border SHALL return

#### Scenario: Render a narrow or scrolled editor
- **WHEN** the editor is narrow, uses the A1 prompt prefix, or has hidden lines above the visible text
- **THEN** history presentation SHALL retain the existing border geometry and applicable overflow information without exceeding width or changing cursor layout

### Requirement: History is private durable state rather than disposable cache
A1 SHALL protect history files and sidecars with owner-restrictive access where supported and SHALL never include their contents in logs, crash records, or validation evidence. These protections SHALL apply at the home-based default as well as explicitly overridden roots. Documentation SHALL identify history as unencrypted potentially sensitive user text, state its default and override locations, explain retention and next-start opt-out, and describe removal only after all instances using that profile have stopped.

Disabling persistence SHALL leave existing records intact. Upgrades, ordinary npm uninstall/reinstall, release rollback, cache cleanup, and conversation deletion SHALL NOT implicitly clear history. A1 SHALL NOT import history from another location or another product.

#### Scenario: Clean caches or upgrade A1
- **WHEN** cache/dependency/release cleanup, an upgrade, or release rollback runs
- **THEN** the history directory SHALL remain outside those cleanup targets

#### Scenario: Inspect diagnostics after a storage failure
- **WHEN** a storage operation fails on a prompt containing sensitive text
- **THEN** bounded developer-only diagnostics SHALL contain only bounded classified failure information, not prompt text, SQL values, arbitrary exception payloads, or private provenance; background-history failures SHALL NOT appear in normal UI or terminal output

#### Scenario: Existing prototype history is present
- **WHEN** A1 starts on a machine containing prompt history written by another product, such as Pi or Claude
- **THEN** it SHALL neither read nor import nor modify those histories automatically

#### Scenario: Uninstall and reinstall the package
- **WHEN** the user performs an ordinary npm uninstall and reinstall without explicitly deleting user data
- **THEN** existing history files and sidecars SHALL remain untouched
- **AND** a compatible version using the same profile and history root SHALL recall the retained prompts

## REMOVED Requirements

### Requirement: Prompt history lives in profile-isolated application data
**Reason**: The text and one scenario narrated a finished relocation of the default history directory ("former platform locations", "after the change").
**Migration**: Covered by "Prompt history is stored per profile under one history root", which states the current location rules.

### Requirement: Bare A1 preserves v2 history navigation
**Reason**: The name and text referred to an earlier prototype generation instead of stating the behaviour.
**Migration**: Covered by "History navigation places the caret by direction and restores the draft".

### Requirement: History resilience is verified independently of diagnostic visibility
**Reason**: Acceptance-evidence requirement with no product behaviour of its own.
**Migration**: None; the recovery behaviour is stated by "Transient history failures recover automatically within bounded resources", and acceptance is owned by the shared delivery workflow.
