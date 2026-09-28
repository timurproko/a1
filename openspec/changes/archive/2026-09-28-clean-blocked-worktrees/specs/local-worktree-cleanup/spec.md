## ADDED Requirements

### Requirement: Redundant unmanaged worktree retirement is exact and explicitly confirmed

The repository SHALL provide one explicit `retire-redundant` operation accepting the primary repository, one exact worktree path, and an explicit redundant-retirement confirmation. It SHALL act only on an unregistered, unlocked, non-current Git worktree beneath the canonical approved worktree root whose attached branch is a normal unprotected topic ref, has no same-repository pull request in any state, has no live remote ref, and points to a commit equal to or ancestral to freshly fetched `origin/develop`. It SHALL reject detached, primary, current, nested, registered, owned, locked, reserved, replaced, ambiguous, dirty, hidden-index, submodule, nested-repository, remote-backed, pull-request-backed, and locally unique candidates.

The operation SHALL capture and journal the exact filesystem, path, HEAD, and ref identities under the repository mutation lock, apply the central generated-content policy, and revalidate identity, cleanliness, pull-request absence, remote-ref absence, and target ancestry immediately before mutation. It SHALL purge approved generated content through the bounded cleanup path, remove the worktree using non-force Git worktree removal, and compare-and-delete only the unchanged local ref. A partial operation SHALL remain journaled for exact confirmed retry; a repeated completed invocation SHALL report already retired. The operation SHALL never delete a remote ref, enable queue/watch, authorize sweep adoption, or evaluate another worktree.

#### Scenario: Maintainer retires one redundant no-PR checkout
- **WHEN** the exact confirmed worktree is clean and unregistered, its normal topic branch has no pull request or remote ref, and its tip is contained by fresh `origin/develop`
- **THEN** cleanup SHALL journal and non-forcibly remove that worktree and compare-and-delete its unchanged local ref
- **AND** SHALL report the exact completed steps without granting authority over any other unmanaged path

#### Scenario: Candidate carries unique or unpublished work
- **WHEN** the branch tip is not contained by fresh `origin/develop`, the remote ref exists, any pull request names the branch, or local content is not clean and approved
- **THEN** cleanup SHALL retain the worktree and ref with a named blocker
- **AND** SHALL NOT reinterpret age, naming, or maintainer cleanup intent as evidence that the work is redundant

#### Scenario: Candidate is active or already governed
- **WHEN** the path is current, locked, registered, owned, deleting, primary, detached, reserved, replaced, or otherwise identity-ambiguous
- **THEN** cleanup SHALL retain it and require its existing ownership or delivery procedure

#### Scenario: Retirement is interrupted
- **WHEN** an exact confirmed retirement stops after a journaled destructive step
- **THEN** a repeated exact confirmed invocation SHALL revalidate the journal and current identities before completing only the remaining safe steps

#### Scenario: Sweep observes an otherwise redundant unmanaged checkout
- **WHEN** preview, sweep, queue, or watch encounters a non-empty unregistered checkout without an exact `retire-redundant` invocation
- **THEN** it SHALL remain unmanaged and untouched

## MODIFIED Requirements

### Requirement: Automatic authority is explicitly registered and released

Cleanup SHALL act automatically only on locally registered paths bound to the Git common directory, repository identity, OpenSpec change, associated PR, worktree role, expected HEAD, and any exact local topic ref. Registration SHALL NOT itself authorize deletion. The owning delivery session SHALL explicitly release the candidate to the local cleanup service after stopping its use; a resumed session SHALL acquire ownership before touching it. Claim, release, and cleanup SHALL be mutually exclusive. Active, unknown-owner, stale-owner, and Git-locked worktrees SHALL remain protected; process disappearance or elapsed time alone SHALL NOT release ownership.

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

### Requirement: Local identity and content checks fail closed

A registered candidate SHALL remain a worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered branch attachment. For a completed-delivery candidate the registered head and the live HEAD SHALL each equal or be an ancestor of the associated merged PR head, or of a separately registered acceptance checkout's verified merge commit, so that every reachable commit was accepted; a HEAD holding any commit outside that merged head SHALL block. An explicitly confirmed redundant candidate SHALL instead satisfy its exact fresh-`origin/develop`, no-PR, no-remote, and unregistered identity gates. Mere ancestry, age, naming similarity, or closed state alone SHALL NOT authorize deletion. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions of the worktree path, and ambiguous identities SHALL be excluded.

Immediately before removal, cleanup SHALL verify staged, unstaged, and all untracked content, actual nested repositories, registered gitlinks/submodules, and submodule changes. Staged, unstaged, untracked, unknown ignored, special, nested-repository, or submodule content SHALL block removal. Links SHALL block except for descendant links admitted and revalidated by the exact generated-content containment requirement. Repository-owned generated paths covered by the central disposal policy MAY be removed only after their ignored/path/type boundaries pass. A tracked regular `.gitmodules` file by itself SHALL be treated as repository content, not proof of a nested repository; actual nested `.git` metadata, gitlink index entries, configured submodules, and submodule state SHALL remain blockers. Cleanup SHALL offer no local force option and SHALL NOT infer that arbitrary ignored content is disposable.

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
- **WHEN** a link is the disposable root, resolves outside its exact root, cannot be resolved safely, changes identity or target, forms an unsafe cycle, or hides a protected boundary
- **THEN** cleanup SHALL block before journaled worktree removal

