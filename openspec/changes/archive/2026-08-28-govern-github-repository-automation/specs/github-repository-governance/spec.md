## ADDED Requirements

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
require resolved review threads, and require `Development validation required` with
no bypass actor. `master` SHALL reject deletion and non-fast-forward updates while
remaining writable by a successful stable release fast-forward. `v*` tags SHALL
reject deletion and movement. Any change to approvals, strict-base policy, merge
methods, or bypass authority SHALL require an explicit specification decision.

#### Scenario: Pull request validation is incomplete
- **WHEN** a pull request targeting `develop` lacks a successful required check
- **THEN** GitHub SHALL prevent integration

#### Scenario: Stable release records itself
- **WHEN** npm serves the verified stable package
- **THEN** release automation MAY fast-forward `master` and create the matching immutable `v*` tag

#### Scenario: Protected history is rewritten
- **WHEN** an actor attempts to delete or non-fast-forward a protected branch or move a release tag
- **THEN** GitHub SHALL reject the operation without a bypass

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

### Requirement: Documentation auto-merge remains exact and current-head-bound
Only a non-draft same-repository pull request into `develop` whose complete diff is
under `openspec/**` and/or exactly root `README.md` SHALL be automatically squash-
integrated. Both sides of renames SHALL be classified. Required validation SHALL gate
the merge, and any direct clean-state reconciliation SHALL require successful
validation for the current head and enforce that expected SHA.

#### Scenario: OpenSpec-only pull request passes
- **WHEN** an eligible OpenSpec-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Root README-only pull request passes
- **WHEN** an eligible root-README-only current head passes required validation
- **THEN** repository automation SHALL squash-integrate it without maintainer merge action

#### Scenario: Mixed pull request passes CI
- **WHEN** any changed or renamed-from path is outside the exact allowlist
- **THEN** auto-merge SHALL remain disabled and the pull request SHALL await manual acceptance

#### Scenario: Successful validation is stale
- **WHEN** successful validation names a head other than the current pull-request head
- **THEN** automation SHALL NOT directly integrate the current head

### Requirement: Merged same-repository topic branches are reconciled safely
After a pull request into `develop` is merged, trusted repository automation SHALL
ensure that its same-repository remote topic branch no longer exists. Cleanup SHALL
be independent of whether integration was automatic or manual. A deletion SHALL
occur only when the live ref still equals the pull request's merged head SHA and the
ref is not protected, default, release-owned, or otherwise reserved. Cleanup SHALL
never operate on fork refs, local branches, or worktrees.

#### Scenario: Platform deletion already succeeded
- **WHEN** the merged pull request's remote head ref is absent
- **THEN** cleanup SHALL succeed idempotently without a deletion request

#### Scenario: Merged topic ref still matches
- **WHEN** a merged same-repository pull request targeted `develop` and its unprotected topic ref still equals `pull_request.head.sha`
- **THEN** trusted cleanup SHALL delete that exact remote ref and verify it is absent

#### Scenario: Workflow token authors documentation integration
- **WHEN** trusted documentation automation merges with `GITHUB_TOKEN` and GitHub suppresses a recursive close-event workflow
- **THEN** that same trusted automation SHALL invoke the shared exact-head reconciliation synchronously

#### Scenario: Topic branch advanced after merge
- **WHEN** the live topic ref no longer equals the pull request's merged head SHA
- **THEN** cleanup SHALL refuse deletion and report both identities

#### Scenario: Pull request was closed without merge
- **WHEN** a pull request closes without a merge
- **THEN** cleanup SHALL leave its branch unchanged

#### Scenario: Head belongs to a fork
- **WHEN** the merged pull request's head repository is not the governed repository
- **THEN** cleanup SHALL perform no ref mutation

#### Scenario: Reserved ref is presented
- **WHEN** an event presents `develop`, `master`, a protected ref, a release ref, or malformed ref metadata as the head
- **THEN** cleanup SHALL fail closed without deletion

#### Scenario: GitHub refuses deletion
- **WHEN** an authorized matching deletion request fails
- **THEN** the workflow SHALL fail and preserve the API outcome as bounded evidence

### Requirement: Documentation cannot stale generated governance evidence
A documentation-only pull request SHALL remain exempt from product builds and product
test suites, but it SHALL run every lightweight governance consistency check whose
input surface includes its changed paths. OpenSpec changes SHALL additionally pass
strict OpenSpec validation. Automation SHALL NOT broaden the documentation auto-merge
allowlist to include generated baselines.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Generated baseline must change
- **WHEN** a documentation change legitimately requires a generated configuration update outside the auto-merge allowlist
- **THEN** delivery SHALL use the manual mixed/code path

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete

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
