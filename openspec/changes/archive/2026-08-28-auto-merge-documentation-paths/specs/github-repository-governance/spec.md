## MODIFIED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is under `openspec/**`, under `docs/**`, and/or exactly root `README.md` SHALL be automatically squash-integrated. Both sides of renames SHALL be classified. Required validation SHALL gate the merge, and any direct clean-state reconciliation SHALL require successful validation for the current head and enforce that expected SHA.

#### Scenario: OpenSpec-only pull request passes
- **WHEN** an eligible OpenSpec-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Maintained documentation-only pull request passes
- **WHEN** an eligible `docs/**`-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Root README-only pull request passes
- **WHEN** an eligible root-README-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Allowed documentation surfaces are mixed
- **WHEN** a current head changes only paths under `openspec/**`, paths under `docs/**`, and/or root `README.md`
- **THEN** repository automation SHALL preserve its documentation-only eligibility

#### Scenario: Mixed pull request passes CI
- **WHEN** any changed or renamed-from path is outside the exact allowlist
- **THEN** auto-merge SHALL remain disabled and the pull request SHALL await manual acceptance

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head
