## MODIFIED Requirements

### Requirement: Remote ref absence is a separate gate

Before completed-delivery local deletion, cleanup SHALL confirm the live absence of the implementation and archive remote topic refs and any additional associated PR ref represented by the candidate. Unknown remote state SHALL block deletion. A present or recreated ref SHALL preserve a completed-delivery candidate even when its SHA matches a merged PR. Preview, queue/watch, and the completed-delivery operation SHALL use read-only remote operations and SHALL NOT delete remote branches, merge PRs, publish archives, or change repository settings.

The separately confirmed closed-unmerged discard operation SHALL be the only local-cleanup operation permitted to remove a remote ref. It SHALL act on at most the exact same-repository unprotected topic ref recorded by the named PR, require the live ref to equal the PR head SHA, enforce that expected SHA during deletion, and verify absence before local worktree removal. Unknown, advanced, protected, reserved, fork-owned, missing-identity, or inconsistent remote state SHALL block mutation.

#### Scenario: Remote cleanup has not finished
- **WHEN** either lifecycle topic ref for a completed delivery still exists
- **THEN** completed-delivery local cleanup SHALL defer without modifying that remote ref or the local worktree

#### Scenario: Remote ref was recreated
- **WHEN** a previously absent completed-delivery ref exists again at the merged SHA or another SHA
- **THEN** cleanup SHALL preserve the local candidate and report the live ref identity

#### Scenario: No local archive checkout exists
- **WHEN** the verified archive was generated entirely on GitHub
- **THEN** cleanup SHALL require its merged PR and absent remote ref but SHALL NOT require or invent a local archive worktree

#### Scenario: Explicit rejected-work discard removes the exact remote ref
- **WHEN** the confirmed discard candidate's same-repository unprotected remote topic ref still equals the closed-unmerged PR head SHA
- **THEN** discard SHALL compare-and-delete that exact ref and verify its absence before attempting local worktree removal

#### Scenario: Rejected-work remote ref changed or is protected
- **WHEN** the discard candidate's remote ref is protected, reserved, ambiguous, or no longer equals the closed-unmerged PR head SHA
- **THEN** cleanup SHALL preserve the remote ref and local worktree and report the blocker

### Requirement: Local identity and content checks fail closed
A candidate SHALL remain a registered worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered HEAD and branch attachment. That HEAD SHALL exactly match the associated merged PR head, a separately registered acceptance checkout of its verified merge commit, or—only for an explicitly confirmed discard—the exact head of the named closed-unmerged same-repository PR. Mere ancestry, age, naming similarity, or closed state alone SHALL NOT authorize deletion of an arbitrary checkout. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions, and ambiguous registrations SHALL be excluded.

Immediately before removal, cleanup SHALL verify staged, unstaged, and all untracked content, actual nested repositories, registered gitlinks/submodules, and submodule changes. Any staged, unstaged, untracked, unknown ignored, linked, special, nested-repository, or submodule content SHALL block automatic removal. Repository-owned generated paths covered by the central disposal policy MAY be removed only after their ignored/path/type boundaries pass. A tracked regular `.gitmodules` file by itself SHALL be treated as repository content, not proof of a nested repository; actual nested `.git` metadata, gitlink index entries, configured submodules, and submodule state SHALL remain blockers. Cleanup SHALL offer no local force option and SHALL NOT infer that arbitrary ignored content is disposable.

#### Scenario: Dirty worktree has a merged lifecycle
- **WHEN** an otherwise eligible completed or discard candidate contains staged, unstaged, or untracked files
- **THEN** cleanup SHALL retain it and identify the affected paths for manual review

#### Scenario: Ignored user files or nested repository exist
- **WHEN** a worktree contains ignored content outside the central disposable policy, nested `.git` metadata, a gitlink/configured submodule, or changed submodule content
- **THEN** cleanup SHALL retain it rather than silently delete those files

#### Scenario: Tracked vendor metadata is not a nested repository
- **WHEN** a normal tracked vendor file is named `.gitmodules` but no matching gitlink, configured submodule, or nested `.git` metadata exists
- **THEN** cleanup SHALL treat it as ordinary tracked content and SHALL NOT block an otherwise eligible worktree

#### Scenario: Local head advanced after registration
- **WHEN** the candidate HEAD or branch attachment differs from the released registration or named PR head
- **THEN** cleanup SHALL preserve the checkout and require explicit identity reconciliation

#### Scenario: Windows path aliases or replacement directories
- **WHEN** canonical path, filesystem identity, or Git common-directory checks reveal an alias, escaped junction, or replaced directory
- **THEN** cleanup SHALL refuse deletion outside the original exact registered worktree

#### Scenario: Primary or executing worktree is presented
- **WHEN** a registered path is the primary worktree or contains the cleanup process's current working directory
- **THEN** cleanup SHALL refuse its removal regardless of PR state

### Requirement: Cleanup is local, opt-in, bounded, and resumable
The repository SHALL provide read-only preview, one explicit exact-candidate completed-delivery operation, one explicit exact-candidate closed-unmerged discard operation, and separately enabled local queue execution with both one-pass and watch modes. Invoking either exact-candidate operation SHALL authorize only its named candidate and SHALL NOT enable or scan the persistent queue. The discard operation SHALL additionally require an explicit closed-unmerged discard confirmation on every invocation. Delivery guidance SHALL use completed-delivery cleanup for integrated work and discard only after a maintainer explicitly rejects the exact unmerged candidate; low-level registration/release and queue/watch modes SHALL remain available for diagnostics, pending legacy delivery, and separately authorized background reconciliation.

