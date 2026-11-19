## MODIFIED Requirements

### Requirement: Auto-merge eligibility uses an exact documentation allowlist
A pull request SHALL be eligible for automation-owned squash integration only when it is non-draft, not implementation-bound, and every changed and renamed-from path is under `openspec/**`, under `docs/**`, or is exactly the root `README.md`. Any pull request containing another path SHALL be classified as code/operational, regardless of whether it claims to preserve behavior. Classification SHALL examine the complete pull-request diff and lifecycle association and SHALL fail closed.

An explicit implementation association or introduction of a new active OpenSpec change SHALL hold the PR outside documentation-owned integration even when its current diff is documentation-only. Removing the association SHALL NOT make a newly introduced active change eligible. Malformed or ambiguous lifecycle metadata SHALL block automation. Existing-change standalone planning revisions, ordinary docs, and generated archive follow-ups without an implementation-bound hold SHALL retain documentation auto-merge eligibility. A finalized version-3 candidate MAY separately retain native auto-merge personally armed by an authorized maintainer; that human choice SHALL NOT make it documentation-auto-merge eligible or grant repository automation merge authority.

For an eligible documentation pull request, automation MAY arm auto-merge while required validation is pending because protected `develop` remains the merge gate. Automation SHALL reconcile an eligible current head reported as `clean`, or as `unstable` with positive mergeability, only after successful validation for that same head and through a normal protected squash-merge request enforcing its expected head SHA. An unstable-status rejection when arming SHALL cause bounded state re-evaluation or explicit deferral rather than an unhandled failure or protection bypass. Failed or stale validation, conflicting or unconfirmed mergeability, and GitHub refusal SHALL NOT authorize integration. Automation-armed auto-merge SHALL be disabled when a draft, implementation-bound, or code/operational exclusion is detected. A qualifying human arm on a finalized version-3 candidate SHALL instead remain owned by that maintainer and SHALL be disabled when the candidate changes.

#### Scenario: OpenSpec-only pull request
- **WHEN** every changed path is under `openspec/**` and the non-draft PR is a standalone revision without an implementation-bound hold
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Maintained documentation-only pull request
- **WHEN** every changed path is under `docs/**` and the PR is non-draft and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Root README-only pull request
- **WHEN** every changed path is exactly `README.md` and the PR is non-draft and not implementation-bound
- **THEN** automation SHALL arrange squash integration behind its required validation

#### Scenario: Documentation surfaces are combined
- **WHEN** every changed and renamed-from path is under `openspec/**`, under `docs/**`, or exactly root `README.md`, and no lifecycle exclusion applies
- **THEN** automation SHALL classify the pull request as documentation-only and arrange squash integration behind its required validation

#### Scenario: Validation and reconciliation race
- **WHEN** an eligible current head becomes clean before auto-merge is armed
- **THEN** automation MAY squash-merge only after matching successful validation and with the expected head SHA

#### Scenario: Stale successful validation
- **WHEN** successful validation belongs to an older pull-request head
- **THEN** automation SHALL NOT directly merge the current head

#### Scenario: Behavior-preserving refactor
- **WHEN** a pull request changes source or any other path outside the allowlist
- **THEN** it SHALL NOT be eligible for documentation auto-merge
- **AND** a claim that behavior is unchanged SHALL NOT alter that classification

#### Scenario: Documentation and code are mixed
- **WHEN** a pull request changes an allowed documentation path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** repository automation SHALL NOT arm auto-merge for it

#### Scenario: Specification and code are mixed
- **WHEN** a pull request changes an OpenSpec path and any path outside the allowlist
- **THEN** the entire pull request SHALL be classified as code/operational
- **AND** repository automation SHALL NOT arm auto-merge for it

#### Scenario: Operational file is renamed into documentation
- **WHEN** a renamed file's previous path is outside the allowlist even though its new path is allowed
- **THEN** the pull request SHALL NOT be eligible for documentation auto-merge

#### Scenario: Changed paths cannot be classified
- **WHEN** the complete pull-request diff or lifecycle association cannot be obtained or classified
- **THEN** auto-merge SHALL remain disabled

