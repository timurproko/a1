## Why

Three inventories pin what A1 knows about Pi's interactive surface by hand: `modal-surface-inventory.json` (47 nodes and their transitions, anchored to snippets of the installed dist sources), `presenter-ownership-inventory.json` (18 presenters and 25 commands, anchored the same way), and `pinned-pi-interactive-baseline.json` (29 behaviors anchored to line ranges of pinned TypeScript sources, plus source hashes and command, keybinding, event, and settings manifests). Their governance tests fail the moment an anchor, hash, or manifest disagrees with the installed package, which is right, but it means a Pi upgrade starts with a hand migration of 5,300 lines of JSON before anything can be evaluated. The nightly upstream sync (plan section 4) needs that migration to be proposed by a script and reviewed as a diff.

## What Changes

- Add `scripts/pi/sync-pi-inventories-core.mjs`: `syncInventories()` re-resolves the three inventories in memory against upstream source text. An anchor that still matches is kept; one that matches only ignoring whitespace is rewritten to the matching line; one that matches nowhere marks its entry `status: "orphaned"`. A behavior's line range moves only when it no longer contains every anchor, and then to the span of its named symbols widened to the anchors. Source hashes, line counts, lockfile identity, and the five source-derived manifests are regenerated. The modal inventory records the set of interactive component files at the pin; a file not in that set is reported as unmapped.
- Add `scripts/pi/sync-pi-inventories.mjs`: the CLI over the installed packages; `--check` reports drift, orphans, and unmapped components without writing and exits non-zero; `--commit <sha>` records a new version's upstream commit; `--report <path>` writes the resolution report an upgrade pull request can quote.
- Record the current component set in the modal inventory and run the sync once; the presenter inventory is reformatted to canonical JSON with identical content.
- Add `test/repository-governance/sync-pi-inventories.test.ts` (4 cases) over synthetic sources.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: the pinned-Pi inventories are re-resolvable against a candidate by one script whose check mode passes on the current pin.

## Impact

No runtime or inventory-content changes: the governance tests for all three inventories pass unchanged, and `--check` reports the inventories current for 0.84.2. Orphaned and unmapped entries still fail those tests, so the sync proposes and never silently accepts.
