## MODIFIED Requirements

### Requirement: A1-owned presentation is independent from Pi engine upgrades
Attributed source-derived UI units retained by A1 SHALL be treated as A1-owned baseline code. Updating the Pi engine SHALL NOT automatically require adopting new private Pi interactive source, changing A1 presentation, or regenerating runtime behavior from installed source maps. Any later upstream UI synchronization SHALL be a separate explicit presentation change with provenance and acceptance evidence. Every retained source-derived unit SHALL begin with one canonical provenance header, generated from its source-ledger record, naming the upstream package, version, license, commit, and path, the recorded modifications, and each approved deviation by id; the ledger check SHALL require that header verbatim. The ledger updater SHALL take upstream identity from the installed packages and every reviewed field of an existing record from the ledger itself, so that reclassifying or deleting a retained unit is a ledger edit that the updater preserves rather than a script edit.

#### Scenario: Evaluate an engine-only Pi upgrade
- **WHEN** a candidate changes public engine behavior but A1 does not select upstream presentation changes
- **THEN** only the Pi integration and compatibility evidence SHALL require migration while accepted A1 feature and presentation contracts remain unchanged

#### Scenario: Adopt an upstream UI improvement
- **WHEN** maintainers choose to synchronize an upstream private UI change
- **THEN** that work SHALL be planned and reviewed as an A1 presentation change independently from engine compatibility

#### Scenario: Regenerate the source ledger after a port is reclassified or deleted
- **WHEN** a retained unit has been reclassified to public reuse or its owned copy deleted and the ledger updater runs
- **THEN** the regenerated ledger SHALL keep the reviewed classification, destination, status, modifications, and deviations of every existing record while refreshing upstream hashes and line counts
- **AND** it SHALL rewrite each remaining owned copy's provenance header from its record and record the copy's hash, and its check mode SHALL report any header or ledger drift without writing
