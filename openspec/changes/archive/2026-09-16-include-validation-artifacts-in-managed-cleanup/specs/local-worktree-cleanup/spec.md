## MODIFIED Requirements

### Requirement: Repository-generated worktree content has one central disposal policy
The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, OpenSpec finalization reports, and repository validation reports under `.artifacts/validation`. The standard completion command SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, contains no nested repository/link/special-file boundary, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, or policy-mismatched content SHALL remain blocking.

The validation-report policy entry SHALL authorize only the exact `.artifacts/validation` root and descendants. It SHALL NOT authorize the `.artifacts` parent, sibling artifact directories, or near-match names.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/`, `.artifacts/openspec-archive/`, or `.artifacts/validation/`
- **THEN** cleanup SHALL classify that content as disposable and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Validation-report policy remains exact
- **WHEN** ignored content exists at `.artifacts/validation-user`, `.artifacts/other`, or another path outside the exact `.artifacts/validation` root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening validation-report authority

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary
