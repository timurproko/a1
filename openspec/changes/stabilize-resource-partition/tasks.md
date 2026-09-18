## 1. Deliver a lingering helper's prepared text

- [x] 1.1 In `src/integrations/pi/session-ui/response-copy-transport.ts`, split helper termination into `cancel`, which discards the prepared text, and `reap`, which the post-result cleanup timer uses so a helper that lingers after a complete result is terminated without emptying its delivered text; pin `config/startup-graph-baseline.json` to the new exact eager source total (2,647,783 bytes, +196).
- [x] 1.2 Add `test/integrations/pi/session-ui/response-copy-lingering-helper.mjs`, a fixture that reports a complete prepared result and never exits, and transport tests proving the exact text is delivered once and that an owner cancellation before delivery still settles as canceled without a writer call; record outcomes: with the fix reverted the delivery test fails with the writer receiving `""`, with the fix `response-copy-transport.test.ts` 25 passed.

## 2. Warm the Windows handle fixture's interpreter

- [x] 2.1 In `test/repository-governance/local-cleanup.node.mjs`, spawn one throwaway `powershell.exe` when the file loads on Windows and await it in the exclusive-handle fixture's `hold` and probe, leaving the 10 s bounds, the file-sentinel release, and every assertion unchanged; record outcomes: `node --test test/repository-governance/local-cleanup.node.mjs` 66 passed, the two Windows handle tests at 6.5 s and 9.2 s locally.

## 3. Validate the change

- [x] 3.1 Run the typecheck and the governance checks that cover the changed source, tests, and documentation, and reproduce the clipboard baseline test pinned to two cores under CPU load to confirm the empty-clipboard failure no longer appears; record outcomes: `typecheck` clean, `check:architecture`, `check:names`, `check:code-documentation`, and `check:docs-governance` OK, `openspec validate` valid, and three rounds of the twelve baseline cases pinned to two cores beside six busy processes report no `expected '' to be 'copy-target'` failure (before the fix: 5, 3, and 0 failures per round, mixed empty-text and deadline; after: 1, 1, and 0, all the production 5,000 ms deadline expiring under that starvation, which the design leaves unchanged). Serial run of the seven affected suites: 351 passed.
