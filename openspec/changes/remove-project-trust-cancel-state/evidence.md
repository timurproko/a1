# Implementation evidence

## Result

- Bare A1 now requires Trust or Do not trust as its only normal startup outcomes; Escape leaves the selector unchanged.
- Ctrl+C restores the selector-owned terminal state and aborts startup silently with exit code 130 before project settings, resources, or the owned shell are constructed.
- The bare-A1 hint advertises `Ctrl+C to exit`; `a1 pi` retains its pinned Escape/Ctrl+C cancellation behavior.
- Exceptional fail-closed trust warnings carry a dedicated `project-trust` code, appear once in bare A1's warning dock above the editor, and remain outside transcript semantics.
- The accepted interaction and presentation changes keep startup reachability at 157 files / 1,516,787 source bytes.

## Validation

- `npx vitest run test/features/owned-ui/project-trust-prompt.test.ts test/integrations/pi/engine/project-trust-preflight.test.ts test/integrations/pi/engine/runtime-integration.test.ts test/app/session-shell/session-shell.test.ts test/repository-governance/startup-descriptor.test.ts test/repository-governance/startup-graph-policy.test.ts` — 6 files and 66 tests passed.
- `npm run typecheck` — passed for source and bin projects.
- `npx openspec validate remove-project-trust-cancel-state --strict --no-interactive` — passed.
- `node scripts/governance/check-architecture.mjs` — passed.
- `node scripts/pi/update-startup-graph-baseline.mjs --check` — passed at 157 files / 1,516,787 bytes.
- `git diff --check` — passed.

## Environment limitation

- The earlier `npm ci` dependency setup stopped during its `prepare` build because this shell has no `gh`, `cargo`, or `rustc` on `PATH`. TypeScript build artifacts, typecheck, focused tests, and affected architecture checks pass independently; exact-head CI retains authority for the complete build.

## Manual handoff

From an uncovered folder under `defaultProjectTrust: ask`, start the development checkout. Confirm Escape leaves the trust selector visible without changing its selection or flashing parent-terminal content. Then press Ctrl+C and confirm A1 returns directly to the parent terminal without starting the shell or printing a crash. Relaunch, choose Do not trust, and confirm A1 starts normally without a warning.

## Known gaps

None. Physical terminal confirmation of the Escape no-op and flash removal is the prepared maintainer handoff.
