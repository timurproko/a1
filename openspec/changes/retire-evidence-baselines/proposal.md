## Why

Two governance baselines under `config/baselines/` record a historical snapshot rather than a current rule, and both have silently stopped meaning anything. `pi-api-boundary.json` (707 lines) was captured at commit 578d41b7 on 2026-08-20; 35 of its 37 recorded source paths no longer exist (`src/foundation/pi-engine-adapter/...`, `src/features/owned-ui/pi-session-shell.ts`), its approvals are keyed on exact path plus expression so they approve nothing in the current tree, and its generator `pi-api-boundary-baseline.mjs` crashes on `HEAD` because it hard-codes `src/foundation/transparent-terminal/main.ts`. The Pi production boundary check passes today only because the current tree has zero findings: running it with an empty baseline gives the same result. `product-identifier-inventory.json` (825 lines) is read by no script; its only test asserts that the file has content, and four of its recorded paths are gone. Nothing today notices when a baseline entry points at a deleted file, so the remaining baselines can rot the same way.

## What Changes

- Delete `config/baselines/pi-api-boundary.json`, its generator `scripts/governance/pi-api-boundary-baseline.mjs` with its `.d.mts`, and `test/repository-governance/pi-api-boundary-baseline.test.ts`. The Pi production boundary policy and `check-architecture.mjs` run without a transitional approval list: any finding fails.
- Delete `config/baselines/product-identifier-inventory.json` and its historical-evidence test case; keep the fixture-based identifier policy cases.
- Add one stale-path gate to `check-architecture.mjs`: every `src/`, `test/`, `scripts/`, or `bin/` source path recorded in any remaining `config/baselines/*.json` must exist, else the check fails naming the baseline and the path. Fix the one stale entry this finds today (`test/features/owned-ui/pi-a1-startup-fixture.ts` in `pi-session-shell-provenance.json`).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `project-structure-governance`: recorded baseline paths must exist; the architecture gate fails on a stale entry.
- `pi-api-boundary`: the production boundary check carries no transitional approval baseline.

## Impact

Removes about 1.5k lines of JSON and one governance script and test. Touches `scripts/governance/check-architecture.mjs`, `scripts/governance/pi-api-boundary-policy.mjs`, `config/baselines/pi-session-shell-provenance.json`, `test/repository-governance/product-identifier-inventory.test.ts`, and the governance test that proves the stale-path gate. Production code, the pinned Pi source ledger, and the remaining inventory baselines (`modal-surface`, `pinned-pi-interactive`, `presenter-ownership`) are unchanged; their retirement is a separate change.
