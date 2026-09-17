## ADDED Requirements

### Requirement: Hand-off parks the worktree for post-merge cleanup
The repository SHALL provide one explicit hand-off command that accepts the primary repository, exact worktree path, OpenSpec change, and pull-request identity. It SHALL register the exact worktree when no registration exists or reclaim the existing one, record the current HEAD and branch attachment, apply the repository-owned disposable policy, and release the registration to local cleanup. It SHALL NOT evaluate, delete, enable the persistent queue, or start a process. The delivering agent SHALL invoke it from the primary checkout when it hands the validated candidate to the maintainer and again after any repair push. That release SHALL be the candidate-scoped completed-delivery cleanup authorization for the exact worktree and its topic ref, exercised only after the merge, archive, validation, and remote-ref gates later verify; it SHALL NOT confer discard authority for a later closed-unmerged pull request.

Hand-off SHALL be idempotent for its exact worktree: a repeated invocation SHALL update the recorded head and release again rather than create a second registration. Tracked, staged, unstaged, or untracked content outside the central disposable policy SHALL block hand-off with the affected paths and leave the registration owned; a primary, foreign, or identity-changed path SHALL block with a named reason.

#### Scenario: Agent hands off a validated candidate
- **WHEN** the owning agent invokes hand-off for the pushed, clean worktree of a ready pull request
- **THEN** the command SHALL register or reclaim that exact worktree, record its head and branch, and release it
- **AND** SHALL leave the worktree, its branch, the remote, and queue enablement untouched

#### Scenario: Hand-off is repeated after a repair push
- **WHEN** the owner reclaims a handed-off worktree, pushes a repair, and invokes hand-off again
- **THEN** the same registration SHALL record the new head and be released again without a duplicate entry

#### Scenario: Hand-off finds unpushed content
- **WHEN** the worktree holds tracked, staged, unstaged, or untracked content outside the central disposable policy
- **THEN** hand-off SHALL block, name the affected paths, and SHALL NOT release the registration

#### Scenario: Handed-off pull request later closes without merge
- **WHEN** a handed-off candidate's pull request is closed unmerged
- **THEN** the release SHALL grant no discard authority and the worktree and refs SHALL remain until the explicit exact-candidate discard

### Requirement: Released merged deliveries are swept without per-candidate commands
The repository SHALL provide one explicit sweep operation, invoked from the primary checkout, that evaluates every released registration bound to this repository in one bounded pass and completes each candidate whose implementation pull request is verified merged, using exactly the completed-delivery evidence, remote-ref, identity, content, ownership, journaling, non-force removal, and compare-and-delete safeguards of the exact-candidate operation. The sweep SHALL NOT require queue enablement, SHALL NOT start a persistent process, SHALL NOT adopt unregistered worktrees, SHALL NOT discard closed-unmerged candidates, and SHALL leave no broad authority enabled after it exits. A disabled queue SHALL NOT prevent a sweep, but a stop sentinel written while a sweep runs SHALL stop it before its next destructive step.

Candidates whose pull request is open or whose evidence is still pending SHALL be reported `pending` and left untouched; candidates whose pull request closed without merge SHALL be reported `awaiting-discard` and left untouched; blocked candidates SHALL report their exact reason. The sweep SHALL apply the same candidate, remote-request, subprocess, and elapsed-time limits as a queue pass, report incomplete coverage, resume from a durable cursor on the next invocation, and yield `deferred` rather than wait when another session holds the mutation lock. Its report SHALL give one line per candidate suitable for relaying to the maintainer.

#### Scenario: New session starts after merges
- **WHEN** an agent session invokes the sweep before creating its worktree and handed-off candidates have since merged with verified archives and absent remote refs
- **THEN** the sweep SHALL remove each such worktree and its topic ref through the journaled non-force procedure and report `removed` or `already-absent` per candidate

#### Scenario: Handed-off pull request is still open
- **WHEN** a released candidate's pull request is open or its archive, validation, or remote-ref evidence is pending
- **THEN** the sweep SHALL report `pending` and SHALL NOT touch the worktree, branch, ownership record, or remote

#### Scenario: Handed-off pull request was rejected
- **WHEN** a released candidate's pull request is closed without merge
- **THEN** the sweep SHALL report `awaiting-discard` and SHALL NOT delete any local or remote ref or worktree

#### Scenario: Sweep coverage is exhausted
- **WHEN** a sweep reaches its candidate, request, or time limit before evaluating every released registration
- **THEN** it SHALL report deferred coverage and the next sweep SHALL resume from the durable cursor

#### Scenario: Another session is cleaning up
- **WHEN** the mutation lock is held when a sweep starts
- **THEN** the sweep SHALL report `deferred` without waiting and SHALL NOT remove the lock

