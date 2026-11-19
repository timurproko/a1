## Purpose

Complete accepted OpenSpec delivery on the owning machine by safely removing explicitly released local worktrees after verified automatic archive integration, while preserving active sessions and any unverified work.

## ADDED Requirements

### Requirement: Cleanup waits for verified archive integration

Automatic local cleanup SHALL require a merged same-repository implementation PR into `develop` and a merged automatic OpenSpec archive PR whose verified provenance identifies that implementation PR, accepted head, merge commit, and change. The archive merge SHALL be present in freshly verified `origin/develop`, the archived acceptance record SHALL match the source, and the change SHALL no longer be active there. Source acceptance and archive authority SHALL satisfy the existing archive evidence rules. Cleanup SHALL NOT interpret implementation merge alone, archive PR creation, CI success, disappearance of a branch, or a PR title as completed archival.

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

### Requirement: Remote ref absence is a separate gate

Before local deletion, cleanup SHALL confirm the live absence of the implementation and archive remote topic refs and any additional associated PR ref represented by the candidate. Unknown remote state SHALL block deletion. A present or recreated ref SHALL preserve the local candidate even when its SHA matches a merged PR. The local reconciler SHALL use read-only remote operations and SHALL NOT delete remote branches, merge PRs, publish archives, or change repository settings.

#### Scenario: Remote cleanup has not finished
- **WHEN** either lifecycle topic ref still exists
- **THEN** local cleanup SHALL defer without modifying that remote ref or the local worktree

#### Scenario: Remote ref was recreated
- **WHEN** a previously absent ref exists again at the merged SHA or another SHA
- **THEN** cleanup SHALL preserve the local candidate and report the live ref identity

#### Scenario: No local archive checkout exists
- **WHEN** the verified archive was generated entirely on GitHub
- **THEN** cleanup SHALL require its merged PR and absent remote ref but SHALL NOT require or invent a local archive worktree

### Requirement: Automatic authority is explicitly registered and released

Cleanup SHALL act only on locally registered paths bound to the Git common directory, repository identity, OpenSpec change, associated PR, worktree role, expected HEAD, and any exact local topic ref. Registration SHALL NOT itself authorize deletion. The owning delivery session SHALL explicitly release the candidate to the local cleanup service after stopping its use; a resumed session SHALL acquire ownership before touching it. Claim, release, and cleanup SHALL be mutually exclusive. Active, unknown-owner, stale-owner, and Git-locked worktrees SHALL remain protected; process disappearance or elapsed time alone SHALL NOT release ownership.

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
- **WHEN** a folder resembles a merged branch or contains an ancestor of a merged PR but has no explicit registration
- **THEN** automatic cleanup SHALL leave it untouched and report it as unmanaged

### Requirement: Local identity and content checks fail closed

A candidate SHALL remain a registered worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered HEAD and branch attachment. That HEAD SHALL exactly match the associated merged PR head, or a separately registered acceptance checkout of its verified merge commit. Mere ancestry SHALL NOT authorize deletion of an arbitrary checkout. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions, and ambiguous registrations SHALL be excluded.

Immediately before removal, cleanup SHALL verify staged, unstaged, and all untracked content, including nested repositories and submodule changes. Any such changes SHALL block automatic removal. Ignored content SHALL NOT grant permission to discard unknown user data: only explicitly declared disposable generated paths SHALL be removable under the registration's cleanup policy. Cleanup SHALL offer no automatic discard or force option.

#### Scenario: Dirty worktree has a merged lifecycle
- **WHEN** an otherwise eligible worktree contains staged, unstaged, or untracked files
- **THEN** cleanup SHALL retain it and identify the affected paths for manual review

#### Scenario: Ignored user files or nested repository exist
- **WHEN** a worktree contains ignored content outside its declared disposable paths or a nested repository requiring separate ownership
- **THEN** cleanup SHALL retain it rather than silently delete those files

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

The repository SHALL provide read-only preview and explicitly enabled local execution, with both one-pass and watch modes. Delivery guidance SHALL register and release managed worktrees and request a reconciliation after release. While watch mode is running, it SHALL retry pending archive/ref/cleanliness conditions on bounded intervals without another deletion prompt for already released eligible candidates. If it is stopped or the machine is offline, the next enabled invocation SHALL resume evaluation; cleanup SHALL NOT promise immediate execution while no local process is running.

