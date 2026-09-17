## MODIFIED Requirements

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

### Requirement: Repository-generated worktree content has one central disposal policy
The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, OpenSpec finalization reports, repository validation reports under `.artifacts/validation`, and the native Cargo outputs at `native/process-guardian/target` and `native/terminal-host/target`. The standard completion command SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, contains no nested repository/link/special-file boundary, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, or policy-mismatched content SHALL remain blocking.

After those boundaries pass, cleanup SHALL remove the declared disposable roots itself with a bounded retrying recursive removal before handing the worktree to non-force Git removal, so Git only deletes tracked repository content. That removal SHALL be limited to the exact declared roots of the verified worktree and SHALL NOT extend to sibling paths, undeclared ignored content, or the worktree itself.

The validation-report policy entry SHALL authorize only the exact `.artifacts/validation` root and descendants. Native build policy entries SHALL authorize only the two exact repository-owned Cargo `target` roots and descendants. They SHALL NOT authorize the `.artifacts` parent, sibling artifact directories, arbitrary `target` directories, sibling native projects, or near-match names. All approved native output SHALL remain subject to the existing dedicated generated-content allowance, operation deadline, and structural boundary checks.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/`, `.artifacts/openspec-archive/`, or `.artifacts/validation/`
- **THEN** cleanup SHALL classify that content as disposable, remove those roots with the bounded retrying removal, and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Exact native build outputs remain
- **WHEN** an otherwise eligible worktree contains ignored generated content only below `native/process-guardian/target` or `native/terminal-host/target`
- **THEN** cleanup SHALL inspect those exact roots under the dedicated generated-content allowance, remove them with the bounded retrying removal, and complete normal non-force worktree removal

#### Scenario: Native build policy remains exact
- **WHEN** ignored content exists under another `target` directory, a sibling native project, or a near-match of an approved native root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening native build authority

#### Scenario: Validation-report policy remains exact
- **WHEN** ignored content exists at `.artifacts/validation-user`, `.artifacts/other`, or another path outside the exact `.artifacts/validation` root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening validation-report authority

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary
