## 1. Updater and headers

- [x] 1.1 Add `scripts/pi/pinned-pi-source-header.mjs` (`renderProvenanceHeader`, `splitProvenanceHeader`, `carriesProvenanceHeader`) with its declaration file.
- [x] 1.2 Rewrite `scripts/pi/update-pinned-pi-source-ledger.mjs` to preserve every reviewed field of an existing record, drop the hard-coded port tables, rewrite each owned copy's header before hashing, fail on a missing owned destination, and add `--check`.
- [x] 1.3 Require the canonical header in `scripts/governance/check-pinned-pi-source-ledger.mjs` for every owned copy that is a source file.
- [x] 1.4 Regenerate the ledger and the 26 owned copies' headers; correct the `skill-invocation-message` modifications text; document the updater in `docs/architecture/toolchain.md`.

## 2. Proof

- [x] 2.1 Add `test/repository-governance/pinned-pi-source-header.test.ts` (3 cases); point the status-indicator provenance assertion in `progress-status-presentation-boundary.test.ts` at the canonical header.
- [x] 2.2 Re-pin `config/startup-graph-baseline.json` to 1,431,380 bytes; run `npm run typecheck`, `check:architecture`, `check:code-documentation`, the changed-documentation check, the updater's `--check`, and the repository-governance and Pi component suites; record outcomes: all checks OK, ledger current, 1,298 governance and component cases pass.