#### Scenario: Eligible validated head is unstable
- **WHEN** an eligible current head has successful validation and GitHub reports it as unstable with positive mergeability
- **THEN** automation SHALL attempt normal protected squash integration for that exact head rather than requiring auto-merge to be armed first
- **AND** GitHub SHALL remain responsible for enforcing all branch protections

#### Scenario: Draft plan passes CI
- **WHEN** a draft planning PR passes required checks with only OpenSpec changes
- **THEN** automation SHALL leave it unmerged and SHALL NOT arm auto-merge

#### Scenario: Unimplemented plan is marked ready
- **WHEN** a PR introducing a new active change or carrying an implementation association becomes non-draft before implementation
- **THEN** automation SHALL keep it unmerged and disable any armed auto-merge
- **AND** removing its association SHALL NOT bypass detection of the introduced active change

#### Scenario: Implementation association is added to an eligible docs PR
- **WHEN** a PR body edit associates a previously eligible docs PR with implementation
- **THEN** automation SHALL re-evaluate eligibility and disable an existing arm unless authorized-human exact-final-candidate provenance is freshly established

#### Scenario: Maintainer arms finalized implementation
- **WHEN** an authorized maintainer personally enables native auto-merge for the current finalized version-3 head
- **THEN** automation SHALL preserve that human-owned arm while continuing to classify the PR as code/operational
- **AND** SHALL NOT create or exercise the authorization itself

#### Scenario: Archive follow-up is ready
- **WHEN** a verified non-draft archive PR only removes the completed active change, adds its archive, and updates declared main specs
- **THEN** the archived planning artifacts SHALL NOT themselves establish an implementation-bound hold
- **AND** documentation integration SHALL proceed behind required validation

### Requirement: Code integration requires local maintainer acceptance
Every code/operational pull request SHALL remain open after automated validation until an authorized maintainer chooses its integration. The agent SHALL provide exact applicable local run or inspection instructions and SHALL NOT invoke or arm auto-merge. CI success SHALL NOT count as human acceptance.

For a finalized single-PR OpenSpec delivery, the pull request SHALL present one to three implementation-specific acceptance scenarios as plain bullets. The maintainer SHALL NOT need to check boxes or perform a separate acceptance edit: manually merging the exact current head after review, or personally enabling native auto-merge for that unchanged head, SHALL mean the maintainer accepts the listed scenarios and explicitly authorizes protected integration after current-head CI. Any new commit or acceptance-list change SHALL require renewed current-head CI and a new maintainer integration decision.

#### Scenario: Code pull request passes CI
- **WHEN** all required automated checks pass for a code/operational pull request without a valid maintainer arm
- **THEN** the pull request SHALL remain open
- **AND** the agent SHALL report that maintainer validation and an authorized integration choice are still required

#### Scenario: Maintainer has not accepted locally
- **WHEN** the maintainer has neither manually merged nor personally armed native auto-merge for the exact candidate
- **THEN** neither the agent nor repository automation SHALL merge it or record human acceptance

#### Scenario: Maintainer accepts and authorizes merge
- **WHEN** an authorized maintainer reviews a finalized current-head candidate with its plain acceptance list and manually merges it
- **THEN** that merge SHALL constitute acceptance of the listed scenarios and explicit merge authorization
- **AND** implementation, synchronized specs, acceptance record, and archive SHALL integrate atomically

#### Scenario: Maintainer accepts and enables auto-merge
- **WHEN** an authorized maintainer reviews the finalized current-head candidate and personally enables native auto-merge
- **THEN** the arm SHALL constitute acceptance of the listed scenarios for that exact candidate
- **AND** GitHub MAY integrate it only after required current-head validation succeeds

#### Scenario: Candidate changes after review
- **WHEN** a new commit or acceptance-list edit changes the pull-request candidate
- **THEN** prior CI and any earlier human arm SHALL NOT authorize the new candidate
- **AND** the maintainer SHALL make a new integration decision after renewed current-head validation
