## Why

Full regression [34880029189](https://github.com/timurproko/a1/actions/runs/34880029189) exposed a macOS path-spelling defect introduced by #402 and five Linux clipboard/lifecycle assertions that still fail after #402 merged. These block the requested nightly recovery even though normal PR CI passed; the fixtures must validate real platform contracts without touching the host clipboard or weakening assertions.

## What Changes

- Correct the predecessor-command test to assert filesystem directory identity, not lexical temporary-path spelling, while preserving exact arguments, spaces, npm sanitation, and a negative wrong-directory control.
- Make source and emitted-JavaScript clipboard fixtures intercept the actual platform I/O boundary: Linux command acquisition as well as native adapters on Windows/macOS. Keep the real paste protocol, classification workers, payloads, and packaged entry points exercised.
- Make clipboard test cleanup await every owned executor's `stopped` boundary even when an assertion rejects; prove whether unfinished teardown caused the observed seven-versus-eight admission result instead of changing capacity or deleting the assertion.
- Add independent text, empty, denied, Wayland-to-X11 fallback, unexpected-command, and failure-cleanup controls without requiring a clipboard server or accessing the user's clipboard.
- Validate the corrected tests in native CI, then require passing complete Full regression on all four existing lanes before seeking implementation merge. Preserve the earlier failed run and every lane's actual final outcome.
- Record newly completed Windows findings as separate unresolved blockers: Node 24 session-shell clipboard failures and Node 22 release-command test timeout. Read-only diagnosis and explicit scope refinement are required before related corrective code; do not infer that the macOS/Linux fixes resolve them.
- Retain #402's separate successful numbered merged-package scheduled-nightly requirement. This follow-up, its merge, or an archive PR cannot substitute for that result.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `isolated-regression-testing`: Clarify hermetic OS-boundary fixtures and failure-path executor teardown, and require filesystem-identity-aware subprocess regressions with independent negative controls.

## Impact

- Expected implementation surface: `test/foundation/release/predecessor-command-errors.test.ts`; the source/emitted clipboard fixture bases and narrowly related fixture helpers; `paste-executor.test.ts`, `clipboard-executor-lifecycle.test.ts`, `clipboard-packaged.test.ts`; focused regression tests as required.
- No production updater, clipboard routing/protocol, executor limits, pinned dependency, workflow, scheduling, suite classification, baseline, source-ledger, or rendering/input budget change is authorized by this plan. A production defect or another failing owner requires a further approved refinement before code edits.
- Planning base: merged #402, `d5d7c1b100158e9d0efdb44f0490ced2ee4ea266`. Keep #402 and #385 history and outstanding acceptance obligations; do not modify another session's worktree or silently complete older tasks.
- This is a new planning-only draft PR because #402 is already merged. After separate approval and an implementation request, retain this same follow-up PR through implementation; mark ready before normal PR CI, obtain actual review/manual merge authorization, and defer specs synchronization/archive and cleanup until required recovery evidence exists.
