## ADDED Requirements

### Requirement: Implementation identifiers use semantic roles instead of the product name
All implementation identifiers across production, tooling, native code, tests, and generated source SHALL be named for their architectural or behavioral responsibility. This is a repository-global naming rule, not a Pi-boundary-only convention. The product name SHALL NOT be used as an ownership namespace or generic prefix/suffix for classes, interfaces, functions, variables, fields, or constants, including forms such as `A1OwnedEditor`, `A1Runtime`, `a1Client`, or `a1Manifest`. Exact externally observable identity tokens centralized by product identity governance—such as package names, command/profile literals, state paths, schema values, and `A1_*` environment-variable names—MAY retain the product name, but local bindings that read or write those tokens SHALL remain role-named. A deterministic repository gate SHALL enforce this rule.

#### Scenario: Product-prefixed implementation identifier is introduced
- **WHEN** source, tooling, native, or test code introduces an internal identifier whose ownership is expressed by an `A1` or `a1` product-name prefix or suffix
- **THEN** deterministic naming governance SHALL fail with the identifier and source path and SHALL require a responsibility-based name

#### Scenario: External product identity token is required
- **WHEN** code must read, write, validate, or test an exact externally observable A1 environment key, command, package name, profile id, state path, or schema value
- **THEN** the exact token MAY remain in a string or centralized identity authority while surrounding implementation identifiers SHALL use semantic role names

### Requirement: Retained Pi-derived presentation is A1-owned and independent of engine upgrades
Attributed source-derived UI units retained by A1 SHALL be treated as A1-owned baseline code. Updating the Pi engine SHALL NOT automatically require adopting new private Pi interactive source, changing A1 presentation, or regenerating runtime behavior from installed source maps. Synchronizing an upstream UI change SHALL be a separate explicit presentation change with recorded provenance.

Every retained source-derived unit SHALL begin with one canonical provenance header, generated from its source-ledger record, naming the upstream package, version, license, commit, and path, the recorded modifications, and each approved deviation by id; the ledger check SHALL require that header verbatim. The ledger updater SHALL take upstream identity from the installed packages and every reviewed field of an existing record from the ledger itself, so that reclassifying or deleting a retained unit is a ledger edit that the updater preserves rather than a script edit. Each retained unit's record SHALL name its upgrade strategy: `three-way` for a unit that follows upstream and is three-way merged on upgrade, or `keep-owned` for a unit A1 keeps on purpose, which is never merged and whose upstream delta is only reported.

The pinned version and commit every inventory, ledger, and check compares itself to SHALL come from one identity authority (the dependency authority for versions, the interactive baseline for the commit) so an upgrade moves them in one place. The package-root export surface of the pinned packages and the upstream features the pinned interactive UI presents SHALL each be recorded as a reviewed baseline: the export surface with each export's kind, declaration hash, and A1 consumers; the feature matrix with one row per upstream feature carrying A1's disposition (`pinned`, `owned` with its behavior and test, `diverged` with its approved deviation, `declined` with a reason, `pending`, or `retired`). A refresher SHALL rewrite the upstream side of both baselines without changing a reviewed disposition, creating a row upstream newly presents as `pending`, and a governance check SHALL fail on a pending row, on a disposition whose evidence is missing, and on a row whose upstream feature no longer exists unless it is marked retired.

#### Scenario: Evaluate an engine-only Pi upgrade
- **WHEN** a candidate changes public engine behavior but A1 does not select upstream presentation changes
- **THEN** only the Pi integration SHALL require migration while A1 feature and presentation contracts remain unchanged

#### Scenario: Adopt an upstream UI improvement
- **WHEN** maintainers choose to synchronize an upstream private UI change
- **THEN** that work SHALL be an A1 presentation change independent from engine compatibility

#### Scenario: Regenerate the source ledger after a port is reclassified or deleted
- **WHEN** a retained unit has been reclassified to public reuse or its owned copy deleted and the ledger updater runs
- **THEN** the regenerated ledger SHALL keep the reviewed classification, destination, status, modifications, deviations, and upgrade strategy of every existing record while refreshing upstream hashes and line counts
- **AND** it SHALL rewrite each remaining owned copy's provenance header from its record and record the copy's hash, and its check mode SHALL report any header or ledger drift without writing

#### Scenario: A new upstream feature awaits a disposition
- **WHEN** the refreshed upstream manifests or changelog present a command, keybinding, event, setting, component, or feature the matrix has no row for
- **THEN** the refresher SHALL create the row as pending
- **AND** the governance check SHALL fail until a disposition with its evidence is recorded

