## MODIFIED Requirements

### Requirement: A1-owned presentation is independent from Pi engine upgrades
Attributed source-derived UI units retained by A1 SHALL be treated as A1-owned baseline code. Updating the Pi engine SHALL NOT automatically require adopting new private Pi interactive source, changing A1 presentation, or regenerating runtime behavior from installed source maps. Any later upstream UI synchronization SHALL be a separate explicit presentation change with provenance and acceptance evidence. Every retained source-derived unit SHALL begin with one canonical provenance header, generated from its source-ledger record, naming the upstream package, version, license, commit, and path, the recorded modifications, and each approved deviation by id; the ledger check SHALL require that header verbatim. The ledger updater SHALL take upstream identity from the installed packages and every reviewed field of an existing record from the ledger itself, so that reclassifying or deleting a retained unit is a ledger edit that the updater preserves rather than a script edit. Each retained unit's record SHALL name its upgrade strategy: a unit that follows upstream is three-way merged, and a unit A1 keeps on purpose is never merged, its upstream delta is recorded for review, and the proposal names it as kept. A newer published Pi version SHALL be proposed, not adopted: a nightly job SHALL bump the pins, evaluate the candidate in isolation, three-way merge each retained unit that follows upstream from its old upstream, its new upstream, and the A1 copy, regenerate the ledger, headers, inventories, and parity evidence, run the gates, and open one draft pull request whose body names the version delta, the upstream changelog excerpt, the cleanly merged, conflicted, and kept units, the orphaned and unmapped inventory entries, the public API delta with the A1 consumers of every removed or changed export, the upstream features awaiting an A1 disposition, and every gate verdict; conflicts, orphans, adoption items, pending features, and failed gates SHALL remain in the proposal as review items, a gate that cannot run because conflict markers remain SHALL be recorded as blocked by those units rather than as failed, and nothing SHALL merge without a human. The sync SHALL never replace a proposal a human has continued: when the proposal branch carries commits the sync did not author, it SHALL leave the branch and the body's reviewer-owned sections unchanged and SHALL report its fresh verdicts as a comment, and a refresh SHALL re-run the derived steps and gates on the reviewer's head. The pinned version and commit every inventory, ledger, and check compares itself to SHALL come from one identity authority (the dependency authority for versions, the interactive baseline for the commit) so an upgrade moves them in one place. The package-root export surface of the pinned packages and the upstream features the pinned interactive UI presents SHALL each be recorded as a reviewed baseline: the export surface with each export's kind, declaration hash, and A1 consumers; the feature matrix with one row per advertised or hidden command, keybinding, session event, settings callback, presented setting, stateful component, and changelog feature, carrying A1's disposition (reused as pinned, owned with its behavior and test, diverged with its approved deviation, declined with a reason, or pending). A refresher SHALL rewrite the upstream side of both baselines without changing a disposition, and a governance check SHALL fail on a pending row, on a disposition whose evidence is missing, and on a row whose upstream feature no longer exists unless it is marked retired.

#### Scenario: Evaluate an engine-only Pi upgrade
- **WHEN** a candidate changes public engine behavior but A1 does not select upstream presentation changes
- **THEN** only the Pi integration and compatibility evidence SHALL require migration while accepted A1 feature and presentation contracts remain unchanged

#### Scenario: Adopt an upstream UI improvement
- **WHEN** maintainers choose to synchronize an upstream private UI change
- **THEN** that work SHALL be planned and reviewed as an A1 presentation change independently from engine compatibility

#### Scenario: Regenerate the source ledger after a port is reclassified or deleted
- **WHEN** a retained unit has been reclassified to public reuse or its owned copy deleted and the ledger updater runs
- **THEN** the regenerated ledger SHALL keep the reviewed classification, destination, status, modifications, deviations, and upgrade strategy of every existing record while refreshing upstream hashes and line counts
- **AND** it SHALL rewrite each remaining owned copy's provenance header from its record and record the copy's hash, and its check mode SHALL report any header or ledger drift without writing

#### Scenario: Propose a published upgrade
- **WHEN** the registry publishes a Pi version newer than the pin and the nightly sync runs
- **THEN** a draft pull request on `chore/pi-<version>` SHALL carry the bumped pins, the merged copies with any conflict markers, the kept copies unchanged, the regenerated derived state, the scaffolded OpenSpec change, and a body listing every gate verdict and review item
- **AND** a candidate that fails evaluation or conformance SHALL still be proposed with the failure named, and the pin SHALL stay unchanged on the default branch until a human merges

#### Scenario: Report the public API delta
- **WHEN** the candidate removes or changes the declaration of a package-root export that an A1 module imports
- **THEN** the proposal SHALL list that export with its change and each consuming module as an adoption item
- **AND** the complete compile output of the isolated evaluation SHALL be kept in the proposal artifact and summarized per file in the body

#### Scenario: A new upstream feature awaits a disposition
- **WHEN** the candidate's manifests or changelog present a command, keybinding, event, setting, component, or feature the matrix has no row for
- **THEN** the proposal SHALL create the row as pending and list it under new upstream features
- **AND** the governance check SHALL fail on `develop` until a reviewer records the disposition with its evidence

#### Scenario: A gate is blocked by conflict markers
- **WHEN** the three-way merge leaves conflict markers in any retained unit
- **THEN** the proposal SHALL record the gates that compile the tree as blocked by those units instead of running them to fail
- **AND** the isolated evaluation and engine conformance SHALL still report the candidate's verdicts

#### Scenario: The sync re-runs against a proposal a human continued
- **WHEN** the proposal branch for the candidate version carries a commit the sync did not author
- **THEN** the sync SHALL NOT push to that branch or rewrite the reviewer-owned sections of the body
- **AND** it SHALL post its fresh report as a pull-request comment and succeed

#### Scenario: A reviewer asks for fresh verdicts
- **WHEN** the sync is dispatched with refresh for an open proposal
- **THEN** it SHALL re-run the derived steps and gates on the proposal branch's head without bumping, evaluating, or merging again
- **AND** it SHALL replace only the report between its markers in the body
