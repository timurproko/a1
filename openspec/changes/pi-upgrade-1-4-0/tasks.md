## 1. Upgrade

- [x] 1.1 Pin both Pi packages at 1.4.0 and refresh the lockfile.
- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, baselines, and parity evidence.

## 2. Review Items

- [ ] 2.1 Resolve every conflict marker in the merged vendored copies and carry any wanted upstream change from the kept copies into A1's versions.
- [ ] 2.2 Adopt the removed or changed Pi public API exports in A1's consuming modules so the candidate compiles.
- [ ] 2.3 Set an A1 disposition for every pending feature adoption row and repair or retire each orphaned or unmapped inventory entry.
- [ ] 2.4 Update the remaining mentions of the previous Pi pin and note user-visible Pi behavior changes for the release notes.
