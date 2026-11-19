## ADDED Requirements

### Requirement: Standalone documentation cleanup reuses trusted integration policy

A registered pull request without implementation or acceptance lifecycle association MAY become eligible for completed-candidate cleanup only when its complete paginated changed-file set satisfies the repository's existing documentation auto-merge allowlist and its immutable base/head lifecycle classification confirms standalone documentation or an eligible existing-change/archive revision. Cleanup SHALL use the shared path and lifecycle classifiers, including rename sources, and SHALL NOT maintain a broader cleanup-specific documentation allowlist.

The pull request SHALL be non-draft, same-repository, merged into `develop`, and bound to the registered candidate PR, accepted head, and topic ref. Successful required validation SHALL belong to that exact head, the merge commit SHALL remain ancestral to current `develop`, and the topic ref SHALL be absent. The existing local ownership, identity, cleanliness, generated-content, journaling, non-force removal, residue, and local-ref compare-and-delete safeguards SHALL remain unchanged.

A mixed or code path, newly introduced active change, dedicated acceptance record, release note, malformed lifecycle metadata, incomplete diff, invalid rename, missing or stale validation, changed head/ref, absent target ancestry, live remote ref, or unavailable evidence SHALL block or remain pending. Failure of standalone documentation classification SHALL NOT turn an unassociated implementation into documentation; the exact corrective-association contract SHALL remain its only repair path.

#### Scenario: Standalone canonical specification revision integrated

- **WHEN** a registered worktree's unassociated pull request changed only an existing canonical specification, passed required validation for its exact head, merged into `develop`, remains in current target ancestry, and has no remote topic ref
- **THEN** cleanup SHALL classify it through the trusted standalone documentation policy and continue through every ordinary local safety gate
- **AND** SHALL NOT require an implementation archive or corrective association that the documentation lifecycle never created

#### Scenario: Documentation-looking implementation lacks association

- **WHEN** an unassociated pull request introduces an active change, includes code or another disallowed path, carries acceptance lifecycle state, or has incomplete or malformed classification evidence
- **THEN** cleanup SHALL retain the worktree and SHALL NOT use standalone documentation cleanup to bypass implementation finalization, acceptance, archival, or corrective-association requirements

#### Scenario: Documentation validation or integration is stale

- **WHEN** exact-head required validation is missing or unsuccessful, the merge is absent from current `develop`, the registered head/ref disagrees, or the remote topic ref exists
- **THEN** cleanup SHALL retain the worktree with the applicable evidence or pending-ref result

## MODIFIED Requirements

### Requirement: Cleanup waits for verified archive integration

Automatic local cleanup for an implementation-bound delivery SHALL require a merged same-repository implementation PR into `develop` and a merged automatic OpenSpec archive PR whose verified provenance identifies that implementation PR, accepted head, merge commit, and change, or the equivalent finalized version-3 atomic delivery evidence. The archive merge SHALL be present in freshly verified `origin/develop`, the archived acceptance record SHALL match the source, and the change SHALL no longer be active there. Source acceptance and archive authority SHALL satisfy the existing archive evidence rules. Cleanup SHALL NOT interpret implementation merge alone, archive PR creation, CI success, disappearance of a branch, or a PR title as completed archival.

A standalone documentation candidate satisfying the separate trusted-documentation cleanup requirement SHALL not require implementation acceptance or an OpenSpec archive because its verified integration changes no implementation-bound active delivery. It SHALL instead require its complete documentation classification, exact-head required validation, merge ancestry in current `develop`, and absent remote topic ref before the same local safety checks may run.

#### Scenario: Implementation merged but archive still pending
- **WHEN** implementation is merged but its archive PR is missing, open, or closed without merging
- **THEN** all associated worktrees SHALL remain and the report SHALL identify the archive blocker

#### Scenario: Automatic archive integrated
- **WHEN** the linked automatic archive PR has merged and current remote integration and acceptance evidence match
- **THEN** the associated worktrees SHALL become candidates for the remaining local safety checks

#### Scenario: Archive identity is unavailable or contradictory
- **WHEN** archive markers, accepted source identity, merge ancestry, archived evidence, or GitHub responses cannot be verified completely
- **THEN** cleanup SHALL preserve the worktrees and report an evidence blocker

#### Scenario: Legacy implementation association
- **WHEN** an explicitly registered legacy implementation uses supported version-1 linkage
- **THEN** cleanup SHALL verify its historical specification association and the same archive-completion gates without rewriting its linkage

#### Scenario: Standalone documentation has no delivery archive
- **WHEN** a registered unassociated documentation PR satisfies the trusted documentation cleanup requirement
- **THEN** cleanup SHALL use that verified integration authority without inventing an implementation association, acceptance record, or archive

### Requirement: Automatic authority is explicitly registered and released

Cleanup SHALL act automatically only on locally registered paths bound to the Git common directory, repository identity, candidate label, associated PR, worktree role, expected HEAD, and any exact local topic ref. For implementation-bound delivery the candidate label SHALL remain the OpenSpec change identity. For standalone documentation it SHALL be an audit label only and remote eligibility SHALL come exclusively from the complete trusted documentation evidence, never from that caller-selected label. Registration SHALL NOT itself authorize deletion. The owning delivery session SHALL explicitly release the candidate to the local cleanup service after stopping its use; a resumed session SHALL acquire ownership before touching it. Claim, release, and cleanup SHALL be mutually exclusive. Active, unknown-owner, stale-owner, and Git-locked worktrees SHALL remain protected; process disappearance or elapsed time alone SHALL NOT release ownership.

The only unregistered paths cleanup MAY remove are (a) an empty directory tree directly under the approved worktree root through the existing empty-directory requirement, and (b) one exact Git worktree through an explicitly confirmed `retire-redundant` invocation satisfying the redundant-retirement requirement. The latter is candidate-scoped maintainer authority, SHALL NOT be exercised by automatic sweep/queue/watch, and SHALL NOT create general adoption authority.

#### Scenario: Owner has finished with the checkout
- **WHEN** the owner explicitly releases a registered worktree and no session holds it
- **THEN** cleanup SHALL be permitted to evaluate it without requesting another per-worktree confirmation

#### Scenario: Another session owns or reacquires the worktree
- **WHEN** a worktree has active ownership or a session wins the ownership claim before cleanup
- **THEN** cleanup SHALL leave it untouched

#### Scenario: Owner resumes to repair a failed PR check
- **WHEN** a PR check fails, including a routine inherited failure, and the owning session resumes its retained checkout to repair it
- **THEN** delivery SHALL fix and repush in the same worktree, branch, and PR without requiring a separate proposal solely for that repair, reclaiming any released registration before touching it
- **AND** the repair SHALL preserve tested behavior and required validation gates, require current-head CI and renewed acceptance, and SHALL NOT authorize cleanup or merge

#### Scenario: Session exits without release
- **WHEN** ownership appears stale because the process disappeared or stopped reporting
- **THEN** cleanup SHALL require explicit ownership recovery rather than assume the worktree is abandoned

#### Scenario: Existing folder has no registration
- **WHEN** a folder that contains any file, link, or Git metadata resembles a merged branch or contains an ancestor of a merged PR but has no explicit registration and no exact confirmed redundant-retirement invocation
- **THEN** automatic cleanup SHALL leave it untouched and report it as unmanaged

#### Scenario: Exact redundant retirement is requested
- **WHEN** a maintainer explicitly confirms retirement of one exact unregistered checkout
- **THEN** cleanup MAY evaluate only that checkout under the redundant-retirement requirement
- **AND** SHALL retain every other unregistered path

#### Scenario: Documentation label resembles an OpenSpec change
- **WHEN** a standalone documentation registration's caller-selected label matches an active, archived, or nonexistent OpenSpec change
- **THEN** cleanup SHALL ignore that coincidence for remote lifecycle authority and require the complete standalone documentation evidence

### Requirement: Completed delivery cleanup is one standardized operation

