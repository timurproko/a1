# Local Worktree Cleanup Specification

## Purpose

Complete accepted OpenSpec delivery on the owning machine by safely removing explicitly released local worktrees after verified automatic archive integration, while preserving active sessions and any unverified work.

## Requirements

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

### Requirement: Destructive steps are revalidated and recoverable

Cleanup SHALL serialize mutations per repository and revalidate release state, filesystem/Git identity, HEAD, cleanliness, and live remote gates immediately before each destructive operation. Completed-delivery cleanup SHALL remove the central-policy disposable roots from the verified worktree with a bounded retrying recursive removal before journaling removal intent, then remove the worktree using non-force Git worktree removal, verify the result, and only then delete an associated unchanged, non-reserved local topic ref that is not checked out elsewhere. A disposable root that remains locked after the retry budget SHALL block before any journal transition, name the locked path, and leave the worktree, its Git pointer, and its registration intact. Local ref deletion SHALL enforce the expected old SHA atomically.

Closed-unmerged discard SHALL first complete all local preflight checks, then journal intent, reverify the PR remains closed-unmerged and the same-repository remote topic ref remains unprotected and at the expected PR head SHA, compare-and-delete that remote ref, and verify absence. Only after remote absence is durable SHALL it revalidate local identity and cleanliness, use non-force Git worktree removal, and atomically delete the unchanged local topic ref. A remote deletion followed by a local blocker SHALL be reported as partial and SHALL preserve the local worktree for a safe retry; a remote deletion failure or advanced ref SHALL NOT authorize local deletion.

Each step SHALL be journaled so a retry can distinguish already-absent resources from partial failure or path reuse. When a journaled removal intent finds its path still present, the retry SHALL either revalidate the exact registered worktree and repeat non-force Git removal, or verify residue before removing it: Git SHALL no longer treat the path as a valid worktree, the residue SHALL contain no Git pointer, link, special file, or nested repository, and every remaining regular file SHALL either lie below a declared disposable root or have the exact tracked path and blob identity of the journaled head under the repository's content filters, all within the existing entry allowances and pass deadline. Only residue verified that way MAY be removed with the bounded retrying recursive removal, after which cleanup MAY retire this candidate's own dangling Git registration whose `gitdir` resolves to the removed pointer. Residue with any unknown, changed, or boundary-violating path SHALL be retained and identified by path; residue that still cannot be removed SHALL be retained with its journal for a later pass. Cleanup SHALL NOT recursively delete a directory whose contents it has not verified, SHALL NOT run global Git worktree pruning, and SHALL NOT prune another session's or unavailable worktree's registration.

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

#### Scenario: Disposable root is locked before removal
- **WHEN** a declared disposable root cannot be removed within the retry budget because a process holds a handle inside it
- **THEN** cleanup SHALL report a blocked result naming that root
- **AND** SHALL leave the worktree, its Git pointer, and its journal step unchanged so the next pass starts from the beginning

#### Scenario: Windows file lock prevents complete removal
- **WHEN** non-force Git removal fails after journaled intent and leaves a residual directory
- **THEN** cleanup SHALL report the exact incomplete step and retain the residue for that pass
- **AND** the next pass SHALL verify the residue against the journaled head and the declared disposable roots before removing it and continuing with the remaining steps

#### Scenario: Residue contains unverifiable content
- **WHEN** a residual directory contains a file that is neither below a declared disposable root nor byte-identical to the tracked file at the journaled head, or contains a Git pointer, link, special file, or nested repository
- **THEN** cleanup SHALL retain the residue and identify the offending paths for manual review

#### Scenario: Residue is still locked
- **WHEN** verified residue cannot be removed within the retry budget
- **THEN** cleanup SHALL report partial completion, keep the journal at removal intent, and retry on a later pass

#### Scenario: Git removal aborted before dismantling the worktree
- **WHEN** a journaled removal intent finds the exact registered worktree still valid
- **THEN** the next pass SHALL revalidate its content and repeat non-force Git removal

#### Scenario: Retry after interruption
- **WHEN** a prior run completed one or more verified destructive steps but stopped before finishing the remaining discard or completed-delivery steps
- **THEN** the next invocation of the same exact operation SHALL verify its journal and current identities before completing only the remaining safe steps

#### Scenario: Path is reused after removal
- **WHEN** a new directory or worktree occupies a previously removed path, or a valid worktree with a different identity occupies a path whose removal was journaled
- **THEN** a retry SHALL preserve the replacement and require a new explicit registration

