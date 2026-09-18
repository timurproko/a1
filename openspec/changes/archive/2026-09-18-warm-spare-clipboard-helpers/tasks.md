## 1. Pool

- [x] 1.1 Add `src/integrations/pi/session-ui/helper-pool.ts` (`HelperPool`: `warm`, `replenish`, `take`, `dispose`, `warmed`; idle bound `HELPER_SPARE_IDLE_MS`).
- [x] 1.2 `paste-executor.ts`: extract `forkPasteHelper` and `stopPasteHelper`, add `createPasteHelperPool`, take a spare in `startPasteExecutor`, send the first request when the spare already announced, replenish after cleanup.
- [x] 1.3 `paste-preparation-client.ts`: options object (`onEvent`, `execute`, `helper`, `spareIdleMs`), own pool, `warm()`, `warmed`, dispose the pool; `prompt-chips.ts` passes `preparation` through and exposes `warm()`.
- [x] 1.4 `response-copy-transport.ts`: `forkCopyHelper`, `stopCopyHelper`, a pool per executor, `OwnedResponseCopyExecutor` (`warm`, `dispose`, `warmed`), take a spare in `startHelper`, replenish on exit.
- [x] 1.5 `session-shell.ts` and `session-shell-root.ts`: `pastePreparation` diagnostics option, `warmPastePreparation()`, warm both pools on the immediate after `start()`, dispose the copy executor.

## 2. Proof

- [x] 2.1 Add `test/integrations/pi/session-ui/helper-pool.test.ts` (5 cases over `helper-pool-fixture.mjs`), two spare cases in `paste-executor.test.ts`, one in `response-copy-transport.test.ts`, and `session-shell-clipboard-spares.test.ts` (3 cases); the shell fixture gains `inProcessPasteExecutor` and the `"forked"` opt-outs for paste preparation and response copy.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` (153 files, 1,442,658 bytes); run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, the session-shell, paste, copy, and clipboard suites, and `npx vitest run test/repository-governance test/contracts`; record outcomes.
