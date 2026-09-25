# Implementation evidence

## Result

- Bare A1 now exposes Trust, Do not trust, or exit without decision; Escape restores the terminal and exits instead of opening a temporarily untrusted shell.
- Escape and the conventional Ctrl+C interruption alias abort startup silently through the bounded process terminator with exit code 130 before project settings, resources, or the owned shell are constructed; resumed stdin cannot leave the command hanging after restoration.
- The bare-A1 hint advertises `Esc to exit`; `a1 pi` retains its pinned Escape/Ctrl+C cancellation behavior.
- Exceptional fail-closed trust warnings carry a dedicated `project-trust` code, appear once in bare A1's warning dock above the editor, and remain outside transcript semantics.
- The accepted interaction and presentation changes keep startup reachability at 157 files / 1,516,794 source bytes.

## Validation

- `npx vitest run test/features/owned-ui/project-trust-prompt.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts test/integrations/pi/engine/runtime-integration.test.ts test/app/session-shell/session-shell.test.ts test/repository-governance/startup-descriptor.test.ts test/repository-governance/startup-graph-policy.test.ts` — 6 files and 66 tests passed.
- `npx vitest run test/foundation/release/bootstrap-boundary.test.ts` — passed, including the required trust-interruption route through `terminateOwnedUiProcess`.
- `npm run typecheck` — passed for source and bin projects.
- `npx openspec validate remove-project-trust-cancel-state --strict --no-interactive` — passed.
- `node scripts/governance/check-architecture.mjs` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at 157 files / 1,516,794 bytes.
- `git diff --check` — passed.

## Environment limitation

- The earlier `npm ci` dependency setup stopped during its `prepare` build because this shell has no `gh`, `cargo`, or `rustc` on `PATH`. TypeScript build artifacts, typecheck, focused tests, and affected architecture checks pass independently; exact-head CI retains authority for the complete build.

## Manual handoff

From an uncovered folder under `defaultProjectTrust: ask`, start the development checkout. Press Escape and confirm A1 returns directly to a live parent shell prompt without hanging on a blinking cursor, starting the owned shell, printing a crash, or flashing an intermediate restricted session. Relaunch, choose Do not trust, and confirm A1 starts normally without a warning.

## Known gaps

None. Physical terminal confirmation of the Escape exit and flash removal is the prepared maintainer handoff.