While watch mode is running, it SHALL retry pending archive/ref/cleanliness conditions on bounded intervals without another deletion prompt for already released eligible completed-delivery candidates. Queue/watch SHALL NOT infer or execute rejected-work discard authority. If watch is stopped or the machine is offline, the next enabled queue invocation SHALL resume evaluation; cleanup SHALL NOT promise immediate execution while no local process is running. Disabling the queue SHALL prevent `once`/`watch` deletion without revoking a later explicit exact-candidate `complete` or `discard` invocation.

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

#### Scenario: Exact rejected candidate is explicitly discarded while the queue is disabled
- **WHEN** the owner invokes `discard` with explicit confirmation for one exact closed-unmerged candidate while persistent queue/watch cleanup is disabled
- **THEN** cleanup SHALL evaluate only that candidate under the discard evidence, identity, content, remote-ref, and journal safeguards
- **AND** SHALL leave queue enablement and unrelated registrations unchanged

### Requirement: Destructive steps are revalidated and recoverable

Cleanup SHALL serialize mutations per repository and revalidate release state, filesystem/Git identity, HEAD, cleanliness, and live remote gates immediately before each destructive operation. Completed-delivery cleanup SHALL remove the worktree using non-force Git worktree removal, verify the result, and only then delete an associated unchanged, non-reserved local topic ref that is not checked out elsewhere. Local ref deletion SHALL enforce the expected old SHA atomically.

Closed-unmerged discard SHALL first complete all local preflight checks, then journal intent, reverify the PR remains closed-unmerged and the same-repository remote topic ref remains unprotected and at the expected PR head SHA, compare-and-delete that remote ref, and verify absence. Only after remote absence is durable SHALL it revalidate local identity and cleanliness, use non-force Git worktree removal, and atomically delete the unchanged local topic ref. A remote deletion followed by a local blocker SHALL be reported as partial and SHALL preserve the local worktree for a safe retry; a remote deletion failure or advanced ref SHALL NOT authorize local deletion.

Each step SHALL be journaled so a retry can distinguish already-absent resources from partial failure or path reuse. Cleanup SHALL NOT recursively delete leftover directories after a failed Git removal. Metadata pruning SHALL be limited to verified completed candidates and SHALL NOT prune another session's or unavailable worktree's registration.

#### Scenario: Concurrent workers evaluate one candidate
- **WHEN** two local reconcilers overlap
- **THEN** only one SHALL obtain mutation authority and the other SHALL defer

#### Scenario: Remote ref advances before rejected-work deletion
- **WHEN** the remote topic ref no longer equals the expected closed-unmerged PR head at compare-and-delete time
- **THEN** discard SHALL preserve the remote ref, worktree, and local ref and report the identity mismatch

#### Scenario: Remote deletion succeeds but local revalidation blocks
- **WHEN** the exact remote ref was removed but local identity, ownership, or content changes before worktree removal
- **THEN** cleanup SHALL report partial completion and preserve the local worktree and local ref for reviewed retry

#### Scenario: Local ref advances during cleanup
- **WHEN** the worktree has been removed but its local topic ref no longer equals the expected SHA
- **THEN** cleanup SHALL retain the advanced ref and report partial completion

#### Scenario: Windows file lock prevents complete removal
- **WHEN** Git removal fails or leaves a residual directory
- **THEN** cleanup SHALL report the exact incomplete step and preserve the residual content for manual recovery without force deletion

#### Scenario: Retry after interruption
- **WHEN** a prior run completed one or more verified destructive steps but stopped before finishing the remaining discard or completed-delivery steps
- **THEN** the next invocation of the same exact operation SHALL verify its journal and current identities before completing only the remaining safe steps

#### Scenario: Path is reused after removal
- **WHEN** a new directory or worktree occupies a previously removed path
- **THEN** a retry SHALL preserve the replacement and require a new explicit registration

## ADDED Requirements

### Requirement: Closed-unmerged cleanup is one standardized discard operation
The repository SHALL provide one explicit `discard` operation accepting the primary repository, exact worktree path, OpenSpec change, and pull-request identity plus an explicit closed-unmerged confirmation. It SHALL require a closed, unmerged, non-draft-or-draft same-repository PR targeting `develop`, bind the exact PR head and topic branch to the registered local worktree, apply the central generated-content policy, and refuse open, merged, forked, reserved, advanced, dirty, active, ambiguous, or unverifiable candidates.

The operation SHALL own remote exact-ref deletion, journaled non-force worktree removal, and unchanged local-ref deletion as one bounded resumable procedure. It SHALL be deterministic and idempotent for the exact candidate, run outside the removable worktree, leave queue/watch authority unchanged, and report discarded, already-discarded, blocked, or partial outcomes without adopting or evaluating another worktree. Closing a PR, implementation approval, elapsed time, branch naming, or worktree age alone SHALL NOT invoke or authorize discard.

#### Scenario: Maintainer explicitly discards a rejected candidate
- **WHEN** the owner invokes `discard` with the exact clean worktree, change, closed-unmerged PR, and required confirmation while remote and local refs still equal the PR head
- **THEN** the command SHALL delete the exact unchanged remote ref, remove the worktree non-forcibly, delete the exact unchanged local ref, and report the journaled discarded outcome

#### Scenario: Closed PR lacks explicit discard confirmation
- **WHEN** a caller presents a closed-unmerged PR without the required explicit confirmation
- **THEN** cleanup SHALL preserve remote and local resources and report an authorization blocker

#### Scenario: PR is open, merged, or reopened
- **WHEN** the named PR is open, merged, or becomes open or merged during revalidation
- **THEN** discard SHALL preserve every remaining resource and SHALL NOT reinterpret delivery or rejection authority

#### Scenario: Discard command is repeated
- **WHEN** the same exact journaled candidate was already discarded successfully
- **THEN** the command SHALL report already-discarded without recreating ownership state or affecting a reused path or unrelated ref
