# Design

## A baseline that approves nothing is deleted, not regenerated

`inspectPiProductionBoundary(files, baseline)` subtracts approved findings from collected findings, keyed on category, exact path, and exact expression. With the 2026-08-20 snapshot every key names a file that was moved or deleted during the `foundation/pi-*` to `integrations/pi/*` migration, so the approved set is effectively empty. Regenerating the snapshot would only be useful if the current tree had findings that need a transitional exemption; it has none (`Pi production boundary OK: 0 unapproved findings` with an empty file). The check therefore drops the `baseline` argument and reports every finding. If a future change genuinely needs a transitional exemption, it adds an explicit, reviewed allowlist entry with a reason, not a snapshot of a whole commit.

The generator's other sections (dependency graph, import sites, source-derived UI units) duplicated the package lockfile and the pinned Pi source ledger, both of which are still checked by their own gates.

## Historical evidence lives in git, not in the tree

`product-identifier-inventory.json` records where product-prefixed identifiers were at the end of the naming cleanup. The naming policy job audits the current head on every PR, so the snapshot adds no enforcement, and its only test asserts that `baselineInternalIdentifiers` is non-empty. The snapshot stays readable at its last commit; the tree keeps the fixture cases that prove the policy classifies identifiers correctly.

## Stale-path gate

`check-architecture.mjs` already reads `config/baselines/`. The new pass loads each remaining `*.json`, walks it, and collects every string value matching `^(src|test|scripts|bin)/[^\s"]+\.(ts|js|mjs|mts|cts)$`. Each must exist relative to the repository root; each miss is one error `config/baselines/<file>: records missing path <path>`. Strings are matched by shape rather than by key so a new baseline field cannot escape the gate. Paths inside `upstreamPath`-style fields point at Pi's tree, not A1's, and never start with those four roots, so they are not matched. The gate runs in the same fast and full validation as the rest of the architecture check, and a fixture test proves it reports a stale entry and passes a current one.
