## MODIFIED Requirements

### Requirement: Publication follows from what was pushed
Publication SHALL be triggered by pushes to `develop` rather than by manual
dispatch or by a tag, and one workflow SHALL serve both channels. What the pushed
commit declares SHALL decide the channel: a prerelease version SHALL publish a
preview to the npm `next` tag, and a stable version SHALL publish that version to
the npm `latest` tag. No other workflow SHALL publish.

Every record of a stable release — its tag, its GitHub Release, and the branch that
names the current release — SHALL be written only after the registry serves the
published package. A release that does not complete SHALL therefore leave no tag, no
GitHub Release, and no moved branch. A release tag SHALL NOT be deleted or moved
once written, which is possible precisely because it is written last.

Publication SHALL refuse a version the registry already serves, and SHALL verify
afterwards that the registry serves the exact bytes that were uploaded under the
intended channel.

#### Scenario: Work lands on develop
- **WHEN** a commit declaring a prerelease version is pushed to `develop`
- **THEN** a preview SHALL be published to the npm `next` tag without any further instruction

#### Scenario: A release tag is pushed
- **WHEN** a commit declaring a stable version is pushed to `develop`
- **THEN** that version SHALL be published to the npm `latest` tag
- **AND** its tag and GitHub Release SHALL be written afterwards, naming that commit

#### Scenario: A tag disagrees with its commit
- **WHEN** a release fails at any point before the registry serves the package
- **THEN** no tag, GitHub Release, or moved branch SHALL exist for that version

#### Scenario: A version is already published
- **WHEN** the resolved version already exists on the registry
- **THEN** publication SHALL fail before packing anything

### Requirement: Preview versions cost no commits
A preview version SHALL be derived at publish time from the version the repository
declares, and SHALL NOT be committed. Between releases the repository SHALL declare
one open prerelease version, and each preview SHALL be distinguished from the last
without a commit.

A commit declaring a stable version SHALL publish that release rather than a
preview, so the repository never declares a version that nothing publishes.

#### Scenario: Several commits land in a row
- **WHEN** three commits are pushed to `develop`
- **THEN** three distinct previews SHALL be published and no version commit SHALL be created

#### Scenario: A release is prepared but not yet tagged
- **WHEN** `develop` declares a stable version
- **THEN** that version SHALL be published to `latest` rather than published as a preview

### Requirement: A stable release is not visible until npm has it
No tag, GitHub Release, or release-naming branch update SHALL exist for a version
the registry does not serve. The publication SHALL write them in that order after
the registry has accepted and been verified to serve the exact published bytes.

#### Scenario: npm rejects the upload
- **WHEN** publication fails
- **THEN** nothing SHALL be visible for that version anywhere, and the run SHALL fail

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the tag, the GitHub Release, and the release-naming branch SHALL be written
