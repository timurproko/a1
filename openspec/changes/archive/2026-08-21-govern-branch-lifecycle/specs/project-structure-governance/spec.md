## ADDED Requirements

### Requirement: Development branches have a bounded lifecycle
Repository work SHALL use a short-lived topic or milestone branch created from `develop`, except for the explicitly protected long-lived `develop` and `master` branches. After the source branch is merged into and pushed with its integration target, repository workflow SHALL delete the merged local source branch and SHALL delete its corresponding remote branch when one exists and is not protected. Cleanup SHALL use Git's merged-ancestor proof and safe deletion, SHALL NOT force-delete a branch, and SHALL retain the current branch and every branch containing commits not merged into the selected integration target.

#### Scenario: Work begins
- **WHEN** implementation or planning work begins from the accepted integration baseline
- **THEN** the work SHALL occur on a named topic or milestone branch created from `develop` rather than directly on `develop` or `master`

#### Scenario: Topic branch is integrated successfully
- **WHEN** a topic or milestone branch has passed its required gates, been merged into `develop`, and the merged `develop` commit has been pushed
- **THEN** workflow SHALL switch away from the source branch and delete it locally using Git's safe merged-branch deletion
- **AND** workflow SHALL delete the corresponding remote source branch when one exists and is not protected

#### Scenario: Branch contains unmerged work
- **WHEN** Git cannot prove that a candidate branch is an ancestor of the selected integration target
- **THEN** cleanup SHALL retain the branch, report it as unmerged, and SHALL NOT use force deletion to remove it

#### Scenario: Protected or checked-out branch is encountered
- **WHEN** cleanup encounters `develop`, `master`, the current branch, or another explicitly protected branch
- **THEN** cleanup SHALL retain it regardless of merged status

#### Scenario: Existing branch inventory is reconciled
- **WHEN** branch hygiene runs against an existing clone
- **THEN** it SHALL first report the protected, merged-deletable, and unmerged branch sets
- **AND** applying cleanup SHALL remove only the merged-deletable set

#### Scenario: Merge workflow completes
- **WHEN** an agent or maintainer completes a future merge into `develop`
- **THEN** safe source-branch deletion SHALL be part of the same workflow completion rather than deferred as optional housekeeping