#### Scenario: Stop sentinel appears during a sweep
- **WHEN** the queue is disabled or a stop sentinel is written while a sweep runs
- **THEN** a prior disabled state SHALL NOT prevent the sweep from starting, but a sentinel present before a destructive step SHALL stop it there

### Requirement: Merged local topic branches are pruned by evidence
The sweep SHALL also evaluate local branches under `refs/heads/` that follow the repository `type/short-description` naming, are not `develop` or another protected or reserved name, are not checked out in any worktree, and are not named by a live registration. Such a branch SHALL be deleted only when the same-repository pull-request lookup by that head ref name returns at least one pull request merged into `develop` and no open pull request, the branch tip equals or is an ancestor of the most recent such merged pull request's head SHA, and the remote topic ref is absent on `origin`. Deletion SHALL be compare-and-delete against the tip read immediately before. A branch matching no pull request, matching an open or only closed-unmerged pull request, holding a commit outside the merged head, checked out anywhere, or whose remote ref is present SHALL be reported with its reason and retained. Branch pruning SHALL NOT delete remote refs, worktrees, or registrations; the sweep MAY run one prune fetch of `origin` first, and that fetch SHALL NOT alter any local branch or worktree.

#### Scenario: Worktree was deleted by hand and its branch remains
- **WHEN** a merged pull request's local topic branch has no registration, no checkout, an absent remote ref, and a tip that is the merged head or its ancestor
- **THEN** the sweep SHALL delete that branch with compare-and-delete and report it

#### Scenario: Branch carries a local-only commit
- **WHEN** the branch tip holds a commit not reachable from the merged pull request head
- **THEN** the sweep SHALL retain the branch and report `branch-unmerged-commits`

#### Scenario: Branch name matches an open pull request
- **WHEN** any open pull request in this repository has that head ref name
- **THEN** the sweep SHALL retain the branch and report `branch-open-pull-request`

#### Scenario: Branch matches no pull request
- **WHEN** the lookup returns no pull request for that head ref name
- **THEN** the sweep SHALL retain the branch and report `branch-no-pull-request`

#### Scenario: Branch is checked out or still on the remote
- **WHEN** a worktree has the branch checked out or `origin` still has the ref
- **THEN** the sweep SHALL retain the branch and report `branch-checked-out` or `branch-remote-present`

## MODIFIED Requirements

### Requirement: Local identity and content checks fail closed
A candidate SHALL remain a registered worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered branch attachment. For a completed-delivery candidate the registered head and the live HEAD SHALL each equal or be an ancestor of the associated merged PR head, or of a separately registered acceptance checkout's verified merge commit, so that every reachable commit was accepted; a HEAD holding any commit outside that merged head SHALL block. For an explicitly confirmed discard the HEAD SHALL exactly equal the head of the named closed-unmerged same-repository PR. Mere ancestry of `develop`, age, naming similarity, or closed state alone SHALL NOT authorize deletion of an arbitrary checkout. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions, and ambiguous registrations SHALL be excluded.

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

#### Scenario: Trusted finalization advanced the branch after hand-off
- **WHEN** the registered head or live HEAD is an ancestor of the merged PR head because finalization commits were pushed after the owner's last push
- **THEN** cleanup SHALL treat the candidate as identity-consistent and continue to the remaining gates

#### Scenario: Local head advanced after registration
- **WHEN** the candidate HEAD holds a commit outside the merged PR head or its branch attachment differs from the released registration
- **THEN** cleanup SHALL preserve the checkout and require explicit identity reconciliation

#### Scenario: Windows path aliases or replacement directories
- **WHEN** canonical path, filesystem identity, or Git common-directory checks reveal an alias, escaped junction, or replaced directory
- **THEN** cleanup SHALL refuse deletion outside the original exact registered worktree

#### Scenario: Primary or executing worktree is presented
- **WHEN** a registered path is the primary worktree or contains the cleanup process's current working directory
- **THEN** cleanup SHALL refuse its removal regardless of PR state

### Requirement: Cleanup is local, opt-in, bounded, and resumable
The repository SHALL provide read-only preview, one explicit hand-off operation, one explicit exact-candidate completed-delivery operation, one explicit released-candidate sweep, one explicit exact-candidate closed-unmerged discard operation, and separately enabled local queue execution with both one-pass and watch modes. Invoking an exact-candidate operation SHALL authorize only its named candidate; invoking the sweep SHALL exercise only the authority each released registration's hand-off or exact-candidate release already granted; neither SHALL enable or scan the persistent queue. The discard operation SHALL additionally require an explicit closed-unmerged discard confirmation on every invocation. Delivery guidance SHALL use hand-off at maintainer hand-off, the sweep at the start of every delivery session and on verified or reported merge, completed-delivery cleanup for an exact integrated candidate, and discard only after a maintainer explicitly rejects the exact unmerged candidate; low-level registration/release and queue/watch modes SHALL remain available for diagnostics, pending legacy delivery, and separately authorized background reconciliation.

