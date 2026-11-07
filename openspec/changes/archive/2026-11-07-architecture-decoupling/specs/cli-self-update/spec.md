## MODIFIED Requirements

### Requirement: Restart-readiness observation is independent of release discovery
Every interactive published A1 process SHALL compare its executing immutable release with the locally recorded approved active release on a bounded short cadence. This local comparison SHALL not require a registry request, a successful dist-tag lookup, ownership of the automatic-update worker, or evidence that the process launched the active release. When the active release is valid semver, belongs to the executing release's channel, and is newer, the process SHALL report restart readiness and stop polling after that result. Unreadable, malformed, unapproved, same-version, older, source-checkout, and cross-channel state SHALL not produce restart readiness.

The local comparison SHALL remain available when update discovery is `Manual`, when registry lookup fails, and when network-oriented version checks are disabled, because it reads only already-committed local release state and starts no update. Disposal SHALL cancel the local observer.

#### Scenario: Another process activates the update
- **WHEN** one process activates an approved same-channel release newer than several still-running A1 processes
- **THEN** every older process SHALL report restart readiness within the bounded local observation interval
- **AND** none SHALL need to have launched, discovered, or installed the active version itself

#### Scenario: Registry discovery fails
- **WHEN** an older process cannot fetch or parse its channel dist-tag but the local approved active release is newer on the same channel
- **THEN** it SHALL still report restart readiness from local state
- **AND** the failed discovery SHALL start no additional update

#### Scenario: Update discovery is disabled
- **WHEN** a published older process uses `Manual`, or a network version-check opt-out applies, while a newer same-channel approved release is already active locally
- **THEN** the process SHALL report restart readiness without reading the release cache or contacting the registry

#### Scenario: Local state does not prove staleness
- **WHEN** local release state is missing, unreadable, malformed, unapproved, equal, older, cross-channel, or compared with an unpublished executing version
- **THEN** A1 SHALL show no restart readiness and SHALL perform no mutation

### Requirement: Interactive startup checks for a newer release in Auto mode
When an interactive profile starts from a published build and the `Update` mode is not `Manual`, A1 SHALL discover whether a newer release exists on the executing release's channel, comparing valid semver only, after the first usable frame and never for noninteractive commands. `Auto` SHALL request a silent exact-target background update and show no availability notice; `Manual` SHALL skip the check entirely. Lookup, parse, or cache failure SHALL produce no UI diagnostic.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build runs interactively in `Auto` mode and the `latest` dist-tag advances to `0.3.1`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1` within the next eligible discovery interval, even if that session was already open
- **AND** SHALL NOT inspect or install the development `next` release or show an availability popup

#### Scenario: A newer development release exists
- **WHEN** a numbered `0.3.1-dev.640` build runs interactively in `Auto` mode and the `next` dist-tag advances to `0.3.1-dev.652`
- **THEN** A1 SHALL discover and request a silent exact-target background update to `0.3.1-dev.652` within the next eligible discovery interval, even if a prior check cached `640`
- **AND** SHALL NOT inspect or install the stable `latest` release

#### Scenario: The running release is current or newer
- **WHEN** the applicable channel's dist-tag is equal to or lower than the executing version, or either version is not valid semver
- **THEN** no automatic update SHALL be produced

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a successful result for the applicable channel within the fifteen-minute window
- **THEN** A1 SHALL reuse it without querying the registry and SHALL request installation only if that result is newer

#### Scenario: A publication follows a cached result
- **WHEN** a new version appears after an Auto-mode check cached the old head and the session remains open or restarts
- **THEN** the next eligible check after at most fifteen minutes SHALL fetch the new tag and request its installation without a manual update command

#### Scenario: The registry cannot be reached
- **WHEN** a background query fails, times out, or returns malformed data
- **THEN** A1 SHALL start no update, show no notice, retain any previous cache content, and retry on a later bounded check rather than treating the failed lookup as a successful fresh result

#### Scenario: The check is disabled
- **WHEN** any environment opt-out holds or bare A1 selects `Manual`
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic-update worker, nor observe automatic-update state for this check

#### Scenario: Auto is the default
- **WHEN** bare A1 has no persisted `updateCheck` choice
- **THEN** it SHALL resolve `Auto` and silently request installation when discovery resolves a newer release

#### Scenario: The channel follows the executing version
- **WHEN** the executing version has no prerelease component
- **THEN** discovery SHALL read npm dist-tag `latest`
- **AND** an `X.Y.Z-dev.N` version SHALL read `next` and SHALL never inspect the other channel

#### Scenario: Channel results are cached per channel
- **WHEN** a check succeeds for the executing release's channel
- **THEN** A1 SHALL store it in a bounded atomic per-channel cache under its configuration directory and reuse it for at most fifteen minutes
- **AND** a missing, malformed, expired, or other-channel entry SHALL cause a bounded background query, with stale refreshes bounded across sessions

#### Scenario: An environment opt-out applies
- **WHEN** `PI_OFFLINE`, `A1_SKIP_VERSION_CHECK`, or `CI` is truthy, standard output is not a terminal, or the executing version is an unnumbered source checkout
- **THEN** no check SHALL run

#### Scenario: The session is disposed
- **WHEN** the interactive session ends while a check is pending
- **THEN** later checks SHALL be cancelled without cancelling a detached worker that is already installing

#### Scenario: The comparison profile runs
- **WHEN** prerelease `a1 pi` starts eligible for discovery
- **THEN** it SHALL behave as `Auto` because it exposes no A1 `Update` setting
