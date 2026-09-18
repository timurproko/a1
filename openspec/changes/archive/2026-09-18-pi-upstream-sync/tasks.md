## 1. Sync

- [x] 1.1 Add `scripts/governance/pinned-pi-identity.mjs` and read it from `check-pinned-pi-source-ledger.mjs`, the ledger updater (`--commit`, default from the ledger), and the modal, presenter, behavior, parity-evidence, and ledger governance suites.
- [x] 1.2 Add `scripts/pi/pi-upgrade-report.mjs` (body and OpenSpec scaffold renderers) and `scripts/pi/propose-pi-upgrade.mjs` (the ordered proposal steps with per-step verdicts).
- [x] 1.3 Add `.github/workflows/pi-upstream-sync.yml`, declare it in `config/github-repository-governance.json` with the `pi-upgrade-proposal` authority, and document it in the runbook and toolchain docs.

## 2. Proof

- [x] 2.1 Add `test/repository-governance/pi-upgrade-report.test.ts` (4 cases); run the driver against the current pin (`Pi 0.84.2 is current`) and once against the real 0.85.1 candidate (12 steps recorded, 11 conflicted copies, 7 orphaned and 1 unmapped inventory entries, 20 review items; tree restored).
- [x] 2.2 Run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, and the repository-governance suite; record outcomes: all checks OK, governance suites pass with the identity read from the authority.
