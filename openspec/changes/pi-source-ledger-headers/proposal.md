## Why

`scripts/pi/update-pinned-pi-source-ledger.mjs` has been broken since the dead-module removal (#474): it hard-codes the owned destinations of six components in a `reconciledSourceUnit` table, three of which were deleted and reclassified in the ledger by hand, so the script crashes hashing `custom-entry.ts` before it writes anything. The ledger's summary counts have been stale since then (30 owned-presentation records claimed, 27 present). The 27 owned copies under `src/integrations/pi/components/upstream/` also carry seven different ad-hoc provenance headers ("Source-synchronized from Pi 0.84.2", "Adapted from", "Mechanically adapted from Pi commit 914cf14", or none), so a reviewer resolving an upstream merge conflict has to open the ledger to learn what was deliberately changed. Both stand in the way of the nightly Pi upstream sync (plan section 4).

## What Changes

- The updater takes upstream identity (hashes, line counts, source-map paths) from the installed packages and every reviewed field of an existing record (classification, destination, status, modifications, deviations, tests, tasks) from the ledger; the hard-coded `reconciledSourceUnit` and `portedThemeUnit` tables are deleted. A missing owned destination is a named error, not a crash. `--check` reports header or ledger drift without writing.
- Add `scripts/pi/pinned-pi-source-header.mjs`: one canonical header block per owned copy (`Provenance:` package, version, license, commit, path; `Modifications:` from the record; `Deviations:` ids or `none`), with a splitter that removes the old ad-hoc header of either comment style. The updater rewrites the header before hashing; `check-pinned-pi-source-ledger.mjs` requires it verbatim.
- Regenerate the ledger (summary counts corrected, `localSha256` rehashed) and rewrite the 26 owned source copies' headers; the JSON asset copy has none. The `skill-invocation-message` record's modifications text drops a legacy product name that would otherwise reach a header.
- Point the status-indicator provenance assertion in `progress-status-presentation-boundary.test.ts` at the canonical header.
- Document the updater in `docs/architecture/toolchain.md`; add a unit suite for the header module.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `pi-api-boundary`: retained source-derived units carry a canonical, ledger-generated provenance header, and the ledger updater preserves reviewed record fields.

## Impact

No runtime behavior changes: the headers are comments and the owned copies are otherwise byte-identical. The ledger check now also fails when a copy's header drifts from its record. The startup graph baseline moves to 1,431,380 bytes for the longer headers of the eagerly loaded copies.
