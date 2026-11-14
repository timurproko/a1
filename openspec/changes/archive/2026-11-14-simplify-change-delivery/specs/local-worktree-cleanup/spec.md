## MODIFIED Requirements

### Requirement: Automatic authority is explicitly registered and released

Cleanup SHALL act automatically only on locally registered paths bound to the Git common directory, repository identity, candidate label, associated PR, worktree role, expected HEAD, and any exact local topic ref. For implementation-bound delivery the candidate label SHALL remain the OpenSpec change identity. For standalone documentation it SHALL be an audit label only and remote eligibility SHALL come exclusively from the complete trusted documentation evidence, never from that caller-selected label. Registration SHALL NOT itself authorize deletion. The owning delivery session SHALL explicitly release the candidate to the local cleanup service after stopping its use; a resumed session SHALL acquire ownership before touching it. Claim, release, and cleanup SHALL be mutually exclusive. Active, unknown-owner, stale-owner, and Git-locked worktrees SHALL remain protected; process disappearance or elapsed time alone SHALL NOT release ownership.

The separately requested local-only operation MAY bind one exact registered Git checkout under its publication/preservation contract without automatic adoption authority. Outside that explicit operation, the only unregistered paths cleanup MAY remove are (a) an empty directory tree directly under the approved worktree root through the existing empty-directory requirement, and (b) one exact Git worktree through an explicitly confirmed `retire-redundant` invocation satisfying the redundant-retirement requirement. The latter is candidate-scoped maintainer authority, SHALL NOT be exercised by automatic sweep/queue/watch, and SHALL NOT create general adoption authority.

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

### Requirement: Local identity and content checks fail closed

A registered candidate SHALL remain a worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered branch attachment. For a completed-delivery candidate the registered head and the live HEAD SHALL each equal or be an ancestor of the associated merged PR head, or of a separately registered acceptance checkout's verified merge commit, so that every reachable commit was accepted; a HEAD holding any commit outside that merged head SHALL block. An explicitly confirmed redundant candidate SHALL instead satisfy its exact fresh-`origin/develop`, no-PR, no-remote, and unregistered identity gates. Explicit local-only removal SHALL instead require fresh containment of local HEAD in the named remote branch and preserve remote/local refs by default. Mere ancestry, age, naming similarity, or closed state alone SHALL NOT authorize deletion. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions of the worktree path, and ambiguous identities SHALL be excluded.

Immediately before removal, cleanup SHALL verify staged, unstaged, and all untracked content, actual nested repositories, registered gitlinks/submodules, and submodule changes. Staged, unstaged, untracked, unknown ignored, special, nested-repository, or submodule content SHALL block removal. Links SHALL block except for exact disposable-root links and descendant links admitted and revalidated by the generated-content requirement. Repository-owned generated paths covered by the central disposal policy MAY be removed only after their ignored/path/type boundaries pass. A tracked regular `.gitmodules` file by itself SHALL be treated as repository content, not proof of a nested repository; actual nested `.git` metadata, gitlink index entries, configured submodules, and submodule state SHALL remain blockers. Cleanup SHALL offer no local force option and SHALL NOT infer that arbitrary ignored content is disposable.

#### Scenario: Dirty worktree has a merged lifecycle
- **WHEN** an otherwise eligible completed, discarded, or redundant candidate contains staged, unstaged, or untracked files
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
- **THEN** cleanup SHALL refuse deletion outside the original exact worktree

#### Scenario: Primary or executing worktree is presented
- **WHEN** a candidate path is the primary worktree or contains the cleanup process's current working directory
- **THEN** cleanup SHALL refuse its removal regardless of merge or ancestry state

#### Scenario: Generated descendant link remains internally contained
- **WHEN** a link below an exact disposable root resolves canonically inside that same root and retains its inspected identity through purge
- **THEN** cleanup MAY remove the link entry without traversing it and continue bounded disposal

#### Scenario: Generated link escapes or changes
- **WHEN** a link is outside an exact disposable root, a descendant link resolves outside its exact root, an exact root link cannot be resolved safely, any admitted link changes identity or target, forms an unsafe cycle, hides a protected boundary, or cannot be removed
- **THEN** cleanup SHALL block before journaled worktree removal

### Requirement: Cleanup is local, opt-in, bounded, and resumable
The repository SHALL provide a separate exact published local-only removal operation and read-only preview, one explicit hand-off operation, one explicit exact-candidate completed-delivery operation, one explicit released-candidate sweep, one explicit exact-candidate closed-unmerged discard operation, and separately enabled local queue execution with both one-pass and watch modes. Invoking an exact-candidate operation SHALL authorize only its named candidate; invoking the sweep SHALL exercise only the authority each released registration's hand-off or exact-candidate release already granted; neither SHALL enable or scan the persistent queue. The discard operation SHALL additionally require an explicit closed-unmerged discard confirmation on every invocation. Delivery guidance SHALL use hand-off at maintainer hand-off, an optional separately scoped sweep rather than a prerequisite for planning or session start, completed-delivery cleanup for an exact integrated candidate, and discard only after a maintainer explicitly rejects the exact unmerged candidate; low-level registration/release and queue/watch modes SHALL remain available for diagnostics, pending legacy delivery, and separately authorized background reconciliation.

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

## ADDED Requirements

### Requirement: Published local removal is independent of delivery acceptance

An explicit request SHALL permit removing one exact owned non-primary checkout whose HEAD is freshly verified equal to or ancestral to its named live remote branch. Open/draft PR, pending CI, unfinished implementation, absent acceptance/archive and present remote ref SHALL not block this route. Dirty, unpublished/divergent, unknown-ignored, nested/submodule/private/KEEP, unsafe-link, locked or unverifiably owned candidates SHALL remain. Reuse scoped locks, bounded inspection, rechecks, approved disposables and journaled non-force removal. Preserve remote refs/PRs and local branches by default. The operation SHALL not enable sweeps, terminate processes, discard remote work or declare acceptance. Ref deletion requires separate explicit scope.

#### Scenario: Continue on another machine
- **WHEN** commits are published and preservation checks pass for the requested checkout
- **THEN** local removal SHALL succeed with an open PR
- **AND** remote work and the local branch SHALL remain

#### Scenario: Remote advanced safely
- **WHEN** the live remote tip contains local HEAD
- **THEN** publication SHALL be verified without identical tips

#### Scenario: Clean but unpushed
- **WHEN** commits are not remote-contained or remote evidence is unavailable
- **THEN** the checkout SHALL remain with a publication blocker

#### Scenario: Ignored data is valuable
- **WHEN** outer clean status hides unknown ignored data, nested Git, private content or KEEP
- **THEN** removal SHALL preserve it and report the blocker

#### Scenario: Local retirement is retried
- **WHEN** exact removal resumes after interruption or completion
- **THEN** only its recorded identity SHALL be reconciled without deleting retained refs or recreated resources
- **AND** sweeps SHALL distinguish local retirement from accepted delivery

### Requirement: Portable handoff distinguishes publication and ownership

Handoff SHALL identify repository, branch, change/PR, observed heads, publication verification, unfinished work and optional path. Clean status, detach or release SHALL not prove push. Remote-only handoff SHALL need no local registration. Existing cleanup handoff remains compatible and describes only its local effect; automatic cleanup enrollment is separately explicit.

#### Scenario: Detached but unpushed
- **WHEN** a claim is released with local-only commits
- **THEN** the report SHALL disclose unpublished work rather than availability elsewhere

#### Scenario: No-checkout planning handoff
- **WHEN** a draft is created remotely
- **THEN** its PR/branch/head SHALL be reported without an invented local path or cleanup claim
