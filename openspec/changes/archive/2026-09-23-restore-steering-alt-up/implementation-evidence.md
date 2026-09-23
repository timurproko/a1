## Implementation result

- Bare A1 now declares `Alt+Up` as the default `app.message.dequeue` binding on every platform while the pinned comparison profile retains Pi's platform-specific default.
- `Alt+Up` reaches the ordinary editor action dispatcher and restores queued compaction-time steering text in order; explicit user overrides replace the default.
- Expanded startup help, `/hotkeys`, and the pending-queue hint read the effective dequeue binding. The queue hint refreshes from live binding data without changing pinned queue presentation.
- The pinned-source provenance ledger records the owned shortcut deviation, and the startup graph baseline records the resulting exact reachable-source size.

## Focused evidence

- `npx vitest run test/app/session-shell/session-shell-viewport.test.ts test/app/session-shell/session-shell.test.ts test/integrations/pi/components/prompt-input-ux.test.ts test/integrations/pi/components/shell-components.test.ts` — 104 tests passed.
- `npx vitest run test/integrations/pi/components/pinned-editor-input-parity.test.ts test/repository-governance/pinned-pi-source-ledger.test.ts` — 17 tests passed.
- `npm run build` — completed successfully.
- `npm run typecheck` — completed successfully after the build produced the bin-contract declarations.
- `npm run check:architecture` — architecture, identity, pinned-source provenance, and terminal-host checks passed.
- `npx openspec validate restore-steering-alt-up --strict` and `git diff --check` — passed.

## Known gaps

No known implementation gap remains. A physical Windows-terminal check of the exact pushed candidate remains part of maintainer handoff and acceptance rather than automated implementation evidence.
