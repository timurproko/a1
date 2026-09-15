## MODIFIED Requirements

### Requirement: Documentation cannot stale generated governance evidence
A documentation-only pull request SHALL remain exempt from product builds and product test suites, but it SHALL run every lightweight governance consistency check whose input surface includes its changed paths. OpenSpec changes SHALL additionally pass strict OpenSpec validation.

An exact acceptance-record pull request MAY bypass generic impact selection, documentation governance, and strict all-OpenSpec validation only when trusted base-controlled routing observes exactly one newly added canonical `openspec/acceptance/<change>/<source-head>.json` path from the complete pull-request diff. The unchanged required-check context SHALL pass on that route only after trusted acceptance policy validates the current head's exact diff, canonical record, source and merge identities, source CI provenance, active-change binding, title, body, checklist membership, branch ownership, and conflict state. Routing SHALL NOT itself grant acceptance authority. Missing or ambiguous diff data, a renamed or additional path, malformed record data, failed or stale acceptance validation, or any disagreement between routing and trusted validation SHALL fail closed without satisfying the required check.

Automation SHALL NOT broaden the documentation auto-merge allowlist to include generated baselines. Normal implementation, archive, documentation, mixed, and other pull requests SHALL retain their existing impact-selected validation.

#### Scenario: OpenSpec archive changes a governed inventory
- **WHEN** archiving an OpenSpec change removes or shifts an inventoried occurrence
- **THEN** that pull request's required validation SHALL detect the stale inventory

#### Scenario: Generated baseline must change
- **WHEN** a documentation change legitimately requires a generated configuration update outside the auto-merge allowlist
- **THEN** delivery SHALL use the manual mixed/code path

#### Scenario: Documentation does not affect generated governance
- **WHEN** the changed documentation leaves all governed inventories current
- **THEN** validation SHALL avoid product builds and tests while allowing the documentation path to complete

#### Scenario: Exact acceptance record uses specialized validation
- **WHEN** a current-head pull request adds exactly one canonical acceptance record and trusted acceptance policy validates every required source, scope, provenance, body, and conflict invariant
- **THEN** the required check SHALL be allowed to complete without generic impact selection, documentation governance, or strict all-OpenSpec validation
- **AND** the acceptance PR SHALL remain manual-merge-only

#### Scenario: Acceptance-shaped pull request contains another change
- **WHEN** an acceptance-record pull request adds, modifies, renames, or removes any additional path, or its complete diff cannot be established
- **THEN** the specialized route SHALL NOT satisfy the required check
- **AND** generic routing SHALL NOT override a failed trusted acceptance verdict

#### Scenario: Acceptance evidence is stale or malformed
- **WHEN** the candidate record, source identity, implementation CI, active-change binding, title, body, checklist, branch, conflict state, or validation head fails trusted acceptance policy
- **THEN** skipped generic validation SHALL NOT allow the required check to pass
- **AND** the pull request SHALL remain unmerged

#### Scenario: Pull request is not an exact acceptance record
- **WHEN** an implementation, archive, ordinary documentation, mixed, or other pull request targets `develop`
- **THEN** it SHALL retain the existing applicable impact-selected and governance validation rather than using the acceptance-only route

### Requirement: Generated archive PRs receive real current-head validation
A generated archive PR SHALL trigger the repository's ordinary required PR validation on every published head, including automated updates. Publication SHALL use an explicitly provisioned identity whose events trigger those workflows. Missing credentials or missing validation runs SHALL be reported as blocked or deferred, not as successful integration. Automation SHALL NOT use suppressed workflow-token events as an unnoticed substitute, synthesize a successful required check, or bypass branch protection.

Every generated changed and renamed-from path SHALL be under the selected change's active/archive paths or its declared main-spec paths within `openspec/**`. Existing documentation auto-merge SHALL remain the sole merge-policy owner, with its exact allowlist, current-head validation, expected-head enforcement, and protected squash integration intact. Any required update outside the permitted archive scope SHALL block this automatic path.

After successful required validation for the current archive head, trusted reconciliation SHALL evaluate that completion event without requiring a scheduled retry, maintainer merge action, or a natively armed auto-merge request. It SHALL automatically squash-integrate only after revalidating the complete archive authority, acceptance receipt, source identity, exact target base, mergeability, and expected head. Independent read-only evidence checks MAY be deduplicated or evaluated concurrently, but every required invariant SHALL complete successfully and the target base SHALL be read freshly immediately before integration. Queue or API delay SHALL be reported as pending or deferred rather than as a manual merge requirement.

#### Scenario: App-authored archive PR opens
- **WHEN** automation publishes an eligible archive branch and PR
- **THEN** ordinary required validation SHALL run for that head
- **AND** the existing documentation policy SHALL arrange squash integration only behind those checks

#### Scenario: Publication credential is unavailable
- **WHEN** the event-triggering publication identity is not configured
- **THEN** automation SHALL report the setup blocker and SHALL NOT fall back to a PR creation route that suppresses CI

#### Scenario: Archive validation fails
- **WHEN** strict OpenSpec validation or applicable documentation governance fails for the generated head
- **THEN** the archive PR SHALL remain unmerged
- **AND** automation SHALL NOT modify a non-OpenSpec generated baseline to force the PR through

#### Scenario: Published head changes
- **WHEN** automation updates an archive PR after regeneration
- **THEN** its prior validation SHALL NOT authorize merging the new head
- **AND** fresh required validation SHALL be triggered

#### Scenario: Current archive head becomes green
- **WHEN** the required validation workflow succeeds for the generated archive's exact current head and its target base and authority remain current
- **THEN** trusted reconciliation SHALL automatically issue the protected expected-head squash merge without maintainer action
- **AND** successful integration SHALL trigger exact-head branch cleanup

#### Scenario: Native auto-merge is not armed
- **WHEN** a generated archive is awaiting current-head validation or trusted post-validation reconciliation
- **THEN** the absence of a native auto-merge request SHALL NOT convert it to a manual merge path
- **AND** automation SHALL report the pending automatic state

#### Scenario: Archive target advances before integration
- **WHEN** `develop` no longer equals the archive marker's reviewed target immediately before merge
- **THEN** automation SHALL refuse integration and require regeneration against the new target
- **AND** prior successful validation SHALL NOT authorize the stale archive

#### Scenario: Archive authority cannot be fully revalidated
- **WHEN** any required source, acceptance, CI, diff, mergeability, or provenance read is missing, stale, contradictory, or fails
- **THEN** concurrent or cached verification SHALL fail closed and leave the archive unmerged
- **AND** automation SHALL report the blocking or deferred state