Each pass SHALL bound candidate count, remote requests, subprocess duration, and elapsed time, report incomplete coverage, and resume fairly without starving later candidates. Stopping or disabling the worker SHALL prevent further deletions without altering retained worktrees. No automatic OS-service installation, remote execution on the developer machine, or product UI startup hook SHALL be required.

#### Scenario: Archive merges after the delivery session ends
- **WHEN** a released candidate's archive merges while the separately enabled local watcher is running
- **THEN** a later bounded pass SHALL reevaluate and remove it once all gates pass

#### Scenario: Machine was offline at merge time
- **WHEN** a new enabled pass runs after connectivity returns
- **THEN** it SHALL reverify remote evidence before resuming eligible cleanup

#### Scenario: Scan budget is exhausted
- **WHEN** a pass cannot evaluate all registrations within its limits
- **THEN** it SHALL report deferred coverage and resume remaining candidates on a later pass

#### Scenario: Preview or disabled mode
- **WHEN** preview runs or local automatic cleanup is disabled
- **THEN** no worktree, branch, remote-tracking ref, ownership record, or retry checkpoint SHALL be changed by preview and no deletion SHALL occur while disabled

### Requirement: Destructive steps are revalidated and recoverable

Cleanup SHALL serialize mutations per repository and revalidate release state, filesystem/Git identity, HEAD, cleanliness, and live remote gates immediately before each destructive operation. It SHALL remove the worktree using non-force Git worktree removal, verify the result, and only then delete an associated unchanged, non-reserved local topic ref that is not checked out elsewhere. Local ref deletion SHALL enforce the expected old SHA atomically. Branch deletion failure SHALL NOT conceal successful worktree removal or authorize deleting an advanced ref.

Each step SHALL be journaled so a retry can distinguish already-absent resources from partial failure or path reuse. Cleanup SHALL NOT recursively delete leftover directories after a failed Git removal. Metadata pruning SHALL be limited to verified completed candidates and SHALL NOT prune another session's or unavailable worktree's registration.

#### Scenario: Concurrent workers evaluate one candidate
- **WHEN** two local reconcilers overlap
- **THEN** only one SHALL obtain mutation authority and the other SHALL defer

#### Scenario: Local ref advances during cleanup
- **WHEN** the worktree has been removed but its topic ref no longer equals the expected SHA
- **THEN** cleanup SHALL retain the advanced ref and report partial completion

#### Scenario: Windows file lock prevents complete removal
- **WHEN** Git removal fails or leaves a residual directory
- **THEN** cleanup SHALL report the exact incomplete step and preserve the residual content for manual recovery without force deletion

#### Scenario: Retry after interruption
- **WHEN** a prior run removed a verified worktree but stopped before finishing local ref cleanup
- **THEN** the next run SHALL verify its journal and current identities before completing only the remaining safe steps

#### Scenario: Path is reused after removal
- **WHEN** a new directory or worktree occupies a previously removed path
- **THEN** a retry SHALL preserve the replacement and require a new explicit registration

### Requirement: Cleanup results are auditable without leaking credentials

Each preview or execution SHALL report per-candidate disposition and reason, relevant PR/head/archive identities, remote-ref observations, local safety blockers, completed steps, and incomplete coverage. Execution evidence SHALL remain local outside removable worktrees, with bounded retention. Reports SHALL distinguish eligible, pending, blocked, unmanaged, removed, already-absent, partial, and deferred results; they SHALL NOT claim removal from PR state or command exit alone. Credentials and file contents SHALL NOT appear in reports or be published to GitHub.

#### Scenario: Mixed candidate outcomes
- **WHEN** one registered worktree is removed while another is dirty or active
- **THEN** the report SHALL separately identify the actual removal and each retained candidate's reason

#### Scenario: Authentication fails
- **WHEN** remote evidence requests fail due to missing or expired authentication
- **THEN** cleanup SHALL retain candidates and report a bounded diagnostic without token values or raw credential-bearing responses
