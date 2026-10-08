## MODIFIED Requirements

### Requirement: Local identity and content checks fail closed

A registered candidate SHALL remain a worktree of the expected repository, resolve inside the approved `.worktrees/` root, and have exactly its registered branch attachment. For a completed-delivery candidate the registered head and the live HEAD SHALL each equal or be an ancestor of the associated merged PR head, or of a separately registered acceptance checkout's verified merge commit, so that every reachable commit was accepted; a HEAD holding any commit outside that merged head SHALL block. An explicitly confirmed redundant candidate SHALL instead satisfy its exact fresh-`origin/develop`, no-PR, no-remote, and unregistered identity gates. Mere ancestry, age, naming similarity, or closed state alone SHALL NOT authorize deletion. Primary and current working directories, protected or reserved branches, path escapes, symlink or junction substitutions of the worktree path, and ambiguous identities SHALL be excluded.

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

### Requirement: Repository-generated worktree content has one central disposal policy

The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, the repository's ignored `.artifacts` root that holds OpenSpec finalization reports, validation reports, packed candidates, and agent-written logs, and the native Cargo outputs at `native/process-guardian/target` and `native/terminal-host/target`. Standard completed-delivery and redundant-retirement commands SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the lexical path remains inside the exact worktree, is ignored, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, policy-mismatched, nested-repository, or special content SHALL remain blocking.

A symbolic link or junction MAY be admitted at the exact lexical path of a central-policy disposable root only when cleanup can resolve it, prove the link path itself is inside the verified worktree, and record its exact path, root classification, filesystem identity, and canonical target for immediate pre-purge revalidation. Cleanup SHALL NOT traverse or recursively remove that target, whether it is inside or outside the worktree; it SHALL remove only the root link entry with the bounded non-recursive link primitive before continuing. A root-link resolution failure, unsafe cycle, identity or target drift, path mismatch, or removal failure SHALL block before journaled worktree removal.

A descendant symbolic link or junction MAY be admitted only when its canonical target remains below the same exact disposable root, its target's ordinary in-root path receives the normal bounded inspection, and its exact path, filesystem identity, and resolved target are recorded for immediate pre-purge revalidation. Cleanup SHALL remove the descendant link entry itself without traversal before recursively removing the root. A descendant target escape, target/identity drift, unsafe cycle, nested Git boundary, or removal failure SHALL block before journaled worktree removal.

After those boundaries pass, cleanup SHALL remove root link entries and declared disposable roots itself before handing the worktree to non-force Git removal, so Git only deletes tracked repository content. Regular files and directories SHALL retain bounded retrying removal. Link removal SHALL remain non-recursive and bounded. Disposal SHALL be limited to the exact declared lexical roots of the verified worktree and SHALL NOT extend to sibling paths, undeclared ignored content, link targets, or the worktree itself.

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

#### Scenario: Disposable root is an external generated link
- **WHEN** an exact approved disposable root is a resolvable symbolic link or junction and its link identity and canonical target remain unchanged through pre-purge revalidation
- **THEN** cleanup SHALL remove only the link entry without traversing or mutating its target
- **AND** SHALL continue normal non-force worktree removal

#### Scenario: Artifact root has an internally contained generated link
- **WHEN** a descendant junction or symbolic link resolves within the exact `.artifacts` root and every target and revalidation boundary passes
- **THEN** cleanup SHALL unlink that entry without traversal and remove the normally inspected generated root

#### Scenario: Artifact root crosses a protected boundary
- **WHEN** the `.artifacts` root link is unresolved, cyclic, drifting, replaced, or locked, or the root contains a descendant link that escapes or drifts, a special file, or nested Git metadata
- **THEN** cleanup SHALL retain the worktree under a named content-boundary blocker

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary
