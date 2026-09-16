## ADDED Requirements

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
