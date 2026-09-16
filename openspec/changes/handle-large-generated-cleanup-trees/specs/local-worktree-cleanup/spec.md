## MODIFIED Requirements

### Requirement: Repository-generated worktree content has one central disposal policy
The cleanup implementation SHALL own a versioned exact-path policy for generated content routinely created by repository commands, including installed dependency directories, generated build roots, OpenSpec finalization reports, repository validation reports under `.artifacts/validation`, and the native Cargo outputs at `native/process-guardian/target` and `native/terminal-host/target`. The standard completion command SHALL apply that policy automatically and SHALL NOT require each agent to select or delete those paths. A policy entry SHALL be accepted only when the path is ignored, remains inside the exact worktree, contains no nested repository/link/special-file boundary, and matches a repository-owned generated root. Staged, unstaged, untracked, unknown ignored, or policy-mismatched content SHALL remain blocking.

Cleanup SHALL completely traverse the candidate content needed to establish those structural boundaries. That traversal SHALL retain a finite entry ceiling and the operation's wall-clock deadline, but its default ceiling SHALL cover the repository's standard installed dependency tree above the former 20,000-entry limit. Entry-ceiling or deadline exhaustion SHALL preserve the candidate and report a bounded inspection blocker; cleanup SHALL NOT treat an incomplete traversal as clean.

The validation-report policy entry SHALL authorize only the exact `.artifacts/validation` root and descendants. Native build policy entries SHALL authorize only the two exact repository-owned Cargo `target` roots and descendants. They SHALL NOT authorize the `.artifacts` parent, sibling artifact directories, arbitrary `target` directories, or near-match names.

#### Scenario: Standard generated dependencies and reports remain
- **WHEN** an otherwise eligible worktree contains only ignored generated content covered by the central policy, such as `node_modules/`, `.artifacts/openspec-archive/`, or `.artifacts/validation/`
- **THEN** cleanup SHALL fully inspect that content and complete normal non-force worktree removal without a second maintainer prompt

#### Scenario: Standard dependency tree exceeds the former ceiling
- **WHEN** an otherwise eligible candidate contains a structurally safe ignored dependency tree above 20,000 entries but below the reviewed finite ceiling and deadline
- **THEN** cleanup SHALL complete its structural inspection and SHALL NOT retain the candidate solely because it crossed the former ceiling

#### Scenario: Content exceeds the reviewed bounded inspection
- **WHEN** complete structural inspection cannot finish within the finite entry ceiling or wall-clock deadline
- **THEN** cleanup SHALL retain the candidate and report the corresponding bounded inspection blocker

#### Scenario: Exact native build outputs remain
- **WHEN** an otherwise eligible worktree contains ignored generated content only below `native/process-guardian/target` or `native/terminal-host/target`
- **THEN** cleanup SHALL classify those exact roots as disposable and complete normal non-force worktree removal after full structural inspection

#### Scenario: Native build policy remains exact
- **WHEN** ignored content exists under another `target` directory, a sibling native project, or a near-match of an approved native root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening native build authority

#### Scenario: Validation-report policy remains exact
- **WHEN** ignored content exists at `.artifacts/validation-user`, `.artifacts/other`, or another path outside the exact `.artifacts/validation` root
- **THEN** cleanup SHALL retain the worktree and identify that path rather than broadening validation-report authority

#### Scenario: Unknown ignored content remains
- **WHEN** an ignored path is not covered by the exact central policy
- **THEN** cleanup SHALL retain the worktree and identify the path rather than treating all ignored files as temporary
