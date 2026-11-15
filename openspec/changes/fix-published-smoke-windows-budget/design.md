## Context

Runs: https://github.com/timurproko/a1/actions/runs/43732033913 (0.2.7-dev.1313, source 3f2ed26f) and https://github.com/timurproko/a1/actions/runs/43738961066 (0.2.7-dev.1316, source e8c7249b). Both failed only `Published pair (win32-node24, windows-2025, 24)` at stage `update-predecessor`, predecessor 0.2.7-dev.1307. Linux and macOS pairs passed in under ninety seconds.

Evidence from the second run, written after the process settlement repair of `fix-windows-published-pair`: child stdout `a1 update: 0.2.7-dev.1307 → 0.2.7-dev.1316`, status null, error `published smoke command timed out after 600000ms`. The newest fixture npm log belongs to the detached replacement worker's `npm install` and ends at line 895 inside tarball cache hits with no `info run` lifecycle line and no `verbose exit`, so npm was alive and before lifecycle scripts when the fixture was settled. The updater's `npm root --global` log is dated 17:21:52Z; the deadline fired at 17:31:52Z. On that runner a published installation of the application takes 105–113 s and a release materialization about 11 s (Windows predecessor shard, run 43686744674), so a completed replacement was expected by roughly 17:25Z.

The exact pair 1307 → 1316 passed on native Windows locally three times in 70–73 s: with Node 24.21.0/npm 11.19.0, with CI-equivalent environment (`CI`, `GITHUB_ACTIONS`, a setup-node user config with placeholder token and `always-auth`), and with the runner's Node 24.22.2/npm 11.19.1. The predecessor-update stage was introduced by `verify published tarball readiness` and has never passed on the hosted Windows runner.

The published updater (`src/foundation/release/update-recovery.ts`, identical in 1307) waits up to fifteen minutes for its detached worker before it writes cancellation and reports `UpdateRecoveryPendingError`. The smoke's ten-minute deadline therefore always pre-empts the updater's own timeout path.

## Decisions

1. Raise only the Windows `update-predecessor` command budget, to twenty minutes, above the updater's fifteen-minute worker deadline. The published-pair job allows forty minutes and every other Windows stage together takes about six. Linux, macOS, and all other stages keep ten minutes. This reverses the earlier decision not to raise the budget because that decision predated the evidence that the budget inverts the updater's own deadline; a genuine stall still fails closed, now with the updater's own diagnostics available.
2. Capture the fixture-owned process inventory before settlement. The runner exposes `inventory()` reusing the same ownership selection as `close()`; the smoke records bounded sanitized pid, parent, start identity, executable, and arguments in failure evidence. Inventory failure is recorded, never fatal.
3. Record update records from the fixture's product data directories: bounded sanitized tails of `update-transaction.json` and of recovery capsule `owner.json`, `result.json`, `cancel.json`, and `worker-starting.lock`, each with size and modification time. Capsule manifests are omitted; they contain only paths already present elsewhere.
4. Record npm log identities (name, size, modification time) for the newest logs beside the existing tails so each phase can be dated, and record per-stage command durations in success and failure evidence.
5. Redact only environment values of at least eight characters under credential-like keys. The second run's evidence shows `npm root --global` rendered as `npm [redacted] --global`, so a short ordinary value under a matching key erased an ordinary word.

## Risks and scope boundaries

A longer Windows budget lengthens a failing publication by up to ten minutes; it never relaxes an assertion or lets promotion proceed on failure. Evidence remains fixture-scoped, bounded, sanitized, and written before cleanup; new fields are additive to the existing schema. No change is made to the updater, the worker, the bridge, the installer, or promotion. If the next hosted failure's evidence identifies an updater or npm boundary, that repair is a separate change.

## Implementation observations

`updateCommandBudgetMs(platform)` returns twenty minutes on win32 and ten minutes elsewhere; only the `update-predecessor` command uses it. Installation stages keep the shared ten-minute constant, so a slow install still fails at the same point as before.

The runner's `inventory()` reuses the exact selection `close()` terminates (owned children, fixture-path arguments, and descendants started after their owner) and stops nothing. The smoke reads it inside its failure path before settlement, records at most forty rows with sanitized executable and argument text, and stores an inventory error in place of rows when inspection fails. Update records come from `data` and `update-data`: the journal plus each capsule's owner, result, cancellation, and start-lease files, keyed by fixture-relative path with size, modification time, and sanitized tail; capsule manifests are skipped. The ten newest npm logs are listed by name, size, and modification time beside the existing three tails. `timings` accumulates child-command milliseconds per stage in success and failure evidence.

Redaction now requires credential-like values of at least eight characters. The focused test shows `npm root --global` surviving an `AUTH_WORD=root` environment while a long token is still removed from child output, process arguments, update records, and inventory errors.

Local targeted validation: core build, both typechecks, architecture boundaries, full code-documentation policy, strict OpenSpec validation, and the smoke evidence and process ownership tests including the native Windows settlement case.

## Known gaps

The hosted Windows stall is still unreproduced locally; this change makes the next occurrence diagnosable rather than fixing a located cause.