### Requirement: A split terminal module identity is reported at launch
Launch SHALL compare what A1 resolves against what pinned Pi resolves, and SHALL
report a difference on the error stream before the interface is drawn. The
failure this prevents produces no error of its own — extension surfaces simply do
not appear — so its detection SHALL NOT depend on someone noticing what is
missing.

Reporting SHALL NOT prevent launch: a degraded interface is more useful than
none, and the report SHALL name both resolved paths so the cause is actionable.

#### Scenario: The two resolutions differ
- **WHEN** A1 and pinned Pi resolve the terminal package to different files
- **THEN** launch SHALL report both paths and say that extension UI may not render
- **AND** SHALL continue starting

#### Scenario: Either side cannot be resolved
- **WHEN** the package name or pinned Pi's copy cannot be resolved at all
- **THEN** launch SHALL report which side failed and why, and SHALL continue starting

#### Scenario: Both sides agree
- **WHEN** the two resolutions name the same file
- **THEN** launch SHALL report nothing

## MODIFIED Requirements

### Requirement: Pi upgrades use one exact compatibility authority and bounded candidate gates
The repository package manifest and lockfile SHALL remain the dependency authority for the exact compatible Pi package family. Version, source-provenance, fixtures, and evidence metadata SHALL be derived from or checked against that authority, and a candidate SHALL pass compile-time, runtime, architecture, workflow, extension, TUI, packaging, explicit-oracle, and regression gates before activation. The isolated candidate evaluation SHALL run on every supported development platform, starting the package manager through the platform's own executable shim without a shell. The hand-maintained pinned-Pi inventories (modal transition graph, presenter ownership, interactive behavior baseline) SHALL be re-resolvable against a candidate by one script: every source anchor that still matches is kept, one that matches only ignoring whitespace is rewritten to the matching line, one that matches nowhere marks its entry `orphaned`, a behavior line range that no longer contains its anchors moves to its named symbols' span, source hashes and upstream manifests are regenerated, and an interactive component the graph has never recorded is reported as unmapped; orphaned and unmapped entries SHALL fail the inventory checks rather than pass silently.

#### Scenario: Evaluate a candidate version
- **WHEN** maintainers propose a newer Pi version
- **THEN** an isolated candidate run SHALL report all required adapter migrations and SHALL NOT change the accepted dependency until mandatory compatibility gates pass

#### Scenario: Evaluate a candidate on Windows
- **WHEN** the candidate evaluator runs on a Windows workstation
- **THEN** it SHALL install, compile, and probe the candidate exactly as on the Linux runner, and a failed stage SHALL report the package manager's own message rather than a process-start error

#### Scenario: Compatibility metadata drifts
- **WHEN** hardcoded or generated version evidence differs from the package manifest or lockfile
- **THEN** governance SHALL fail with the stale authority rather than allowing mixed Pi versions

#### Scenario: Candidate passes
- **WHEN** every mandatory compatibility, product regression, package, and oracle gate passes against one exact candidate dependency set
- **THEN** A1 MAY update the exact pin without requiring workspace-domain or feature-contract changes

#### Scenario: Re-resolve the inventories against a candidate
- **WHEN** the inventory sync runs against an installed Pi whose interactive sources moved, reformatted, dropped, or added anchored code
- **THEN** unchanged anchors and ranges SHALL stay as reviewed, reformatted anchors and moved ranges SHALL be rewritten, dropped anchors SHALL mark their entries orphaned, and new components SHALL be reported unmapped
- **AND** its check mode SHALL report drift, orphans, and unmapped components without writing and SHALL pass on the current pin

## REMOVED Requirements

### Requirement: Repository-global identifiers use semantic roles instead of the product name
**Reason**: One scenario described a finished one-time rename performed when the boundary was first certified.
**Migration**: Covered by "Implementation identifiers use semantic roles instead of the product name".

### Requirement: A1-owned presentation is independent from Pi engine upgrades
**Reason**: Most of the text and eight scenarios specified how an upgrade proposal is delivered: the nightly draft pull request, its body layout, report comments, skip labels, refresh runs and readiness promotion.
**Migration**: The presentation-independence, provenance, and baseline rules are kept by "Retained Pi-derived presentation is A1-owned and independent of engine upgrades"; proposal delivery is owned by the shared delivery workflow and the upstream-sync automation.

### Requirement: A split terminal module identity is reported, never silent
**Reason**: A scenario title referred to an import alias that the product does not use.
**Migration**: Covered by "A split terminal module identity is reported at launch".
