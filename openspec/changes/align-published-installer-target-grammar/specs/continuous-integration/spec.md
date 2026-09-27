## ADDED Requirements

### Requirement: Published-pair smoke uses the accepted installer target grammar

Post-publication native installation smoke SHALL invoke the published installer through the public target grammar accepted by that same package. A develop candidate SHALL use `--develop <exact-preview-version>` so the immutable registry-verified application version remains explicit. A release candidate SHALL use bare invocation. The harness SHALL NOT use removed `--version`, `--latest`, or `--next` target options, and focused pull-request policy SHALL reject those stale forms before another candidate is published.

#### Scenario: A develop published pair is exercised

- **WHEN** the registry serves a verified develop application/installer pair at `0.2.1-dev.605`
- **THEN** every selected native smoke lane SHALL invoke the installer with `--develop 0.2.1-dev.605`
- **AND** the installed manifest SHALL still be required to equal that exact version

#### Scenario: A release published pair is exercised

- **WHEN** the registry serves a verified release application/installer pair
- **THEN** every selected native smoke lane SHALL invoke the installer without a target selector

#### Scenario: Release smoke drifts to a removed target option

- **WHEN** the published-installer harness uses `--version`, `--latest`, or `--next` as an application target option
- **THEN** focused repository policy SHALL reject the candidate before publication
