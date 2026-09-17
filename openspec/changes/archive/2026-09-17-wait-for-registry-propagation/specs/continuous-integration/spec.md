## MODIFIED Requirements

### Requirement: A stable release is not visible until npm has it
No tag, GitHub Release, or release-naming branch update SHALL exist for a version
the registry does not serve. The publication SHALL write them in that order after
the registry has accepted and been verified to serve the exact published bytes.

Registry verification SHALL allow for npm's asynchronous ingestion of an accepted
upload: it SHALL poll the package metadata for at least ten minutes, within the
publishing job's timeout, before declaring that the version has not propagated, and
SHALL report each unsuccessful attempt with its reason. Bytes that differ from the
validated package or a channel tag that names another version SHALL still fail the
verification immediately, whatever the remaining window.

#### Scenario: npm rejects the upload
- **WHEN** publication fails
- **THEN** nothing SHALL be visible for that version anywhere, and the run SHALL fail

#### Scenario: npm accepts the upload
- **WHEN** the registry serves the published version
- **THEN** the tag, the GitHub Release, and the release-naming branch SHALL be written

#### Scenario: npm is still processing the upload
- **WHEN** `npm publish` has returned but the registry does not yet list the version
- **THEN** verification SHALL keep polling for at least ten minutes, logging each attempt, and SHALL succeed once the registry serves the exact validated bytes under the requested channel tag

#### Scenario: The registry never serves the version within the window
- **WHEN** ten minutes pass without the registry listing the version
- **THEN** the publication SHALL fail, no stable record SHALL be written, and a rerun of the failed jobs SHALL verify the earlier upload without publishing a second time
