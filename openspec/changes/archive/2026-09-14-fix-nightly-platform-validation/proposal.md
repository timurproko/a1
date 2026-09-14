## Why

Nightly Release run [34825707734](https://github.com/timurproko/a1/actions/runs/34825707734) failed while validating the existing immutable package `0.1.8-dev.368`: macOS rejected a correct platform-specific shortcut label, and Windows Node 22 exposed a certification lease-release error and nondeterministic frame evidence. Fix these three observed failures without weakening exact-package publication or attributing them to Node versions without evidence.

## What Changes

- Make live shortcut-help regression expectations platform-aware: the configured `alt+m` binding is displayed as `option+m` on macOS and `alt+m` elsewhere, without changing runtime keybinding semantics.
- Make dependency-certification lease release tolerate bounded transient filesystem contention while retaining ownership/generation checks, atomic publication, abandoned-owner safety, and fail-closed behavior for permanent errors.
- Retain useful first-divergence frame diagnostics, then remove the demonstrated uncontrolled capture input or scheduling boundary; keep semantic ANSI, cursor/clear order, stage coverage, and single-hash expectations strict.
- Validate all three regressions on the existing four platform/Node lanes and require full exact-package validation of a newly numbered merged implementation package.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `agent-supervision`: Certification publication lease release survives transient sharing failures without touching a successor's lease or rewriting sealed evidence.
- `isolated-regression-testing`: Cross-platform shortcut and repeated terminal-frame regression evidence uses explicit presentation inputs and reports actionable divergence without relaxing parity.

## Impact

- Likely implementation surface: `src/foundation/release/dependency-certification.ts`.
- Regression surface: `test/foundation/release/dependency-certification.test.ts`, `test/integrations/pi/components/prompt-input-ux.test.ts`, `test/features/owned-ui/pi-event-frame-parity.test.ts`, its fixture producer, and narrowly related test support.
- No planned public API, dependency version, certification schema/path, production shortcut presentation, or release matrix changes. No generated baseline replacement to bless unexplained differences.
- Complements `move-dependency-certifications`, `make-parity-color-depth-deterministic`, and `unify-prompt-input-ux`; does not revise their unrelated scope.
- This pull request contains OpenSpec artifacts only. Implementation requires an accepted planning change and a subsequent explicit request in a new worktree and pull request.
