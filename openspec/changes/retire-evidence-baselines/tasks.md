## 1. Retire the Pi API boundary snapshot

- [ ] 1.1 Delete `config/baselines/pi-api-boundary.json`, `scripts/governance/pi-api-boundary-baseline.mjs`, `scripts/governance/pi-api-boundary-baseline.d.mts`, and `test/repository-governance/pi-api-boundary-baseline.test.ts`.
- [ ] 1.2 Remove the `baseline` parameter and `approvedFindings` from `scripts/governance/pi-api-boundary-policy.mjs`; report every finding. Drop the baseline read and the `approvedPiFeatureImports` plumbing from `scripts/governance/check-architecture.mjs` and from the two inspectors that took it; update `test/repository-governance/pi-api-boundary-policy.test.ts` if it passes a baseline.
- [ ] 1.3 Search `scripts`, `test`, `docs`, `.github`, and `package.json` for remaining references to the deleted files and remove them.

## 2. Retire the product identifier inventory

- [ ] 2.1 Delete `config/baselines/product-identifier-inventory.json` and the "preserves historical cleanup evidence" case in `test/repository-governance/product-identifier-inventory.test.ts`; keep the fixture cases.

## 3. Stale-path gate

- [ ] 3.1 Add `inspectBaselinePaths(root)` to `check-architecture.mjs`: read every `config/baselines/*.json`, collect string values matching `^(src|test|scripts|bin)/[^\s"]+\.(ts|js|mjs|mts|cts)$`, and push `config/baselines/<file>: records missing path <path>` for each that does not exist.
- [ ] 3.2 Fix `config/baselines/pi-session-shell-provenance.json`: replace or drop the coverage entry `test/features/owned-ui/pi-a1-startup-fixture.ts`.
- [ ] 3.3 Add a fixture test under `test/repository-governance/` proving the gate reports a stale entry with file and path and passes when every path exists.
- [ ] 3.4 Run `npm run check:architecture`, `npm run typecheck`, the repository-governance suite, and `check:code-documentation`; record outcomes here.
