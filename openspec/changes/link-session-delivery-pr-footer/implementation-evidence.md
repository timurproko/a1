# Implementation evidence

Commands were run from `C:/git/a1/.worktrees/session-associated-pr-footer` on Windows 11 with Node v24.21.0 and Git 2.53.0.windows.1. `test:fast`, `test:full`, and `test:release` were not run because the maintainer did not request them.

## Behavior evidence

- The association-store suite creates real Git worktrees and verifies canonical atomic persistence, independent session records, clear/resume behavior, and fail-closed handling for mismatched sessions, foreign repositories, malformed oversized records, deleted paths, non-root paths, and detached worktrees.
- Runtime lifecycle tests verify immediate associated context selection, prompt detection of association and branch changes, startup-context fallback after clear, session-generation isolation, serialized PR probes, unchanged-view suppression, and disposal that aborts and awaits active repository work before releasing the runtime.
- CLI tests verify typed link/unlink dispatch and explicit failure without Pi shell-tool identity. A built candidate successfully ran `node bin/cli.js session link-worktree C:/git/a1/.worktrees/session-associated-pr-footer` from this session, confirming pinned Pi supplied the current session identity and the same-repository worktree was linked without changing tool cwd.
- Footer tests verify the associated path and branch render in bare A1, only the complete linked `#540` remains after path truncation at 40 columns with OSC 8 confined to `#540`, and the comparison profile retains its prior `/WORK ...` output without consuming the association. A shell integration test additionally verifies repository path and PR fields survive extension-status footer merging; the first live handoff exposed that missing projection and the repair preserves all neutral footer fields. Maintainer review passed the linked-worktree behavior and requested removal of the redundant visible `PR` prefix.

## Validation

| Command | Outcome |
| --- | --- |
| `npm exec -- openspec validate link-session-delivery-pr-footer --strict` | Valid. |
| `npm run build` | Passed; runtime payload inventory and startup artifact generated. |
| `npm run typecheck` | Passed for source and bin projects. |
| `npm run check:architecture` | Passed architecture, product/package identity, refreshed 118-record Pi source ledger, and terminal provenance. Startup baseline was explicitly re-pinned to 152 source files / 1,458,121 bytes and 2,044 Pi artifact files / 9,564,564 evaluated bytes for the repository resolver and footer changes. |
| `npm run check:code-documentation` and `npm run check:code-documentation:changed` | Passed. |
| Focused store, CLI, repository resolver, runtime, adapter, contract, footer, dispatch, and guardian suites | 227 passed in the recorded focused run; the follow-up store/runtime/CLI run passed 10. |
| Session-shell link projection and footer suites | 50 passed, including repository path and PR preservation through the production shell footer merge and `#<number>`-only presentation. |
| Runtime disposal and Windows project-trust cleanup suites | 18 passed after making repository-work settlement and temporary-directory cleanup deterministic. |
| `npm run test:pr-core` | Passed: typecheck, architecture, and 156 PR-core tests. |
| Delivery-guidance and owned-UI documentation tests | 6 passed after adding the copy-pasteable command and CLI usage forms. |

## Known gaps

- Live Windows Terminal review confirmed the linked-worktree footer behavior and produced the final presentation refinement to show only `#<number>`; repeat review with two simultaneous sessions, resume, clear/fallback, and pane resizing remains part of the maintainer handoff. No second interactive A1 process or live model call was started from the implementation worktree.
- A broad unrelated repository-governance/launch run passed 1,337 of 1,343 cases. Two feature-relevant documentation failures were corrected and pass in isolation. The remaining failures were environmental/contention failures outside touched behavior: one release fixture timeout, one local-cleanup subprocess deadline with a temporary fixture path already absent, and two case-only `C:/Git` versus `C:/git` installed-module assertions caused by the checkout path spelling.
