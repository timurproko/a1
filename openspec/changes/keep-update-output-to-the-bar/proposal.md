## Why

`a1 update --develop` from 0.1.8-dev.469 to 0.1.8-dev.508 printed a Node `MODULE_NOT_FOUND` stack trace and `could not point the #pi-tui proxy at the installed tree (exited 1)` in the middle of its progress bar, then finished correctly. The running updater ran a helper entry of the tree it had just installed, `bin/sync-pi-tui-proxy.js`, which #479 removed; the step was best-effort, but the child's stderr was inherited from the terminal, so a non-fatal, expected condition looked like a crash. Every child the updater starts shares the terminal the same way today, so any npm notice or helper failure reaches the user regardless of whether it matters.

## What Changes

- The updater's process runner never gives a child the terminal: stdout and stderr are captured, stderr bounded to the last 8,000 characters, and returned with the exit status. What a child said reaches the terminal only when the update fails because of that child, printed once before the failure line; a successful child's text is dropped. The `Review npm's diagnostics above.` hint appears only when something was printed.
- Protected package replacement follows the same rule: npm's text is shown only when nothing was installed.
- The package ships a `bin/sync-pi-tui-proxy.js` that does nothing and exits successfully, so installed updaters older than 0.1.8-dev.479 complete their post-install step silently against every newer tree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cli-self-update`: the terminal shows the bar, the success line, or the failure with the failed child's bounded text; no child of the updater writes to the terminal itself, and a retired helper entry an older updater still runs exits silently.

## Impact

`src/foundation/release/update.ts` (`createNpmProcessRunner`, `runNpm`, the replacement output branch, new `reportChildDiagnostics` and `CHILD_DIAGNOSTIC_LIMIT`), new `bin/sync-pi-tui-proxy.js`, `test/foundation/release/update.test.ts`, and the packed-surface expectation. Not changed: the progress bar, the transaction journal, rollback, the protected replacement protocol, or what a failed update prints beyond ordering the child's text before the failure line.
