# Implementation evidence

## Result

- Bare A1 now exposes pinned Pi's five outcomes: Trust, Trust parent folder, Trust for this session only, Do not trust, and Do not trust for this session only. Escape remains a separate exit without decision and no longer opens a temporarily untrusted shell.
- Parent-folder trust persists the ancestor and clears a narrower child decision; session-only outcomes activate only for the current launch without changing `trust.json`.
- Escape applies A1's shared terminal-mode reset, preserves the restored parent-screen cursor and every prior row, emits no parent-buffer content, and terminates before project settings, resources, or the owned shell are constructed. It uses successful status 0 so the development launcher follows its normal exit path without a second nonzero-child reset. Ctrl+C does not dismiss the bare selector.
- The bare-A1 hint advertises `Esc to exit` as its only exit action; `a1 pi` retains its pinned Escape/Ctrl+C cancellation behavior.
- Exceptional fail-closed trust warnings carry a dedicated `project-trust` code, appear once in bare A1's warning dock above the editor, and remain outside transcript semantics.
- The accepted interaction and presentation changes keep startup reachability at 157 files / 1,519,450 source bytes.

## Validation

- `npx vitest run test/features/owned-ui/project-trust-prompt.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts test/integrations/pi/engine/runtime-integration.test.ts test/app/session-shell/session-shell.test.ts test/foundation/release/bootstrap-boundary.test.ts test/foundation/terminal-cleanup/fatal-exit.test.ts test/repository-governance/startup-descriptor.test.ts test/repository-governance/startup-graph-policy.test.ts` — 8 files and 89 tests passed, including all five trust outcomes, parent/session persistence, Escape-only bare exit, ignored bare Ctrl+C input, full mode reset, parent-screen cursor preservation without output, and the required route through `terminateOwnedUiProcess`.
- `npm run typecheck` — passed for source and bin projects.
- `npx openspec validate remove-project-trust-cancel-state --strict --no-interactive` — passed.
- `node scripts/governance/check-architecture.mjs` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at 157 files / 1,519,450 bytes.
- `git diff --check` — passed.

## Environment limitation

- The earlier `npm ci` dependency setup stopped during its `prepare` build because this shell has no `gh`, `cargo`, or `rustc` on `PATH`. TypeScript build artifacts, typecheck, focused tests, and affected architecture checks pass independently; exact-head CI retains authority for the complete build.

## Manual validation

- The maintainer confirmed the uncovered-folder selector in Windows Terminal with Git Bash and accepted the final behavior: Ctrl+C leaves the bare selector active, while Escape preserves prior terminal rows and returns to a new empty shell prompt without starting the owned shell or flashing an intermediate restricted session.

## Known gaps

None.
