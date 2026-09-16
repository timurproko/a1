## 1. Exact generated-root policy

- [x] 1.1 Add `native/process-guardian/target` to the standard completion command's central disposable roots and verify the exported policy contains the exact path but no generic Cargo target rule.
- [x] 1.2 Extend persisted registration validation for only the reviewed Cargo root and verify malformed, parent, sibling, and near-match disposable entries remain rejected.

## 2. Fail-closed cleanup coverage

- [x] 2.1 Extend temporary cleanup fixtures with ignored process-guardian Cargo output and verify `complete` removes an otherwise eligible worktree through the existing non-force path.
- [x] 2.2 Add negative exactness coverage for unapproved Cargo target roots and verify cleanup reports `worktree-content` while preserving those files.
- [x] 2.3 Verify the approved Cargo tree remains subject to generated traversal budgets and nested-repository/link/special-file boundaries through focused cleanup tests.

## 3. Documentation and evidence

- [x] 3.1 Update the local cleanup runbook to document the exact Cargo root, near-match exclusions, and unchanged bounded safety checks, and verify documentation references match the exported policy.
- [x] 3.2 Record focused cleanup-test, typecheck, strict OpenSpec validation, and diff-check results in implementation evidence, with any gaps explicitly dispositioned.
