## MODIFIED Requirements

### Requirement: Closed-unmerged cleanup is one standardized discard operation
The repository SHALL provide one explicit `discard` operation accepting the primary repository, either an exact worktree path or an exact topic branch, OpenSpec change, and pull-request identity plus an explicit closed-unmerged confirmation. Path and branch selectors SHALL be mutually exclusive. It SHALL require a closed, unmerged, non-draft-or-draft same-repository PR targeting `develop`, bind the exact PR head and topic branch to the selected candidate, and refuse open, merged, forked, reserved, protected, advanced, active, ambiguous, or unverifiable candidates. Path mode SHALL retain registered worktree identity and central generated-content checks.

Branch-only mode SHALL require no Git worktree to have the branch checked out, no live cleanup registration for that ref, no other open same-repository PR using the branch, and every present local or remote ref to equal the named PR's head. It SHALL use an explicit branch-scoped journal identity rather than fabricate a directory identity or recreate a checkout. Branch-only mode SHALL NOT remove files, directories, worktrees, or another candidate's registration.

The operation SHALL own remote exact-ref deletion and unchanged local-ref deletion as one bounded resumable procedure; path mode SHALL additionally own journaled non-force worktree removal. It SHALL revalidate local selection and live closed-unmerged authority under the shared ref-scoped lock before each destructive step, enforce the expected remote SHA, and verify remote absence before deleting the unchanged local ref. It SHALL preserve existing worktree journals, be deterministic and idempotent for the exact candidate, leave queue/watch authority unchanged, and report discarded, already-discarded, blocked, or partial outcomes. Closing a PR, implementation approval, elapsed time, branch naming, or worktree age alone SHALL NOT invoke or authorize discard. A completed invocation SHALL NOT acquire authority over recreated refs.

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

#### Scenario: Closed-unmerged branch has no checkout
- **WHEN** the maintainer explicitly selects one closed-unmerged PR's exact topic branch, no worktree or live registration uses it, and every present local or remote ref equals that PR head
- **THEN** branch-only discard SHALL remove only those exact refs under expected-head enforcement without creating or removing a checkout

#### Scenario: Branch-only candidate is in use or has advanced
- **WHEN** the selected branch is checked out, has a live registration or another open PR, is protected or reserved, or any present ref differs from the expected PR head
- **THEN** cleanup SHALL retain its remaining resources and report the exact blocker

#### Scenario: Remote deletion succeeded before interruption
- **WHEN** branch-only discard resumes its exact journal after expected-head remote deletion and the local ref still equals the recorded PR head
- **THEN** it SHALL revalidate the closed-unmerged PR, branch non-use, and remote absence before compare-and-deleting the local ref

#### Scenario: Completed branch discard is presented recreated refs
- **WHEN** a completed branch-only discard is invoked again after either ref has been recreated
- **THEN** cleanup SHALL preserve the recreated refs and report identity reuse rather than delete them

## ADDED Requirements

### Requirement: External disposable links have explicit target-preserving remediation
The repository SHALL provide an exact-candidate `unlink-disposable-link` operation accepting the primary repository, exact worktree path, change, PR, relative link path, and explicit link-only confirmation. It SHALL require an existing released registration, matching worktree identity and accepted head ancestry, ordinary eligible merged-delivery evidence, absent remote topic ref, no conflicting editing or cleanup ownership, and normal local content checks except for the one explicitly named link. It SHALL share candidate path/ref resource locks with ordinary cleanup and SHALL NOT enable queue/watch or acquire authority over other links or candidates.

The selected path SHALL be an ignored untracked symlink or junction strictly below an exact central-policy disposable root, reached through unchanged real non-link parent directories inside the verified canonical worktree. Absolute paths, lexical escapes, root substitutions, unapproved roots, ordinary files or directories, cycles, Git-metadata targets, unrelated unsafe links, unknown ignored content, dirty candidates, and unresolved or ambiguous identities SHALL block mutation. Ordinary automatic cleanup and purge SHALL continue to refuse external descendant links.

The operation SHALL record and immediately revalidate the exact lexical path, link filesystem identity, canonical target, and real ancestor identities before bounded non-recursive link-only removal. It SHALL NOT traverse, enumerate, recursively remove, or mutate the link target, and SHALL preserve the worktree and its released cleanup authority for a subsequent ordinary completion. Failure, replacement, drift, lock contention, or an exhausted budget SHALL retain remaining resources and report a named blocker. Reports SHALL identify the exact candidate and link without exposing target contents. A fresh completion or sweep SHALL repeat all ordinary evidence and content gates before removing the worktree.

#### Scenario: Explicitly remove one shared dependency link
- **WHEN** a released eligible merged worktree contains the explicitly named ignored `.artifacts/agent/shared-node-modules` link to another generated dependency directory and every identity/content gate passes
- **THEN** the command SHALL remove only that link entry, preserve the external target byte-for-byte, and leave worktree removal to ordinary cleanup

#### Scenario: Default sweep sees the same external link
- **WHEN** ordinary sweep or completion encounters an external descendant link without explicit link-only remediation
- **THEN** cleanup SHALL retain the worktree under its existing content-link blocker

#### Scenario: Link or ancestor changes before unlink
- **WHEN** the selected link, a real lexical ancestor, its target, or the registered worktree identity changes between inspection and deletion
- **THEN** remediation SHALL retain the current entry and target and report identity drift

#### Scenario: Caller names an unsafe or ordinary path
- **WHEN** the caller supplies an absolute/escaping path, a disposable root itself, a path through another symlink, an ordinary file or directory, or a path outside the central generated-content policy
- **THEN** remediation SHALL remove nothing and report the unsafe selection

#### Scenario: Candidate is dirty or owned elsewhere
- **WHEN** the worktree contains unrelated local content or another unsafe link, remains owned by another editor/cleanup registration, is current, or lacks eligible merged delivery evidence
- **THEN** remediation SHALL remove nothing and preserve every candidate's ownership and content

#### Scenario: Non-recursive unlink is blocked
- **WHEN** the selected symlink or junction cannot be removed within its bounded retry budget
- **THEN** remediation SHALL report the locked-link blocker and preserve the target, worktree, and ordinary cleanup journal