The repository SHALL provide one explicit completed-candidate cleanup command that accepts the primary repository, exact worktree path, candidate label, and source/candidate pull-request identity. The command SHALL own the bounded local procedure: capture and register the exact worktree when the invocation creates a new registration, apply the repository-owned disposable policy, release that registration, verify the applicable implementation-delivery or standalone-documentation integration authority plus remote-ref evidence, evaluate only the requested candidate for removal, and leave no broad cleanup authority enabled after it exits. Invoking this command after verified merge, or sweeping a registration that hand-off released, SHALL be the explicit cleanup authorization; implementation approval or merge observation alone SHALL NOT invoke either.

For an implementation-bound candidate the label SHALL identify its OpenSpec change and cleanup SHALL require the ordinary acceptance/archive lifecycle. For a standalone documentation candidate the label SHALL serve only as local audit identity while cleanup derives authority from the complete changed paths, lifecycle classification, exact-head validation, current target ancestry, and remote-ref absence. Both routes SHALL use the same ownership, journaling, bounded remote-read, non-force Git removal, and compare-and-delete local-ref safeguards rather than implement a second deletion path.

The command SHALL be deterministic and idempotent for its exact candidate, SHALL run outside the removable worktree, and SHALL report whether it removed the worktree and local topic ref, found them already absent, or retained them for an exact blocker. The local topic ref SHALL be deleted only when its tip, read immediately before deletion, equals or is an ancestor of the merged PR head, using compare-and-delete against that tip.

When a released registration's path no longer exists before any removal step was journaled, the command SHALL NOT fail on the missing directory. It SHALL verify the same applicable remote integration evidence, require that Git registers nothing at that path or only this candidate's own dangling registration whose `gitdir` names the removed pointer, retire that registration, journal the worktree as already absent, and continue to the local topic ref under the same ancestry compare-and-delete rule. A valid worktree of a different identity at that path SHALL block as a reused path. An absent path with no registration SHALL block with a named reason and SHALL NOT be registered, because no journaled head exists to compare against; its branch, if any, remains subject to the sweep's evidence-based branch pruning.

#### Scenario: Agent finishes a verified merged delivery
- **WHEN** the owning agent invokes the standard completion command with the exact merged worktree, change, and pull request
- **THEN** the command SHALL perform registration/release and one candidate-scoped cleanup evaluation without requiring the agent to choose disposable paths or assemble lifecycle subcommands
- **AND** SHALL remove the eligible worktree and its accepted-ancestry local topic ref through the existing journaled non-force procedure

#### Scenario: Agent finishes integrated standalone documentation
- **WHEN** the owning agent invokes the standard completion command with the exact registered worktree and pull request whose standalone documentation integration evidence verifies
- **THEN** the command SHALL evaluate and remove it through the same journaled local safeguards without requiring nonexistent implementation acceptance or archive evidence

#### Scenario: Completed worktree is not yet eligible
- **WHEN** applicable integration evidence, current validation, remote-ref absence, identity, or local content checks are incomplete or contradictory
- **THEN** the command SHALL retain the worktree, disable its scoped mutation authority, and report the exact blocker
- **AND** SHALL NOT fall back to manual deletion or broaden cleanup to another registration

#### Scenario: Completion command is repeated
- **WHEN** the exact registered candidate was already removed successfully
- **THEN** the command SHALL report an already-absent/completed result without recreating ownership state, deleting another path, or failing because the worktree no longer exists

#### Scenario: Registered worktree was deleted by hand before cleanup
- **WHEN** a released registration's directory is absent and Git holds no registration for it or only its own dangling registration
- **THEN** the command SHALL verify the applicable remote integration evidence, retire that dangling registration, record the worktree as already absent, and delete the local topic ref whose tip equals or is an ancestor of the merged head
- **AND** SHALL mark the journal complete so later passes report it as already absent

#### Scenario: Absent path was never registered
- **WHEN** the completion command names a path that does not exist and has no registration
- **THEN** the command SHALL block with a named reason and SHALL NOT create a registration or delete any ref
