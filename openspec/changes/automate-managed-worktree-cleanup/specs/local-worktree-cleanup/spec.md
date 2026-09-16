## ADDED Requirements

### Requirement: Completed delivery cleanup is one standardized operation
The repository SHALL provide one explicit completed-delivery cleanup command that accepts the primary repository, exact worktree path, OpenSpec change, and source/candidate pull-request identity. The command SHALL own the bounded local procedure: capture and register the exact worktree when the invocation creates a new registration, apply the repository-owned disposable policy, release that registration, verify merged/archive/validation and remote-ref evidence, evaluate only the requested candidate for removal, and leave no broad cleanup authority enabled after it exits. Invoking this command after verified merge SHALL be the explicit cleanup authorization; implementation approval or merge observation alone SHALL NOT invoke it.

The command SHALL be deterministic and idempotent for its exact candidate, SHALL run outside the removable worktree, and SHALL report whether it removed the worktree and unchanged local topic ref, found them already absent, or retained them for an exact blocker. It SHALL use the existing ownership, journaling, bounded remote-read, non-force Git removal, and compare-and-delete local-ref safeguards rather than implement a second deletion path.

#### Scenario: Agent finishes a verified merged delivery
- **WHEN** the owning agent invokes the standard completion command with the exact merged worktree, change, and pull request
- **THEN** the command SHALL perform registration/release and one candidate-scoped cleanup evaluation without requiring the agent to choose disposable paths or assemble lifecycle subcommands
- **AND** SHALL remove the eligible worktree and unchanged local topic ref through the existing journaled non-force procedure

#### Scenario: Completed worktree is not yet eligible
- **WHEN** merge/archive evidence, current validation, remote-ref absence, identity, or local content checks are incomplete or contradictory
- **THEN** the command SHALL retain the worktree, disable its scoped mutation authority, and report the exact blocker
- **AND** SHALL NOT fall back to manual deletion or broaden cleanup to another registration

#### Scenario: Completion command is repeated
- **WHEN** the exact registered candidate was already removed successfully
- **THEN** the command SHALL report an already-absent/completed result without recreating ownership state, deleting another path, or failing because the worktree no longer exists

### Requirement: Repository-generated worktree content has one central disposal policy
The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories and OpenSpec finalization reports. The standard completion command SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, contains no nested repository/link/special-file boundary, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, or policy-mismatched content SHALL remain blocking.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/` or `.artifacts/openspec-archive/`
- **THEN** cleanup SHALL classify that content as disposable and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary

## MODIFIED Requirements

### Requirement: Local identity and content checks fail closed
A candidate SHALL remain a registered worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered HEAD and branch attachment. That HEAD SHALL exactly match the associated merged PR head, or a separately registered acceptance checkout of its verified merge commit. Mere ancestry SHALL NOT authorize deletion of an arbitrary checkout. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions, and ambiguous registrations SHALL be excluded.

Immediately before removal, cleanup SHALL verify staged, unstaged, and all untracked content, actual nested repositories, registered gitlinks/submodules, and submodule changes. Any staged, unstaged, untracked, unknown ignored, linked, special, nested-repository, or submodule content SHALL block automatic removal. Repository-owned generated paths covered by the central disposal policy MAY be removed only after their ignored/path/type boundaries pass. A tracked regular `.gitmodules` file by itself SHALL be treated as repository content, not proof of a nested repository; actual nested `.git` metadata, gitlink index entries, configured submodules, and submodule state SHALL remain blockers. Cleanup SHALL offer no force option and SHALL NOT infer that arbitrary ignored content is disposable.

#### Scenario: Dirty worktree has a merged lifecycle
- **WHEN** an otherwise eligible worktree contains staged, unstaged, or untracked files
- **THEN** cleanup SHALL retain it and identify the affected paths for manual review

#### Scenario: Ignored user files or nested repository exist
- **WHEN** a worktree contains ignored content outside the central disposable policy, nested `.git` metadata, a gitlink/configured submodule, or changed submodule content
- **THEN** cleanup SHALL retain it rather than silently delete those files

#### Scenario: Tracked vendor metadata is not a nested repository
- **WHEN** a normal tracked vendor file is named `.gitmodules` but no matching gitlink, configured submodule, or nested `.git` metadata exists
- **THEN** cleanup SHALL treat it as ordinary tracked content and SHALL NOT block an otherwise eligible worktree

#### Scenario: Local head advanced after registration
- **WHEN** the candidate HEAD or branch attachment differs from the released registration
- **THEN** cleanup SHALL preserve the checkout and require explicit identity reconciliation

#### Scenario: Windows path aliases or replacement directories
- **WHEN** canonical path, filesystem identity, or Git common-directory checks reveal an alias, escaped junction, or replaced directory
- **THEN** cleanup SHALL refuse deletion outside the original exact registered worktree

#### Scenario: Primary or executing worktree is presented
- **WHEN** a registered path is the primary worktree or contains the cleanup process's current working directory
- **THEN** cleanup SHALL refuse its removal regardless of merge state

### Requirement: Cleanup is local, opt-in, bounded, and resumable
The repository SHALL provide read-only preview, one explicit exact-candidate completed-delivery operation, and separately enabled local queue execution with both one-pass and watch modes. Invoking the exact-candidate operation SHALL authorize only its named candidate and SHALL NOT enable or scan the persistent queue. Delivery guidance SHALL use that operation for normal completed worktrees; low-level registration/release and queue/watch modes SHALL remain available for diagnostics, pending legacy delivery, and separately authorized background reconciliation.

While watch mode is running, it SHALL retry pending archive/ref/cleanliness conditions on bounded intervals without another deletion prompt for already released eligible candidates. If it is stopped or the machine is offline, the next enabled queue invocation SHALL resume evaluation; cleanup SHALL NOT promise immediate execution while no local process is running. Disabling the queue SHALL prevent `once`/`watch` deletion without revoking a later explicit exact-candidate `complete` invocation.

Each operation SHALL bound candidate count, remote requests, subprocess duration, and elapsed time, report incomplete coverage, and resume fairly without starving later queue candidates. Stopping or disabling the queue SHALL prevent further queue deletions without altering retained worktrees. No automatic OS-service installation, remote execution on the developer machine, or product UI startup hook SHALL be required.

#### Scenario: Archive merges after the delivery session ends
- **WHEN** a released candidate's archive merges while the separately enabled local watcher is running
- **THEN** a later bounded pass SHALL reevaluate and remove it once all gates pass

#### Scenario: Machine was offline at merge time
- **WHEN** a new enabled queue pass runs after connectivity returns
- **THEN** it SHALL reverify remote evidence before resuming eligible cleanup

#### Scenario: Scan budget is exhausted
- **WHEN** a queue pass cannot evaluate all registrations within its limits
- **THEN** it SHALL report deferred coverage and resume remaining candidates on a later pass

#### Scenario: Preview or disabled mode
- **WHEN** preview runs or queue cleanup is disabled
- **THEN** preview SHALL NOT change any worktree, branch, remote-tracking ref, ownership record, or retry checkpoint and `once`/`watch` SHALL NOT delete while disabled

#### Scenario: Exact candidate is explicitly completed while the queue is disabled
- **WHEN** the owner invokes `complete` for one exact candidate while persistent queue/watch cleanup is disabled
- **THEN** cleanup SHALL evaluate only that candidate under the ordinary evidence, identity, content, and journal safeguards
- **AND** SHALL leave queue enablement and unrelated registrations unchanged
