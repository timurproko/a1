## MODIFIED Requirements

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the version the repository
declares, and SHALL NOT be committed. Between releases the repository SHALL declare
one open prerelease version, and each preview SHALL be distinguished from the last
without a commit.

A preview SHALL be distinguished by the commit it was built from, so that an
installed preview identifies its exact source. The same commit SHALL therefore
always resolve to the same preview version, and republishing it SHALL be refused
rather than renamed — a rebuild is not a new version.

A commit declaring a stable version SHALL publish that release rather than a
preview, so the repository never declares a version that nothing publishes.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** three distinct previews SHALL be published, each naming its own commit, and no version commit SHALL be created

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version
- **THEN** that version SHALL be published to `latest` rather than published as a preview

#### Scenario: A published commit is built again
- **WHEN** a run repeats for a commit whose preview is already on the registry
- **THEN** it SHALL resolve to the same version and be refused, rather than publishing the same code under a new number
