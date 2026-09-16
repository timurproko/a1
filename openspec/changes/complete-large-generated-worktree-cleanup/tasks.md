## 1. Bounded Content Inspection

- [ ] 1.1 Separate ordinary and approved-generated traversal counters in `inspectWorktree`, keep finite production defaults and the existing deadline, and verify adjacent non-disposable paths still consume only the ordinary allowance.
- [ ] 1.2 Preserve recursive nested-Git, link, and special-file vetoes in generated roots, and verify generated-budget exhaustion still reports `content-inspection-budget`.

## 2. Regression Coverage and Guidance

- [ ] 2.1 Add focused temporary-repository fixtures with injectable small limits proving generated content may exceed the ordinary allowance while both limits remain fail-closed; verify `test/repository-governance/local-cleanup.node.mjs` passes.
- [ ] 2.2 Update `docs/local-worktree-cleanup.md` to describe the separate bounded generated-content allowance and verify documentation matches the cleanup contract.

## 3. Validation

- [ ] 3.1 Run the focused local-cleanup Node fixtures and project typecheck, recording successful commands as task evidence.