### Requirement: Cleanup results are auditable without leaking credentials

Each preview or execution SHALL report per-candidate disposition and reason, relevant PR/head/archive identities, remote-ref observations, local safety blockers, completed steps, and incomplete coverage. Execution evidence SHALL remain local outside removable worktrees, with bounded retention. Reports SHALL distinguish eligible, pending, blocked, unmanaged, removed, already-absent, partial, and deferred results; they SHALL NOT claim removal from PR state or command exit alone. Credentials and file contents SHALL NOT appear in reports or be published to GitHub.

#### Scenario: Mixed candidate outcomes
- **WHEN** one registered worktree is removed while another is dirty or active
- **THEN** the report SHALL separately identify the actual removal and each retained candidate's reason

#### Scenario: Authentication fails
- **WHEN** remote evidence requests fail due to missing or expired authentication
- **THEN** cleanup SHALL retain candidates and report a bounded diagnostic without token values or raw credential-bearing responses

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

### Requirement: Repository-generated worktree content has one central disposal policy
The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, the repository's ignored `.artifacts` root that holds OpenSpec finalization reports, validation reports, packed candidates, and agent-written logs, and the native Cargo outputs at `native/process-guardian/target` and `native/terminal-host/target`. The standard completion command SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, contains no nested repository/link/special-file boundary, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, or policy-mismatched content SHALL remain blocking.

After those boundaries pass, cleanup SHALL remove the declared disposable roots itself with a bounded retrying recursive removal before handing the worktree to non-force Git removal, so Git only deletes tracked repository content. That removal SHALL be limited to the exact declared roots of the verified worktree and SHALL NOT extend to sibling paths, undeclared ignored content, or the worktree itself.