### Requirement: Repository-generated worktree content has one central disposal policy

The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, the repository's ignored `.artifacts` root that holds OpenSpec finalization reports, validation reports, packed candidates, and agent-written logs, and the native Cargo outputs at `native/process-guardian/target` and `native/terminal-host/target`. Standard completed-delivery and redundant-retirement commands SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, policy-mismatched, nested-repository, or special content SHALL remain blocking.

A disposable root itself SHALL remain a non-link regular file or directory. A descendant symbolic link or junction MAY be admitted only when its canonical target remains below the same exact disposable root, its target's ordinary in-root path receives the normal bounded inspection, and its exact path, filesystem identity, and resolved target are recorded for immediate pre-purge revalidation. Cleanup SHALL remove the link entry itself without traversal before recursively removing the root. A target escape, target/identity drift, unsafe cycle, nested Git boundary, or removal failure SHALL block before journaled worktree removal.

After those boundaries pass, cleanup SHALL remove the declared disposable roots itself with a bounded retrying removal before handing the worktree to non-force Git removal, so Git only deletes tracked repository content. That removal SHALL be limited to the exact declared roots of the verified worktree and SHALL NOT extend to sibling paths, undeclared ignored content, link targets outside the root, or the worktree itself.

The artifact policy entry SHALL authorize the exact `.artifacts` root and its descendants; earlier registrations naming `.artifacts/openspec-archive` or `.artifacts/validation` SHALL remain valid and SHALL be widened to the root by the standard completion command. Native build policy entries SHALL authorize only the two exact repository-owned Cargo `target` roots and descendants. They SHALL NOT authorize near-match names such as `.artifacts-user` or `artifacts`, arbitrary `target` directories, or sibling native projects. All approved generated output SHALL remain subject to the dedicated generated-content allowance, operation deadline, and structural boundary checks.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/`, `.artifacts/openspec-archive/`, `.artifacts/validation/`, or an agent's `.artifacts/run.log`
- **THEN** cleanup SHALL classify that content as disposable, remove those roots with bounded retrying removal, and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Exact native build outputs remain
- **WHEN** an otherwise eligible worktree contains ignored generated content only below `native/process-guardian/target` or `native/terminal-host/target`
- **THEN** cleanup SHALL inspect those exact roots under the dedicated generated-content allowance, remove them with bounded retrying removal, and complete normal non-force worktree removal

#### Scenario: Native build policy remains exact
- **WHEN** ignored content exists under another `target` directory, a sibling native project, or a near-match of an approved native root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening native build authority

#### Scenario: Validation-report policy remains exact
- **WHEN** ignored content exists at `.artifacts-user`, `artifacts`, or another near match outside the exact `.artifacts` root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening artifact authority

#### Scenario: Artifact root has an internally contained generated link
- **WHEN** a descendant junction or symbolic link resolves within the exact `.artifacts` root and every target and revalidation boundary passes
- **THEN** cleanup SHALL unlink that entry without traversal and remove the normally inspected generated root

#### Scenario: Artifact root crosses a protected boundary
- **WHEN** the `.artifacts` root is a link, contains a link that escapes or drifts, contains a special file, or contains nested Git metadata
- **THEN** cleanup SHALL retain the worktree under a named content-boundary blocker

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary

### Requirement: Generated-content inspection has a dedicated bounded allowance

When cleanup inspects a candidate containing repository-policy-approved generated roots, it SHALL account for those roots separately from ordinary repository content so a normal generated dependency tree does not consume the ordinary content allowance and defer an otherwise eligible cleanup.

Both ordinary and generated-content inspection SHALL remain explicitly bounded by entry counts and the operation deadline. Every visited generated regular entry SHALL retain nested-repository and special-file checks. A contained link SHALL consume generated allowance, SHALL NOT be traversed through its link path, and SHALL be admitted only through the exact same-root containment and revalidation rule. Recognizing a generated root SHALL NOT authorize skipping target inspection or accepting content outside the central disposal policy.

#### Scenario: Generated dependencies exceed the ordinary allowance
- **WHEN** an otherwise eligible completed worktree contains an ignored policy-approved dependency tree that exceeds the ordinary content entry allowance but remains within the generated-content allowance and deadline
- **THEN** cleanup SHALL inspect the generated tree and proceed to normal non-force removal
- **AND** it SHALL NOT defer solely because the generated tree exceeded the ordinary allowance

#### Scenario: Generated-content allowance is exhausted
- **WHEN** policy-approved generated content exceeds its dedicated entry allowance or the operation deadline
- **THEN** cleanup SHALL retain the worktree and report a deferred inspection-budget result

#### Scenario: Contained link consumes bounded generated inspection
- **WHEN** a generated descendant link and its same-root target fit within the generated-content allowance and all containment checks pass
- **THEN** cleanup SHALL record the link evidence without traversing it and continue inspection of the target's ordinary in-root path

#### Scenario: Generated content crosses a protected boundary
- **WHEN** a policy-approved root contains nested Git metadata, a special file, or a link that is root-level, escaping, unresolved, cyclic, or changed
- **THEN** cleanup SHALL retain the worktree under the applicable content-boundary blocker regardless of the remaining generated-content allowance
