## ADDED Requirements

### Requirement: Cleanup verifies exact corrective association provenance

A registered original worktree whose merged implementation pull request lacks lifecycle association MAY become eligible only through a repository-recorded corrective association for that exact repository, change, source pull request, source head, and source merge. Cleanup SHALL verify that the corrective delivery is a finalized version-3 candidate manually merged by an authorized human after successful required exact-head validation, current `develop` contains its declared archive and synchronized specifications, the original active change is absent, and both original and corrective remote topic refs are absent.

Corrective association SHALL supplement, not replace, existing local safeguards. The registered and live heads SHALL still match the original accepted implementation identity; ownership, branch attachment, path boundaries, cleanliness, generated-content policy, journaling, non-force worktree removal, and compare-and-delete local-ref rules SHALL remain unchanged. A generic merged PR, similarly named archive, editable body claim, missing remote ref, or manually supplied path SHALL NOT establish repair authority.

#### Scenario: Exact association repair is integrated

- **WHEN** a released original worktree matches an exact corrective record whose finalized corrective delivery and archive verify on current `develop`
- **THEN** cleanup SHALL continue through every ordinary remote, identity, content, and removal safeguard
- **AND** MAY remove the eligible original worktree without pretending its source PR was originally finalized

#### Scenario: Repair names another source identity

- **WHEN** a repair record's repository, change, source PR, source head, or source merge differs from the registered candidate or live GitHub evidence
- **THEN** cleanup SHALL retain the worktree with a corrective-association blocker

#### Scenario: Corrective delivery is not accepted and archived

- **WHEN** the corrective PR is open, automatically merged, failed or stale in validation, absent from current `develop`, still active, archive-drifted, or missing synchronized specifications
- **THEN** cleanup SHALL retain the original worktree
- **AND** SHALL NOT fall back from `source-association` to merge status alone

#### Scenario: Local worktree has changed

- **WHEN** corrective remote evidence is valid but the original worktree has advanced, changed branch, acquired untracked or modified content, or crosses another local safety boundary
- **THEN** the existing local blocker SHALL retain authority
- **AND** corrective association SHALL grant no force-removal path
