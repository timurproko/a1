## MODIFIED Requirements

### Requirement: A failed stable publication returns to draft before npm
When stable publication started by native Release publication fails or is cancelled,
a trusted recovery job SHALL run from default-branch code. It SHALL re-read both
target package versions from the registry and every attempt's npm upload steps. Only
when both packages are absent, no upload step started, and the complete job listing
was read SHALL it return the Release to draft and then delete the target tag, and
only when that tag is a lightweight tag at the Release's bound source. Tag deletion
SHALL use a contents-scoped token of the single release-automation App permitted to
bypass the tag ruleset. Otherwise it SHALL keep the published Release and tag, and
recovery SHALL rerun the failed jobs of the same run, whose final registry check makes
an already-published package an exact-byte no-op. Automation SHALL never move a tag,
delete a tag at another commit, or delete a tag once npm may have been reached.

Registry verification SHALL compare exact integrity and shasum for both packages,
verify the requested dist-tag, and keep polling for at least thirty minutes before
failing an upload npm is still ingesting. The publishing job's timeout SHALL exceed
that polling window.

#### Scenario: Validation fails after the click
- **WHEN** an exact-package gate fails before either package upload starts
- **THEN** the Release SHALL return to draft and its unconsumed tag SHALL be deleted
- **AND** publishing the draft again SHALL start a new publication

#### Scenario: Publication is cancelled before npm
- **WHEN** the publication run is cancelled before either upload step starts
- **THEN** the recovery job SHALL return the Release to draft and delete its unconsumed tag

#### Scenario: An upload started but npm does not yet serve it
- **WHEN** an npm upload step ran and registry verification timed out while npm is still ingesting
- **THEN** the recovery job SHALL keep the Release and tag and direct the maintainer to confirm the registry and rerun the failed jobs

#### Scenario: npm serves an upload after a delay within the window
- **WHEN** npm accepts both uploads but serves one of them only about seventeen minutes later with the validated bytes
- **THEN** registry verification SHALL succeed in the same run
- **AND** the published-pair smoke and completion SHALL keep their existing eligibility

#### Scenario: One package reached npm
- **WHEN** either target package version exists on npm after a failure
- **THEN** the Release and tag SHALL stay and a rerun of the same run's failed jobs SHALL verify existing bytes and publish only what is missing

#### Scenario: The tag does not match the bound source
- **WHEN** the target tag points at another commit or is annotated
- **THEN** the recovery job SHALL fail without deleting or moving it

#### Scenario: Recovery runs again
- **WHEN** the recovery job reruns after it already returned the Release to draft and deleted the tag
- **THEN** it SHALL succeed without further mutation
