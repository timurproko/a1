## MODIFIED Requirements

### Requirement: Version output follows the Pi command convention
The installed application SHALL expose `a1 version` as the preferred version command and SHALL retain equivalent `a1 --version` and `a1 -v` compatibility forms. None of those forms SHALL start or mutate the interactive runtime, supervisor, storage, release cohort, or update transaction. Stable releases and development builds SHALL both report `Current`, `Develop`, and `Release` in that order. Both SHALL discover authoritative package dist-tags as one coherent result; an absent development tag SHALL be unavailable without a diagnostic, while discovery failure SHALL make every remote field unavailable with one concise `A1` diagnostic, keep the `Current` line, and exit successfully.

A development build SHALL append the recorded pull request to its `Current` line as ` (#<number>)` when its installed manifest records one. Both stable releases and development builds SHALL append the recorded pull request to their `Develop` line when the development head's published manifest records one and that manifest can be read within the discovery budget. A missing or unreadable record SHALL leave the bare version on that line without a diagnostic. Stable `Current` lines and `Release` lines SHALL NOT carry a pull request.

#### Scenario: Stable release version
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from stable release `0.3.0`, the `next` dist-tag is `0.4.0-dev.123`, and the `latest` dist-tag is `0.3.1`
- **THEN** every form SHALL print `Current: 0.3.0`, `Develop: 0.4.0-dev.123`, and `Release: 0.3.1` in that order, appending the development head's recorded pull request when available

#### Scenario: Stable release version without registry access
- **WHEN** the user runs `a1 version` from a stable release and dist-tag discovery fails
- **THEN** A1 SHALL print `Current: <installed version>`, `Develop: unavailable`, and `Release: unavailable`, emit one concise `A1` diagnostic, and exit successfully

#### Scenario: Stable release with a recorded development head
- **WHEN** the user runs `a1 version` from stable release `0.3.0` whose installed manifest records pull request 100 and the `next` dist-tag is `0.4.0-dev.123` whose manifest records pull request 123
- **THEN** A1 SHALL print `Current: 0.3.0` without pull-request attribution, `Develop: 0.4.0-dev.123 (#123)`, and the `Release` line

#### Scenario: Development tag is absent
- **WHEN** a stable release or development build discovers a valid `latest` dist-tag but no `next` dist-tag
- **THEN** A1 SHALL print its Current line, `Develop: unavailable`, and the resolved Release line without a diagnostic

#### Scenario: Development build versions
- **WHEN** the user runs `a1 version`, `a1 --version`, or `a1 -v` from a development build
- **THEN** every form SHALL display the same `Current`, `Develop`, and `Release` result in order, applying the declared unavailable behavior when remote channel metadata is absent or unreachable

#### Scenario: Development build with recorded pull requests
- **WHEN** the user runs `a1 version` from `0.2.7-dev.1217` whose manifest records pull request 842 and the `next` dist-tag is `0.2.7-dev.1218` whose manifest records pull request 828
- **THEN** A1 SHALL print `Current: 0.2.7-dev.1217 (#842)`, `Develop: 0.2.7-dev.1218 (#828)`, and the `Release` line

#### Scenario: Development build without a recorded pull request
- **WHEN** the installed development manifest or development head manifest records no pull request, or the head manifest cannot be read from either installed channel
- **THEN** that line SHALL print the bare version and A1 SHALL emit no diagnostic for the missing record

#### Scenario: Old subcommand notation
- **WHEN** the user runs the formerly unsupported `a1 version` notation
- **THEN** A1 SHALL now treat it as the preferred equivalent of `a1 --version` and `a1 -v`
