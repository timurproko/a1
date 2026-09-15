## Why

Full regression [34880029189](https://github.com/timurproko/a1/actions/runs/34880029189) exposed a macOS path-spelling defect introduced by #402, five Linux clipboard/lifecycle assertions, Windows Node 24 shell paste failures, and a Windows Node 22 release-command timeout after #402 merged. These block the requested nightly recovery even though normal PR CI passed; the fixtures must validate real platform contracts without touching the host clipboard or weakening assertions.

## What Changes

- Correct the predecessor-command test to assert filesystem directory identity, not lexical temporary-path spelling, while preserving exact arguments, spaces, npm sanitation, and a negative wrong-directory control.
- Make source and emitted-JavaScript clipboard fixtures intercept the actual platform I/O boundary: Linux command acquisition as well as native adapters on Windows/macOS. Keep the real paste protocol, classification workers, payloads, and packaged entry points exercised.
- Make clipboard test cleanup await every owned executor's `stopped` boundary even when an assertion rejects; prove whether unfinished teardown caused the observed seven-versus-eight admission result instead of changing capacity or deleting the assertion.
- Add independent text, empty, denied, Wayland-to-X11 fallback, unexpected-command, and failure-cleanup controls without requiring a clipboard server or accessing the user's clipboard.
- Validate the corrected tests in native CI, then require passing complete Full regression on all four existing lanes before seeking implementation merge. Preserve the earlier failed run and every lane's actual final outcome.
- Approved Windows extension: add bounded phase/lifetime evidence for the Node 24 shell paste failures and per-operation fixture evidence for the Node 22 release-command timeout, then correct only demonstrated test/fixture defects. Preserve real helper completion, exact image/text and submission oracles, real temporary Git/manual-gate operations, and every existing wait/test limit. Production corrections still require separate approval; isolated local passes do not resolve the failed native gate.
- Retain #402's separate successful numbered merged-package scheduled-nightly requirement. This follow-up, its merge, or an archive PR cannot substitute for that result.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Clarify hermetic OS-boundary fixtures and failure-path executor teardown, require filesystem-identity-aware subprocess regressions with independent negative controls, and require bounded failure evidence without weakening asynchronous completion or real release-workflow oracles.

## Impact

- Expected implementation surface: `test/foundation/release/predecessor-command-errors.test.ts`; the source/emitted clipboard fixture bases and narrowly related fixture helpers; `paste-executor.test.ts`, `clipboard-executor-lifecycle.test.ts`, `clipboard-packaged.test.ts`; focused regression tests as required.
- Approved additional surface: the affected cases and fixture support in `test/integrations/pi/session-ui/session-shell.test.ts`, `test/repository-governance/release-command.test.ts`, and `test/support/release-command-fixture.ts`, with narrowly scoped test-support diagnostics or regressions. This does not authorize production shell, clipboard, or release-script changes.
- No production updater, clipboard routing/protocol, executor limits, pinned dependency, workflow, scheduling, suite classification, baseline, source-ledger, or rendering/input budget change is authorized by this plan. A production defect or another failing owner requires a further approved refinement before code edits.
- Planning base: merged #402, `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`. Keep #402 and #385 history and outstanding acceptance obligations; do not modify another session's worktree or silently complete older tasks.
- This follow-up started planning-only because #402 was already merged. Initial fixture implementation was approved and pushed at `ab0035b4621a25682fbfb85be468df0e12e2a3cd`; the maintainer then approved extending the plan and implementation to the two Windows test/fixture owners. Keep this same PR/history, reconcile this extension before its code, mark the completed candidate ready before normal PR CI, obtain actual review/manual merge authorization, and defer specs synchronization/archive and cleanup until required recovery evidence exists.
