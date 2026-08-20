## MODIFIED Requirements

### Requirement: Installed and channel versions are visible without runtime startup
The installed application SHALL expose `a1 version`. It SHALL report `Installed`, `Release`, and `Next` in that order and SHALL NOT start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. Remote channel discovery SHALL read the authoritative package dist-tags as one coherent registry result.

#### Scenario: Registry versions are available
- **WHEN** the user runs `a1 version` while npm `latest` and `next` are defined and reachable
- **THEN** A1 SHALL display valid exact semantic versions in the order `Installed`, `Release`, and `Next`

#### Scenario: Next channel is not defined
- **WHEN** npm metadata is reachable, `latest` is defined, and the package has no `next` dist-tag
- **THEN** A1 SHALL display the latest version under `Release`, display `Next: unavailable`, emit no error diagnostic for the absent optional channel, and exit successfully

#### Scenario: Registry is unavailable
- **WHEN** installed package metadata is readable but the package dist-tags query fails
- **THEN** A1 SHALL preserve `Installed`, mark both remote fields unavailable, emit one concise `A1` diagnostic describing the registry failure, and exit successfully