While watch mode is running, it SHALL retry pending archive/ref/cleanliness conditions on bounded intervals without another deletion prompt for already released eligible completed-delivery candidates. Queue/watch and sweep SHALL NOT infer or execute rejected-work discard authority. If watch is stopped or the machine is offline, the next enabled queue invocation or the next sweep SHALL resume evaluation; cleanup SHALL NOT promise immediate execution while no local process is running. Disabling the queue SHALL prevent `once`/`watch` deletion without revoking a later explicit hand-off, sweep, exact-candidate `complete`, or `discard` invocation.

Each operation SHALL bound candidate count, remote requests, subprocess duration, and elapsed time, report incomplete coverage, and resume fairly without starving later queue candidates. Stopping or disabling the queue SHALL prevent further queue deletions without altering retained worktrees. No automatic OS-service installation, remote execution on the developer machine, or product UI startup hook SHALL be required.

#### Scenario: Archive merges after the delivery session ends
- **WHEN** a released candidate's archive merges while the separately enabled local watcher is running or before the next session's sweep
- **THEN** the next bounded pass or sweep SHALL reevaluate and remove it once all gates pass

#### Scenario: Machine was offline at merge time
- **WHEN** a new enabled queue pass or sweep runs after connectivity returns
- **THEN** it SHALL reverify remote evidence before resuming eligible cleanup

#### Scenario: Scan budget is exhausted
- **WHEN** a queue pass or sweep cannot evaluate all registrations within its limits
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

### Requirement: Completed delivery cleanup is one standardized operation
The repository SHALL provide one explicit completed-delivery cleanup command that accepts the primary repository, exact worktree path, OpenSpec change, and source/candidate pull-request identity. The command SHALL own the bounded local procedure: capture and register the exact worktree when the invocation creates a new registration, apply the repository-owned disposable policy, release that registration, verify merged/archive/validation and remote-ref evidence, evaluate only the requested candidate for removal, and leave no broad cleanup authority enabled after it exits. Invoking this command after verified merge, or sweeping a registration that hand-off released, SHALL be the explicit cleanup authorization; implementation approval or merge observation alone SHALL NOT invoke either.

The command SHALL be deterministic and idempotent for its exact candidate, SHALL run outside the removable worktree, and SHALL report whether it removed the worktree and local topic ref, found them already absent, or retained them for an exact blocker. The local topic ref SHALL be deleted only when its tip, read immediately before deletion, equals or is an ancestor of the merged PR head, using compare-and-delete against that tip. It SHALL use the existing ownership, journaling, bounded remote-read, non-force Git removal, and compare-and-delete local-ref safeguards rather than implement a second deletion path.

When a released registration's path no longer exists before any removal step was journaled, the command SHALL NOT fail on the missing directory. It SHALL verify the same merge/archive evidence, require that Git registers nothing at that path or only this candidate's own dangling registration whose `gitdir` names the removed pointer, retire that registration, journal the worktree as already absent, and continue to the local topic ref under the same ancestry compare-and-delete rule. A valid worktree of a different identity at that path SHALL block as a reused path. An absent path with no registration SHALL block with a named reason and SHALL NOT be registered, because no journaled head exists to compare against; its branch, if any, remains subject to the sweep's evidence-based branch pruning.

#### Scenario: Agent finishes a verified merged delivery
- **WHEN** the owning agent invokes the standard completion command with the exact merged worktree, change, and pull request
- **THEN** the command SHALL perform registration/release and one candidate-scoped cleanup evaluation without requiring the agent to choose disposable paths or assemble lifecycle subcommands
- **AND** SHALL remove the eligible worktree and its accepted-ancestry local topic ref through the existing journaled non-force procedure

#### Scenario: Completed worktree is not yet eligible
- **WHEN** merge/archive evidence, current validation, remote-ref absence, identity, or local content checks are incomplete or contradictory
- **THEN** the command SHALL retain the worktree, disable its scoped mutation authority, and report the exact blocker
- **AND** SHALL NOT fall back to manual deletion or broaden cleanup to another registration

#### Scenario: Completion command is repeated
- **WHEN** the exact registered candidate was already removed successfully
- **THEN** the command SHALL report an already-absent/completed result without recreating ownership state, deleting another path, or failing because the worktree no longer exists

#### Scenario: Registered worktree was deleted by hand before cleanup
- **WHEN** a released registration's directory is absent and Git holds no registration for it or only its own dangling registration
- **THEN** the command SHALL verify the merge/archive evidence, retire that dangling registration, record the worktree as already absent, and delete the local topic ref whose tip equals or is an ancestor of the merged head
- **AND** SHALL mark the journal complete so later passes report it as already absent

#### Scenario: Absent path was never registered
- **WHEN** the completion command names a path that does not exist and has no registration
- **THEN** the command SHALL block with a named reason and SHALL NOT create a registration or delete any ref