The artifact policy entry SHALL authorize the exact `.artifacts` root and its descendants; earlier registrations naming `.artifacts/openspec-archive` or `.artifacts/validation` SHALL remain valid and SHALL be widened to the root by the standard completion command. Native build policy entries SHALL authorize only the two exact repository-owned Cargo `target` roots and descendants. They SHALL NOT authorize near-match names such as `.artifacts-user` or `artifacts`, arbitrary `target` directories, or sibling native projects. All approved generated output SHALL remain subject to the existing dedicated generated-content allowance, operation deadline, and structural boundary checks.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/`, `.artifacts/openspec-archive/`, `.artifacts/validation/`, or an agent's `.artifacts/run.log`
- **THEN** cleanup SHALL classify that content as disposable, remove those roots with the bounded retrying removal, and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Exact native build outputs remain
- **WHEN** an otherwise eligible worktree contains ignored generated content only below `native/process-guardian/target` or `native/terminal-host/target`
- **THEN** cleanup SHALL inspect those exact roots under the dedicated generated-content allowance, remove them with the bounded retrying removal, and complete normal non-force worktree removal

#### Scenario: Native build policy remains exact
- **WHEN** ignored content exists under another `target` directory, a sibling native project, or a near-match of an approved native root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening native build authority

#### Scenario: Validation-report policy remains exact
- **WHEN** ignored content exists at `.artifacts-user`, `artifacts`, or another near match outside the exact `.artifacts` root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening artifact authority

#### Scenario: Artifact root crosses a protected boundary
- **WHEN** the `.artifacts` root contains a link, special file, or nested Git metadata
- **THEN** cleanup SHALL retain the worktree under the existing content-boundary blocker

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary

### Requirement: Generated-content inspection has a dedicated bounded allowance
When cleanup inspects a candidate containing repository-policy-approved generated roots, it SHALL account for those roots separately from ordinary repository content so a normal generated dependency tree does not consume the ordinary content allowance and defer an otherwise eligible cleanup.

Both ordinary and generated-content inspection SHALL remain explicitly bounded by entry counts and the operation deadline. Every visited generated entry SHALL retain the existing nested-repository, link, and special-file checks; recognizing a generated root SHALL NOT authorize skipping those checks or accepting content outside the central disposal policy.

#### Scenario: Generated dependencies exceed the ordinary allowance
- **WHEN** an otherwise eligible completed worktree contains an ignored policy-approved dependency tree that exceeds the ordinary content entry allowance but remains within the generated-content allowance and deadline
- **THEN** cleanup SHALL inspect the generated tree and proceed to normal non-force removal
- **AND** it SHALL NOT defer solely because the generated tree exceeded the ordinary allowance

#### Scenario: Generated-content allowance is exhausted
- **WHEN** policy-approved generated content exceeds its dedicated entry allowance or the operation deadline
- **THEN** cleanup SHALL retain the worktree and report a deferred inspection-budget result

#### Scenario: Generated content crosses a protected boundary
- **WHEN** a policy-approved generated root contains nested Git metadata, a link, or a special file
- **THEN** cleanup SHALL retain the worktree under the existing content-boundary blocker regardless of the remaining generated-content allowance

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

### Requirement: Hand-off parks the worktree for post-merge cleanup
The repository SHALL provide one explicit hand-off command that accepts the primary repository, exact worktree path, OpenSpec change, and pull-request identity. It SHALL register the exact worktree when no registration exists or reclaim the existing one, record the current HEAD and branch attachment, apply the repository-owned disposable policy, and release the registration to local cleanup. It SHALL NOT evaluate, delete, enable the persistent queue, or start a process. The delivering agent SHALL invoke it from the primary checkout when it hands the validated candidate to the maintainer and again after any repair push. That release SHALL be the candidate-scoped completed-delivery cleanup authorization for the exact worktree and its topic ref, exercised only after the merge, archive, validation, and remote-ref gates later verify; it SHALL NOT confer discard authority for a later closed-unmerged pull request.

Hand-off SHALL be idempotent for its exact worktree: a repeated invocation SHALL update the recorded head and release again rather than create a second registration. Tracked, staged, unstaged, or untracked content outside the central disposable policy SHALL block hand-off with the affected paths and leave the registration owned; a primary, foreign, or identity-changed path SHALL block with a named reason. A registration still owned by a low-level registration SHALL be released by hand-off or by the exact-candidate completed-delivery command only when the invoking session presents that registration's owner token; any other invocation SHALL block with `owned-worktree`.

#### Scenario: Agent hands off a validated candidate
- **WHEN** the owning agent invokes hand-off for the pushed, clean worktree of a ready pull request
- **THEN** the command SHALL register or reclaim that exact worktree, record its head and branch, and release it
- **AND** SHALL leave the worktree, its branch, the remote, and queue enablement untouched

#### Scenario: Hand-off is repeated after a repair push
- **WHEN** the owner reclaims a handed-off worktree, pushes a repair, and invokes hand-off again
- **THEN** the same registration SHALL record the new head and be released again without a duplicate entry

#### Scenario: Owner hands off its own low-level registration
- **WHEN** the worktree is registered and still owned and the invoking session presents the matching owner token
- **THEN** hand-off (or the exact-candidate completed-delivery command) SHALL release that registration itself without a separate release step
- **AND** a missing or mismatched token SHALL block with `owned-worktree` and leave the registration owned

#### Scenario: Hand-off finds unpushed content
- **WHEN** the worktree holds tracked, staged, unstaged, or untracked content outside the central disposable policy
- **THEN** hand-off SHALL block, name the affected paths, and SHALL NOT release the registration

#### Scenario: Handed-off pull request later closes without merge
- **WHEN** a handed-off candidate's pull request is closed unmerged
- **THEN** the release SHALL grant no discard authority and the worktree and refs SHALL remain until the explicit exact-candidate discard

### Requirement: Released merged deliveries are swept without per-candidate commands
The repository SHALL provide one explicit sweep operation, invoked from the primary checkout, that evaluates every released registration bound to this repository in one bounded pass and completes each candidate whose implementation pull request is verified merged, using exactly the completed-delivery evidence, remote-ref, identity, content, ownership, journaling, non-force removal, and compare-and-delete safeguards of the exact-candidate operation. The sweep SHALL NOT require queue enablement, SHALL NOT start a persistent process, SHALL NOT adopt unregistered worktrees, SHALL NOT discard closed-unmerged candidates, and SHALL leave no broad authority enabled after it exits. A disabled queue SHALL NOT prevent a sweep, but a stop sentinel written while a sweep runs SHALL stop it before its next destructive step.

Candidates whose pull request is open or whose evidence is still pending SHALL be reported `pending` and left untouched; candidates whose pull request closed without merge SHALL be reported `awaiting-discard` and left untouched; blocked candidates SHALL report their exact reason. The sweep SHALL apply the same candidate, remote-request, and subprocess limits as a queue pass and a fixed elapsed-time limit, report incomplete coverage, resume from a durable cursor on the next invocation, and yield `deferred` rather than wait when another session holds the mutation lock. Its report SHALL give one line per candidate suitable for relaying to the maintainer.

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

### Requirement: A dead holder's mutation lock is evicted only on proof
The per-repository mutation lock SHALL record its holder's process identity and a heartbeat that the holder refreshes while it runs. A later operation that finds the lock present SHALL evict it only when the heartbeat (or, for a lock without one, the file's modification time) is older than a fixed silence threshold of at least two minutes and the recorded process no longer exists; a process that exists, cannot be probed, or is the caller itself SHALL keep the lock. Eviction SHALL be journaled beside the state with the evicted record and the evicting process, SHALL happen at most once per acquisition attempt, and SHALL NOT release ownership, advance any journal step, or delete anything else. A lock that is fresh, unreadable but fresh, or held by a live process SHALL still report `mutation-busy`.

#### Scenario: Holder was killed before releasing the lock
- **WHEN** a cleanup process is terminated without reaching its release and no heartbeat has been written for longer than the threshold
- **THEN** the next mutation SHALL journal and evict that lock, acquire its own, and proceed under the ordinary safeguards

#### Scenario: Holder is slow but alive
- **WHEN** the recorded process still exists, however old the heartbeat
- **THEN** the lock SHALL be kept and the operation SHALL report `mutation-busy`

#### Scenario: Lock is fresh or unreadable
- **WHEN** the heartbeat or modification time is within the threshold, or the record cannot be parsed but the file is fresh
- **THEN** the lock SHALL be kept and the operation SHALL report `mutation-busy`

### Requirement: Registrations with nothing left to remove are retired
When a released registration's ordinary evidence is not eligible, the sweep and the exact-candidate completed-delivery command SHALL check locally whether anything remains for cleanup to delete: the registered path SHALL be absent, Git SHALL hold no registration for that path or only the candidate's own dangling registration whose `gitdir` names the removed pointer, and the exact local topic ref SHALL be absent. Only when all three hold SHALL cleanup confirm through a bounded remote read that the candidate's pull request is merged into `develop` in this repository, retire the dangling Git registration if present, and mark the journal complete with `retired-nothing-left` and the reason the ordinary evidence gave. Retirement SHALL delete no worktree, ref, or remote ref, SHALL exercise no authority beyond the owner's release, and SHALL leave an entry untouched and ordinarily blocked when any of the path, Git registration, or local ref still exists or when the pull request is not merged. Retired entries SHALL NOT be re-evaluated by later passes.

#### Scenario: Evidence is permanently unverifiable but nothing remains
- **WHEN** a released entry's path and local topic ref are absent, Git holds no live row for it, and its pull request is merged into `develop`
- **THEN** the sweep SHALL retire the entry with `retired-nothing-left` and the original evidence reason, and the next sweep SHALL NOT evaluate it

#### Scenario: Ref still exists
- **WHEN** the path is absent but the local topic ref still exists
- **THEN** cleanup SHALL keep the entry blocked with its evidence reason and SHALL NOT delete the ref

#### Scenario: Pull request is not merged
- **WHEN** everything local is absent but the pull request is open or closed unmerged
- **THEN** cleanup SHALL NOT retire the entry and SHALL report `pending` or `awaiting-discard` as before

### Requirement: Forgetting a dead registration is explicit and non-destructive
The repository SHALL provide one explicit `forget` operation that accepts a registration identity and a nothing-left confirmation flag. Under the mutation lock it SHALL require a released entry whose path is absent, whose Git registration is absent or only its own dangling row, and whose local topic ref is absent, and SHALL then mark the journal complete with `forgotten`. It SHALL read nothing from GitHub, SHALL delete nothing, SHALL refuse without the flag, and SHALL refuse an owned or deleting entry or any entry with a present path, live Git row, or ref.

#### Scenario: Maintainer forgets a rejected candidate removed by hand
- **WHEN** the maintainer invokes `forget` with the confirmation for a released entry whose worktree, Git row, and local ref are all absent
- **THEN** the entry SHALL be recorded `forgotten` and SHALL NOT appear in later sweeps

#### Scenario: Something still exists
- **WHEN** the entry's path, a live Git row, or its local ref still exists, or the entry is owned or deleting
- **THEN** `forget` SHALL refuse with a named reason and change nothing
