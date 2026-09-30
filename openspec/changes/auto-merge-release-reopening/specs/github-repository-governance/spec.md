## ADDED Requirements

### Requirement: Verified release reopening pull requests auto-merge
Trusted documentation auto-merge automation SHALL treat a pull request as a second eligible class, a release reopening PR, only when every check below passes on its current head. It SHALL be non-draft and same-repository, target `develop`, and come from head `chore/release-X.Y.Z-dev`. It SHALL be opened by the fixed `openspec-ci[bot]` App identity (login, numeric id, and `Bot` type) and contain exactly one commit authored by that identity. Its complete diff SHALL be exactly the modified `package.json`, `package-lock.json`, and `packages/a1-install/package.json` plus one added `docs/releases/<released>.md`, with no renames. With version fields removed, the base and head manifests SHALL be identical. The base SHALL consistently declare `<released>-dev`, and the head SHALL declare the patch successor `-dev` named by the branch. GitHub Release `v<released>` SHALL be published and non-prerelease, and the added note SHALL equal the note derived from that Release's body.

An eligible reopening PR SHALL follow the same current-head validation, expected-SHA squash integration, and exact-head branch cleanup as documentation PRs. A failed, missing, malformed, or ambiguous check SHALL make the PR ineligible, disable any armed auto-merge, and leave it for manual merge. `docs/releases/**` SHALL remain outside the documentation allowlist for every other pull request.

#### Scenario: Reopening PR passes validation
- **WHEN** a release reopening PR satisfying every check has current-head `Development validation required` success
- **THEN** automation SHALL squash-integrate that exact head without maintainer merge action and reconcile its branch

#### Scenario: Reopening PR changes more than versions
- **WHEN** a `chore/release-X.Y.Z-dev` PR changes a dependency, adds a path, renames a file, or declares inconsistent versions
- **THEN** automation SHALL NOT arm or merge it and SHALL disable any armed auto-merge

#### Scenario: Reopening shape from another author
- **WHEN** a PR with the reopening branch and paths is opened, or has a commit added, by any identity other than the fixed App
- **THEN** automation SHALL treat it as ineligible

#### Scenario: Release note does not match the published Release
- **WHEN** Release `v<released>` is missing, draft, or prerelease, or its derived note differs from the added note
- **THEN** automation SHALL treat the PR as ineligible and report the note check

#### Scenario: Release note edited in an ordinary PR
- **WHEN** a pull request that is not a verified reopening PR changes `docs/releases/**`
- **THEN** it SHALL remain outside documentation auto-merge
