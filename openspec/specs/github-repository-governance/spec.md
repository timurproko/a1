# github-repository-governance Specification

## Purpose
Define reviewed GitHub policy, trusted workflow authority, atomic manual delivery, standalone documentation automation, safe branch cleanup, drift detection, and live acceptance.

## Requirements

### Requirement: Governed GitHub state is declarative and drift-detectable
A1 SHALL keep one reviewed repository definition for governed repository settings,
Actions policy, environments, complete ruleset fields, protected refs, and workflow
inventory. A read-only check SHALL compare that definition with live GitHub state and
report field-level drift without mutating the repository. Applying policy SHALL require
a separate explicit maintainer confirmation and SHALL verify live state afterwards.

#### Scenario: Live policy matches
- **WHEN** the read-only governance check compares the reviewed definition with GitHub
- **THEN** it SHALL report every governed field as matching and perform no mutation

#### Scenario: An unnormalized live field drifts
- **WHEN** GitHub differs in a governed field that the former ruleset normalizer ignored
- **THEN** the check SHALL fail and identify the ruleset and field

#### Scenario: Ordinary CI evaluates repository policy
- **WHEN** a pull request runs repository governance validation
- **THEN** it SHALL use read-only authority and SHALL NOT apply settings or rulesets

#### Scenario: Maintainer applies reviewed policy
- **WHEN** the maintainer invokes the policy application command with its exact confirmation
- **THEN** only declared differences SHALL be mutated and a post-apply read SHALL match the definition

### Requirement: Protected refs retain distinct responsibilities
`develop` SHALL reject deletion and non-fast-forward updates, require a pull request,
require resolved review threads, require `Development validation required` with
no bypass actor, and require the pull request head to be up to date with `develop`
before merge, so that a candidate validated and finalized against a base that has
since advanced is reconciled, re-finalized, and revalidated before integration.
`master` SHALL reject deletion and non-fast-forward updates with no bypass actor while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject movement for every actor and SHALL reject deletion for every actor except one
declared release-automation GitHub App with `always` bypass, which exists solely so
that a failed stable publication can delete its unconsumed tag before npm. No person,
team, repository role, or other App SHALL bypass any protected ref. Any change to
approvals, strict-base policy, merge methods, or bypass authority SHALL require an
explicit specification decision.

#### Scenario: Pull request validation is incomplete
- **WHEN** a pull request targeting `develop` lacks a successful required check
- **THEN** GitHub SHALL prevent integration

#### Scenario: Base advanced after validation
- **WHEN** `develop` gains a commit after a pull request's required check succeeded
- **THEN** GitHub SHALL prevent integration until the branch is updated with that base and the required check succeeds again on the updated head
- **AND** the trusted finalization workflow SHALL re-finalize the updated head before that check runs

#### Scenario: Stable release records itself
- **WHEN** an authorized human publishes the prepared draft Release and npm serves the verified stable package pair
- **THEN** GitHub SHALL have created the matching `v*` tag at the bound source and release automation MAY fast-forward `master`

#### Scenario: Protected history is rewritten
- **WHEN** an actor attempts to delete or non-fast-forward a protected branch or move a release tag
- **THEN** GitHub SHALL reject the operation without a bypass

#### Scenario: A failed publication removes its unconsumed tag
- **WHEN** the release-automation App deletes a `v*` tag whose Release returned to draft with both packages absent from npm
- **THEN** GitHub SHALL permit that deletion and SHALL reject the same deletion by any other actor

#### Scenario: The bypass is widened
- **WHEN** the declared governance adds a bypass actor to a branch ruleset, a second tag bypass actor, a non-App actor, or a non-`always` bypass mode
- **THEN** governance validation SHALL reject the definition

### Requirement: Workflow authority is explicit and least-privileged
The repository SHALL inventory each workflow's trusted source, triggers, permissions,
concurrency, validation or publication authority, and artifact retention. A workflow
with write permission SHALL execute only default-branch trusted code and SHALL NOT
check out or execute pull-request code with that token. Third-party actions SHALL be
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
- **THEN** repository governance SHALL reject the workflow

### Requirement: Live acceptance proves repository lifecycle outcomes
Repository-governance implementation SHALL NOT be accepted from unit tests or API
success responses alone. Acceptance SHALL record exact pull request, workflow run,
merge actor/method, validated head, resulting `develop` commit, and post-merge remote
ref state for automatic and manual paths.

#### Scenario: Automatic documentation lifecycle is accepted
- **WHEN** an OpenSpec-only or root-README-only acceptance pull request passes
- **THEN** evidence SHALL show automatic squash integration and absence of its unchanged remote head ref

#### Scenario: Manual code lifecycle is accepted
- **WHEN** a code pull request passes CI and the maintainer manually accepts and merges it
- **THEN** evidence SHALL show it remained manual before merge and its unchanged remote head ref was cleaned afterwards

#### Scenario: Safety refusal is accepted
- **WHEN** an isolated fixture advances a merged topic ref before reconciliation
- **THEN** evidence SHALL show refusal and preservation of the advanced ref

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

### Requirement: Delivery automation is delegated to the shared workflow
The repository SHALL forward pull-request delivery events to the reusable workflow of the shared delivery workflow in `timurproko/MyGitWorkflows` through one caller workflow that contains no steps of its own and passes only the delivery App credentials. Draft promotion, OpenSpec finalization, the delivery check, ready pull-request refresh, and merged-branch deletion SHALL be performed by that shared workflow. The repository SHALL NOT keep scripts, workflows, or validation jobs that implement or re-check those steps. The workflow inventory SHALL record the caller with its triggers, permissions, and the exact shared workflow reference.

#### Scenario: A pull request is opened or updated
- **WHEN** a pull request into `develop` is opened, edited, synchronized, marked ready, converted to draft, or closed
- **THEN** the caller SHALL invoke the shared workflow for that event
- **AND** no workflow in this repository SHALL promote, finalize, or validate the delivery itself

#### Scenario: The caller gains its own steps
- **WHEN** the caller workflow declares a step or script of its own, or references another reusable workflow
- **THEN** the governance check SHALL report it as untrusted drift

### Requirement: Documentation changes keep generated governance evidence current
A documentation-only pull request SHALL remain exempt from product builds and product test suites, but it SHALL run every lightweight governance consistency check whose input surface includes its changed paths. OpenSpec changes SHALL additionally pass strict OpenSpec validation. Every other pull request SHALL retain its impact-selected validation.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete
