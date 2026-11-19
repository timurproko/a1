## MODIFIED Requirements

### Requirement: Development merges are gated by one required check
GitHub SHALL require the development validation check, and the `delivery / Delivery check`
of the shared delivery workflow, for pull requests into `develop`, which SHALL be
the only branch a change can be written to directly. The development validation check
SHALL remain the single check the workflows of this repository publish for that gate.

`master` SHALL record the commit the npm `latest` tag serves. Only a completed
stable publication SHALL write it, by fast-forward, and it SHALL carry no check or
pull-request requirement of its own — requiring one would prevent the release from
recording itself. Release tags SHALL be protected from deletion and movement and
SHALL likewise carry no check, because a tag is cut from a commit that has already
been validated. Publication SHALL NOT serve as the first automated validation of a
change.

#### Scenario: Required check has not passed
- **WHEN** a pull request targets `develop` and either required check is absent or unsuccessful
- **THEN** GitHub SHALL prevent the merge

#### Scenario: A stable version is published
- **WHEN** publication to npm `latest` completes
- **THEN** `master` SHALL be fast-forwarded to the published commit
- **AND** a preview publication SHALL leave `master` unchanged

#### Scenario: A release tag is targeted
- **WHEN** a deletion or force update of a `v*` tag is attempted
- **THEN** GitHub SHALL refuse it
