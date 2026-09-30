## MODIFIED Requirements

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 version` as the preferred version command and SHALL retain equivalent `a1 --version` and `a1 -v` compatibility forms. None of those forms SHALL start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. A stable release SHALL report `Current` and `Release` in that order. A development build SHALL report `Current`, `Develop`, and `Release` in that order. Both SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make every remote field unavailable with one concise `A1` diagnostic, keep the `Current` line, and exit successfully.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0` and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0` followed by `Release: 0.3.1`
- **AND** it SHALL NOT print a `Develop` line

#### Scenario: Stable release version without registry access
- **WHEN** the user runs `a1 version` from a stable release and dist-tag discovery fails
- **THEN** A1 SHALL print `Current: <installed version>` and `Release: unavailable`, emit one concise `A1` diagnostic, and exit successfully

#### Scenario: Development build versions
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a development build
- **THEN** every form SHALL display the same `Current`, `Develop`, and `Release` result in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Old subcommand notation
- **WHEN** the user runs the formerly unsupported `a1 version` notation
- **THEN** A1 SHALL now treat it as the preferred equivalent of `a1 --version` and `a1 -v`
