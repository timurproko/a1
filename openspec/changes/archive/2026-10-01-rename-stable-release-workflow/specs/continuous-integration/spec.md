## ADDED Requirements

### Requirement: Stable publication uses the release workflow identity

Native stable npm publication SHALL be initiated by `.github/workflows/release.yml`, whose workflow name is `Publish stable release` and whose only publication trigger is the published GitHub Release event. The wrapper SHALL call the default-branch reusable publisher, which SHALL authorize that exact caller path at the source-bound release tag. Development, candidate, and scheduled publication identities SHALL remain separate.

Historical workflow evidence SHALL continue to recognize the former exact `Release`/`release.yml` shared-publisher pair without treating the reused filename alone as current or historical authority. Active governance and documentation SHALL identify the current name, path, trigger, and permissions. Both npm packages SHALL trust the current calling filename with repository `timurproko/a1` and environment `npm-publish` before stable publication is attempted.

#### Scenario: An authorized stable Release is published

- **WHEN** an authorized human publishes a prepared stable Release bound to a post-rename source
- **THEN** `Publish stable release` from `release.yml` SHALL call the trusted reusable publisher and retain the existing stable validation, npm, rollback, asset, `master`, and reopening behavior

#### Scenario: The obsolete stable wrapper path calls the publisher

- **WHEN** a workflow identity names `finalize-release.yml` after the coordinated rename
- **THEN** the reusable publisher SHALL reject it as an unexpected stable caller

#### Scenario: Historical release provenance is read

- **WHEN** retained evidence names the former exact workflow pair `Release` and `release.yml`
- **THEN** compatibility readers MAY recognize that historical pair under its existing bounded rules
- **AND** a mismatched name/file pair or the current `Publish stable release` workflow SHALL NOT be reclassified as that historical scheduled publisher

#### Scenario: npm still trusts the obsolete caller

- **WHEN** either package still trusts `finalize-release.yml` instead of `release.yml`
- **THEN** stable publication SHALL fail before either package upload and SHALL NOT fall back to a long-lived npm token
