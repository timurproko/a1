## MODIFIED Requirements

### Requirement: Interactive startup checks for a newer release on the applicable channel

When an interactive profile (`a1` or `a1 pi`) starts from a published build, A1 SHALL determine whether a newer release exists on the channel applicable to the selected update mode. In `Auto`, the applicable version SHALL be the immutable release executing the session. In `Notify`, the applicable version SHALL be the installed package that accepted the public launch command when current launch context provides that validated version; otherwise it SHALL fall back to the executing version. A version without a prerelease component SHALL select npm dist-tag `latest`, and an `X.Y.Z-dev.N` version SHALL select `next`. A version is newer only when both versions are valid semver and the candidate is greater than the applicable version. The check SHALL NOT delay the first usable frame and SHALL NOT run for noninteractive commands. Any lookup, parse, or cache failure SHALL be silent and SHALL NOT produce a diagnostic.

A1 SHALL query the registry at most once per 24 hours per user. It SHALL keep the last successful result, its channel, and its time in a user-level cache file under the A1 configuration directory, written atomically, and SHALL answer from a fresh cache for the same channel without network access. A missing, unreadable, malformed, stale, or other-channel cache SHALL cause a background query instead of an error.

Bare A1 SHALL apply its `Update` mode after discovery. `Auto` SHALL request a silent exact-target background update after the first usable frame and SHALL show no availability notice. `Notify` SHALL preserve the existing check-only behavior and update-available popup, including the channel-appropriate manual command and stable changelog link, and SHALL install nothing. `No` SHALL skip the check entirely so updates remain user-driven. `a1 pi`, which does not expose the A1 setting, SHALL use `Auto` when otherwise eligible.

Both `Auto` and `Notify` SHALL be skipped when `PI_OFFLINE` is truthy, when `A1_SKIP_VERSION_CHECK` is truthy, when `CI` is truthy, when standard output is not a terminal, or when the applicable version is a source-checkout version without a numeric development suffix.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build starts interactively in `Auto` mode and the `latest` dist-tag is `0.3.1`
- **THEN** A1 SHALL request a silent background update to exact stable release `0.3.1`
- **AND** SHALL NOT show `Update Available` or instruct the user to run `a1 update`

#### Scenario: A newer development release exists
- **WHEN** a `0.3.1-dev.640` build starts interactively in `Auto` mode and the `next` dist-tag is `0.3.1-dev.652`
- **THEN** A1 SHALL request a silent background update to exact development release `0.3.1-dev.652`
- **AND** it SHALL NOT inspect or install the `latest` stable release

#### Scenario: The applicable release is current or newer
- **WHEN** the applicable channel's dist-tag is equal to or lower than the applicable version, or either version is not valid semver
- **THEN** no automatic update or availability popup SHALL be produced

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a result for the applicable channel that is less than 24 hours old
- **THEN** A1 SHALL use it without querying the registry and SHALL apply the selected `Auto` or `Notify` behavior when that cached target is newer

#### Scenario: The registry cannot be reached
- **WHEN** the background query fails, times out, or returns malformed data
- **THEN** A1 SHALL start no update, show no notice or diagnostic, and leave any previous cache content unchanged

#### Scenario: The check is disabled
- **WHEN** any environment/profile opt-out holds or bare A1 selects `No`
- **THEN** A1 SHALL neither read the release cache, contact the registry, start an automatic-update worker, nor observe automatic-update state for this check

#### Scenario: Stable notify follows the invoking package
- **WHEN** a stable installed package starts in `Notify` mode but ordinary launch selection executes an approved development runtime
- **THEN** A1 SHALL inspect only `latest`, compare it with the stable invoking package version, and show `a1 update` only when a newer stable release exists
- **AND** SHALL NOT announce the `next` development preview or show `a1 update --develop`

#### Scenario: Development notify follows the invoking package
- **WHEN** a development installed package starts in `Notify` mode but ordinary launch selection executes an approved stable runtime
- **THEN** A1 SHALL inspect only `next`, compare it with the development invoking package version, and show `a1 update --develop` only when a newer development preview exists
- **AND** SHALL NOT announce the `latest` stable release

#### Scenario: Notify has no invocation metadata
- **WHEN** `Notify` starts through a supported path that supplies no invocation-version launch context
- **THEN** A1 SHALL use the executing published version as the channel and comparison baseline

#### Scenario: Auto is the default
- **WHEN** bare A1 has no persisted `updateCheck` choice
- **THEN** it SHALL resolve `Auto` and silently request installation when discovery resolves a newer release
