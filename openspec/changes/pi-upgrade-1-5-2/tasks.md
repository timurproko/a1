## 1. Upgrade

- [x] 1.1 Pin both Pi packages at 1.5.2 and refresh the lockfile.
- [x] 1.2 Re-merge the vendored copies and regenerate the ledger, headers, inventories, baselines, and parity evidence.

## 2. Review Items

- [ ] 2.1 Resolve every conflict marker in the merged vendored copies and carry any wanted upstream change from the kept copies into A1's versions.
- [ ] 2.2 Adopt the removed or changed Pi public API exports in A1's consuming modules so the candidate compiles.
- [ ] 2.3 Set an A1 disposition for every pending feature adoption row and repair or retire each orphaned or unmapped inventory entry.
- [ ] 2.4 Update the remaining mentions of the previous Pi pin and note user-visible Pi behavior changes for the release notes.

## 3. Planned adoption details

These tasks refine the existing review outcomes and await approval of the design.

- [ ] 3.1 Preserve the existing vendored deviations after inspecting the unchanged upstream copies and the unconsumed InteractiveMode API delta.
- [ ] 3.2 Carry explicit Continue, Fork, and Cancel recovery choices between the shell and engine without leaking Pi types into neutral contracts.
- [ ] 3.3 Adopt missing-folder recovery for startup selection, resume, import, and extension switching while preserving cross-project policy and session-writer exclusion.
- [ ] 3.4 Ensure Fork uses a new session ID in the current directory, Continue does not persist its cwd choice, and cancelled or failed imports leave no duplicate copies.
- [ ] 3.5 Repair the missing-folder modal nodes and transition anchors and complete the feature adoption disposition.
- [ ] 3.6 Make standalone parity generation produce source-side settings metadata before importing source consumers and cover the clean-checkout boundary.
- [ ] 3.7 Re-evaluate the exact deprecated transitive exception for Pi 1.5.2 and classify every remaining reported parity-suite failure without weakening its assertions.
- [ ] 3.8 Refresh affected current-pin provenance and parity artifacts with their generators and document user-visible recovery behavior without rewriting historical records.
