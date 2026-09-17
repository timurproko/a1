## MODIFIED Requirements

### Requirement: Completed delivery cleanup is one standardized operation
The repository SHALL provide one explicit completed-delivery cleanup command that accepts the primary repository, exact worktree path, OpenSpec change, and source/candidate pull-request identity. The command SHALL own the bounded local procedure: capture and register the exact worktree when the invocation creates a new registration, apply the repository-owned disposable policy, release that registration, verify merged/archive/validation and remote-ref evidence, evaluate only the requested candidate for removal, and leave no broad cleanup authority enabled after it exits. Invoking this command after verified merge SHALL be the explicit cleanup authorization; implementation approval or merge observation alone SHALL NOT invoke it.

The command SHALL be deterministic and idempotent for its exact candidate, SHALL run outside the removable worktree, and SHALL report whether it removed the worktree and unchanged local topic ref, found them already absent, or retained them for an exact blocker. It SHALL use the existing ownership, journaling, bounded remote-read, non-force Git removal, and compare-and-delete local-ref safeguards rather than implement a second deletion path.

When a released registration's path no longer exists before any removal step was journaled, the command SHALL NOT fail on the missing directory. It SHALL verify the same merge/archive evidence, require that Git registers nothing at that path or only this candidate's own dangling registration whose `gitdir` names the removed pointer, retire that registration, journal the worktree as already absent, and continue to the unchanged local topic ref under the existing compare-and-delete rule. A valid worktree of a different identity at that path SHALL block as a reused path. An absent path with no registration SHALL block with a named reason and SHALL NOT be registered, because no journaled head exists to compare against.

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

#### Scenario: Registered worktree was deleted by hand before cleanup
- **WHEN** a released registration's directory is absent and Git holds no registration for it or only its own dangling registration
- **THEN** the command SHALL verify the merge/archive evidence, retire that dangling registration, record the worktree as already absent, and delete the unchanged local topic ref
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
