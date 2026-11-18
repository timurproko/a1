## ADDED Requirements

### Requirement: Delivery automation is delegated to the shared workflow
The repository SHALL forward pull-request delivery events to the reusable workflow of the shared delivery workflow in `timurproko/MyGitWorkflows` through one caller workflow that contains no steps of its own and passes only the delivery App credentials. Draft promotion, OpenSpec finalization, the delivery check, ready pull-request refresh, and merged-branch deletion SHALL be performed by that shared workflow. The repository SHALL NOT keep scripts, workflows, or validation jobs that implement or re-check those steps. The workflow inventory SHALL record the caller with its triggers, permissions, and the exact shared workflow reference.

#### Scenario: A pull request is opened or updated
- **WHEN** a pull request into `develop` is opened, edited, synchronized, marked ready, converted to draft, or closed
- **THEN** the caller SHALL invoke the shared workflow for that event
- **AND** no workflow in this repository SHALL promote, finalize, or validate the delivery itself

#### Scenario: The caller gains its own steps
- **WHEN** the caller workflow declares a step or script of its own, or references another reusable workflow
- **THEN** the governance check SHALL report it as untrusted drift

## MODIFIED Requirements

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

## REMOVED Requirements

### Requirement: Documentation auto-merge remains exact and current-head-bound
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Merged same-repository topic branches are reconciled safely
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Documentation cannot stale generated governance evidence
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Live acceptance proves repository lifecycle outcomes
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Post-merge archival executes only trusted repository policy
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Generated archive PRs receive real current-head validation
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Archive publication is idempotent and ownership-safe
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Archive automation acceptance proves the live end-to-end lifecycle
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Documentation merge-state recovery is bounded and fail-closed
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Trusted policy verifies exact implementation-specific checklist acceptance
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Acceptance publication and verification use trusted policy
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Versioned delivery publication boundaries are explicit
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Single-PR finalization receives ordinary exact-head validation
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Manual development merge is the sole version-3 acceptance action
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Post-merge version-3 handling is read-only except safe branch cleanup
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Live acceptance proves the atomic delivery lifecycle
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Trusted automation finalizes the ready single-PR candidate
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Target advances refresh ready pull-request branches
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.

### Requirement: Auto-merge provenance recognizes method-specific enable events
**Reason**: This automation is owned by the shared delivery workflow in `timurproko/MyGitWorkflows`; the repository keeps no delivery, archive, acceptance or documentation auto-merge policy.

**Migration**: None; the Delivery workflow forwards events to the shared workflow.
