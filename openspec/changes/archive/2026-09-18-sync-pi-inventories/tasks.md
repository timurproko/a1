## 1. Sync

- [x] 1.1 Add `scripts/pi/sync-pi-inventories-core.mjs` (`syncInventories`) with its declaration file: anchor re-resolution, orphan marking, behavior range moves by symbol span, hash, lockfile, and manifest regeneration, and unmapped component reporting.
- [x] 1.2 Add `scripts/pi/sync-pi-inventories.mjs` over the installed packages with `--check`, `--commit`, and `--report`.
- [x] 1.3 Record the current interactive component set in `modal-surface-inventory.json` and run the sync once.

## 2. Proof

- [x] 2.1 Add `test/repository-governance/sync-pi-inventories.test.ts` (4 cases) over synthetic sources: no-op on matching input, whitespace re-anchoring plus orphan plus unmapped, range moves and an orphaned behavior, orphan clearing with a new pinned identity.
- [x] 2.2 Run `node scripts/pi/sync-pi-inventories.mjs --check`, `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the inventory governance suites; record outcomes: inventories current for 0.84.2, all checks OK, inventory suites pass unchanged.
