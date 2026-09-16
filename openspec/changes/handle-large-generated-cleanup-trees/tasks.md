## 1. Bounded Large-Tree Inspection

- [ ] 1.1 Replace the embedded 20,000-entry traversal ceiling with a named 100,000-entry production limit while preserving per-entry deadline checks; verify a test-only low limit still produces `content-inspection-budget` without mutation.
- [ ] 1.2 Add a disposable-repository fixture with structurally safe ignored generated content above 20,000 entries and verify the default inspector completes full inspection and normal non-force worktree/ref removal within the existing operation deadline.
- [ ] 1.3 Preserve nested `.git`, link, special-file, path-containment, cancellation, and deadline blockers at every depth; verify existing safety fixtures pass unchanged under the higher finite ceiling.

## 2. Exact Native Build Policy

- [ ] 2.1 Add `native/process-guardian/target` and `native/terminal-host/target` to the immutable completion disposable roots; verify CLI help lists both exact paths and does not authorize a generic `target` root.
- [ ] 2.2 Add representative ignored native Cargo output fixtures and verify each approved root permits ordinary completion after structural inspection.
- [ ] 2.3 Add arbitrary root-level `target`, sibling native-project `target`, and near-match fixtures and verify each remains retained with a `worktree-content` blocker.

## 3. Documentation and Validation

- [ ] 3.1 Update cleanup documentation with the 100,000-entry ceiling, exact native roots, retained deadline, and fail-closed exhaustion behavior; verify guidance tests pin the exact boundaries.
- [ ] 3.2 Run focused cleanup, guidance, code-documentation, typechecking, and strict OpenSpec validation without running local `test:fast`, `test:full`, or `test:release` absent separate authorization; record exact outcomes, large-fixture timing, and gap disposition.
- [ ] 3.3 Record the retained PR #435 and PR #438 blocker evidence and exact post-deployment retry commands; verify all retained worktrees remain present until their applicable authorized merges.
