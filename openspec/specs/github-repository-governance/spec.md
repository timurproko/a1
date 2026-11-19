# github-repository-governance Specification

## Purpose
Define reviewed GitHub policy, trusted workflow authority, atomic manual delivery, standalone documentation automation, safe branch cleanup, drift detection, and live acceptance.

## Requirements

### Requirement: Governed GitHub state is declarative and drift-detectable
A1 SHALL keep one reviewed repository definition for governed repository settings,
Actions policy, security capabilities, environments, labels, and workflow inventory.
Branch and tag rulesets SHALL be declared only in `protection/repositories.json` of the
shared delivery workflow and installed with its `delivery protect` command; the
repository definition SHALL NOT declare, compare, or apply rulesets. A read-only check SHALL compare that definition with live GitHub state and
report field-level drift without mutating the repository. Applying policy SHALL require the explicit `--apply --confirm apply-a1-github-governance` invocation, SHALL write only repository settings, Actions policy, environments, and labels, SHALL refuse when drift exists in security capabilities or the workflow inventory, and SHALL verify live state afterwards.

#### Scenario: Live policy matches
- **WHEN** the read-only governance check compares the reviewed definition with GitHub
- **THEN** it SHALL report every governed field as matching and perform no mutation

#### Scenario: An unnormalized live field drifts
- **WHEN** GitHub differs in a governed field of a declared setting, environment, label, or workflow
- **THEN** the check SHALL fail and identify the exact path of that field

#### Scenario: Ordinary CI evaluates repository policy
- **WHEN** a pull request runs repository governance validation
- **THEN** it SHALL compare the reviewed definition with the checked-out workflow files only, using read-only authority, and SHALL NOT read or apply live settings

#### Scenario: Maintainer applies reviewed policy
- **WHEN** the maintainer invokes the policy application command with its exact confirmation
- **THEN** only the differing sections among repository settings, Actions policy, environments, and labels SHALL be written and a post-apply read SHALL match the definition

### Requirement: Workflow authority is explicit and least-privileged
The repository SHALL inventory each workflow's trusted source, triggers, permissions,
concurrency, validation or publication authority, and artifact retention. A workflow
with write permission SHALL execute only default-branch trusted code and SHALL NOT
check out or execute pull-request code with that token. The `Delivery` caller is the one workflow that runs code of another repository: it SHALL contain no step of its own, SHALL only forward events and the delivery App credentials to `timurproko/MyWorkflows/.github/workflows/delivery.yml@main`, and SHALL be inventoried with the trusted source `shared-delivery-workflow`. npm publication SHALL use trusted publishing only; a workflow that reads a long-lived registry token SHALL surface as an authority the reviewed definition does not list. Third-party actions SHALL be
pinned to reviewed immutable commits; whether GitHub enforces the allowlist and SHA
policy SHALL be visible in drift reporting.

#### Scenario: Pull-request code is untrusted
- **WHEN** a write-authority workflow processes pull-request metadata
- **THEN** it SHALL check out trusted default-branch policy and SHALL NOT execute the pull-request head

#### Scenario: Workflow permissions drift
- **WHEN** a workflow or repository default gains undeclared write authority
- **THEN** repository governance SHALL fail with the workflow or setting identified

#### Scenario: Action reference is mutable
- **WHEN** a workflow references a third-party action without an approved immutable commit
- **THEN** the repository governance tests SHALL reject the workflow
- **AND** the only mutable references accepted SHALL be local workflows, this repository's `publish.yml@develop`, and the shared delivery workflow at `@main`

#### Scenario: The delivery caller gains its own steps
- **WHEN** the `Delivery` caller declares a `run` or `steps` key, or references the shared workflow at another ref
- **THEN** workflow inspection SHALL report its trusted source as `unknown`
- **AND** the comparison with the reviewed definition SHALL report that workflow as drift

### Requirement: Verified release reopening pull requests auto-merge
Trusted release-reopening automation SHALL integrate a pull request automatically only when it is a release reopening PR, that is, when every check below passes on its current head. It SHALL be non-draft and same-repository, target `develop`, and come from head `chore/release-X.Y.Z-dev`. It SHALL be opened by the fixed `openspec-ci[bot]` App identity (login, numeric id, and `Bot` type). Its body SHALL carry no delivery automation metadata. Its complete diff SHALL be exactly the modified `package.json`, `package-lock.json`, and `packages/a1-install/package.json` plus one added `docs/releases/<released>.md`, with no renames. With version fields removed, the base and head manifests SHALL be identical. The base SHALL consistently declare `<released>-dev`, and the head SHALL declare the patch successor `-dev` named by the branch. GitHub Release `v<released>` SHALL be published and non-prerelease, and the added note SHALL equal the note derived from that Release's body.

An eligible reopening PR SHALL be integrated only after current-head required validation succeeds, by an expected-SHA squash merge, and its exact merged head branch SHALL then be deleted. A failed, missing, malformed, or ambiguous check SHALL make the PR ineligible, disable any armed auto-merge, and leave it for manual merge. The automation SHALL NOT arm, disarm, or merge any pull request whose head is not a `chore/release-X.Y.Z-dev` branch.

#### Scenario: Reopening PR passes validation
- **WHEN** a release reopening PR satisfying every check has current-head `Development validation required` success
- **THEN** automation SHALL squash-integrate that exact head without maintainer merge action and reconcile its branch

#### Scenario: Reopening PR changes more than versions
- **WHEN** a `chore/release-X.Y.Z-dev` PR changes a dependency, adds a path, renames a file, or declares inconsistent versions
- **THEN** automation SHALL NOT arm or merge it and SHALL disable any armed auto-merge

#### Scenario: Reopening shape from another author
- **WHEN** a PR with the reopening branch and paths is opened by any identity other than the fixed App
- **THEN** automation SHALL treat it as ineligible

#### Scenario: Release note does not match the published Release
- **WHEN** Release `v<released>` is missing, draft, or prerelease, or its derived note differs from the added note
- **THEN** automation SHALL treat the PR as ineligible and report the note check

#### Scenario: Release note edited in an ordinary PR
- **WHEN** a pull request that is not a verified reopening PR changes `docs/releases/**`
- **THEN** the automation SHALL NOT arm or merge it

#### Scenario: An ordinary pull request is left alone
- **WHEN** a pull request from any other branch is opened, updated, or armed for auto-merge by a maintainer
- **THEN** the automation SHALL leave its auto-merge state unchanged and SHALL NOT merge it

### Requirement: Documentation changes keep generated governance evidence current
A documentation-only pull request SHALL remain exempt from product builds and product test suites, but it SHALL run every lightweight governance consistency check whose input surface includes its changed paths. OpenSpec changes SHALL additionally pass strict OpenSpec validation. Every other pull request SHALL retain its impact-selected validation.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete
