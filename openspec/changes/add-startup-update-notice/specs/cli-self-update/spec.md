## ADDED Requirements

### Requirement: Interactive startup checks for a newer release on the running channel

When an interactive profile (`a1` or `a1 pi`) starts from a published build, A1 SHALL determine whether a newer release exists on the running version's channel: npm dist-tag `latest` for a version without a prerelease component and `next` for an `X.Y.Z-dev.N` version. A version is newer only when both versions are valid semver and the candidate is greater. The check SHALL NOT delay the first usable frame, SHALL NOT install anything, and SHALL NOT run for noninteractive commands. Any lookup, parse, or cache failure SHALL be silent and SHALL NOT produce a diagnostic.

A1 SHALL query the registry at most once per 24 hours per user. It SHALL keep the last successful result, its channel, and its time in a user-level cache file under the A1 configuration directory, written atomically, and SHALL answer from a fresh cache for the same channel without network access. A missing, unreadable, malformed, stale, or other-channel cache SHALL cause a background query instead of an error.

The check SHALL be skipped when `PI_OFFLINE` is truthy or `--offline` was passed, when `A1_SKIP_VERSION_CHECK` is truthy, when `CI` is truthy, when standard output is not a terminal, when the running version is a source-checkout version without a numeric development suffix, or, for bare `a1`, when the `updateCheck` setting is `false`.

#### Scenario: A newer stable release exists
- **WHEN** a stable `0.3.0` build starts interactively and the `latest` dist-tag is `0.3.1`
- **THEN** A1 SHALL report `0.3.1` as available with the command `a1 update`

#### Scenario: A newer development release exists
- **WHEN** a `0.3.1-dev.640` build starts interactively and the `next` dist-tag is `0.3.1-dev.652`
- **THEN** A1 SHALL report `0.3.1-dev.652` as available with the command `a1 update --develop`
- **AND** it SHALL NOT report the `latest` stable release

#### Scenario: The running release is current or newer
- **WHEN** the channel's dist-tag is equal to or lower than the running version, or either version is not valid semver
- **THEN** no update SHALL be reported

#### Scenario: A fresh cache exists
- **WHEN** the cache holds a result for the running channel that is less than 24 hours old
- **THEN** A1 SHALL use it without querying the registry

#### Scenario: The registry cannot be reached
- **WHEN** the background query fails, times out, or returns malformed data
- **THEN** A1 SHALL show no notice and no diagnostic, and SHALL leave any previous cache content unchanged

#### Scenario: The check is disabled
- **WHEN** any opt-out condition holds
- **THEN** A1 SHALL neither read the cache nor contact the registry for this check

### Requirement: Channel-head update never downgrades

When `a1 update` or `a1 update --develop` without a named preview resolves a channel head that is not newer than the running version, A1 SHALL report that it is already current and exit successfully without replacing the installation. An explicitly named development preview SHALL keep its existing resolution and installation behavior.

#### Scenario: The registry tag is lower than the running release
- **WHEN** the running stable release is `0.3.1` and npm reports `latest` as `0.3.0`
- **THEN** `a1 update` SHALL report that A1 is current and SHALL NOT start an update transaction

#### Scenario: A named preview is requested
- **WHEN** the user runs `a1 update --develop 630` while a later development release is running
- **THEN** A1 SHALL resolve and install preview 630 as it does today
