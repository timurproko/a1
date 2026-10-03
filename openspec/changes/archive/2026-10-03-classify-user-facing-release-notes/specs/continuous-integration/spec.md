## ADDED Requirements

### Requirement: Generated stable notes classify user-facing change intent
Stable release-note generation SHALL classify each merged pull request from its bounded title before ordinary grouping. A title with an explicit breaking marker SHALL remain eligible for `Breaking Changes` regardless of its ordinary type. A non-breaking `chore:` or `chore(scope):` title SHALL be omitted, as SHALL the historical generated `fix(regression): ...` triage form. The established historical `chore(pi): upgrade pinned Pi to <version>` form SHALL remain eligible as `Changed`, and a current `upgrade(pi): ...` title SHALL be rendered as `Changed`. When every pull request in the selected range is omitted, the generated body SHALL state that there are no user-facing changes without listing the maintenance work.

Trusted regression triage SHALL title a new proposal `chore(regression): ...` because workflow failure alone does not establish a user-facing defect. When investigation establishes and repairs a user-facing defect, the final pull request SHALL use the applicable `fix(scope): ...` title before merge if that repair is to appear under `Fixed`. Trusted Pi sync SHALL title a new proposal `upgrade(pi): ...`. These title semantics SHALL NOT rename the established `fix/nightly-regression-*` or `chore/pi-*` branches, change generated OpenSpec identities or provenance, alter validation selection, or reduce the maintainer's authority to edit the draft Release body before publication.

#### Scenario: Routine maintenance merges
- **WHEN** a release range contains a non-breaking pull request titled `chore(ci): tune validation`
- **THEN** the generated stable note SHALL omit that pull request

#### Scenario: A chore declares a breaking change
- **WHEN** a release range contains a pull request titled `chore(runtime)!: remove legacy startup support`
- **THEN** the generated stable note SHALL retain it under `Breaking Changes`

#### Scenario: Historical generated regression repair is in range
- **WHEN** a release range contains an already-merged generated pull request titled `fix(regression): repair the 2026-10-02 full regression failure`
- **THEN** the generated stable note SHALL omit it as regression-triage bookkeeping

#### Scenario: Regression investigation finds a product defect
- **WHEN** a generated regression proposal repairs user-visible update behavior and is retitled `fix(update): resolve bundled npm entry` before merge
- **THEN** the generated stable note SHALL retain it under `Fixed`

#### Scenario: Historical and current Pi upgrades are in range
- **WHEN** a release range contains `chore(pi): upgrade pinned Pi to 0.99.2` and `upgrade(pi): upgrade pinned Pi to 0.99.3`
- **THEN** the generated stable note SHALL retain both upgrades under `Changed`

#### Scenario: Trusted automation opens proposals
- **WHEN** regression triage and Pi upstream sync each open a new draft proposal
- **THEN** their pull-request titles SHALL begin with `chore(regression):` and `upgrade(pi):` respectively
- **AND** their established branch identities and trusted provenance SHALL remain unchanged

#### Scenario: The range contains no user-facing entries
- **WHEN** every pull request in the selected release range is filtered maintenance
- **THEN** the generated stable note SHALL contain a neutral no-user-facing-changes entry and SHALL NOT enumerate those pull requests
