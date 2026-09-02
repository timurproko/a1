# Project Structure Governance Specification

## Purpose

Defines enforceable repository ownership, dependency, testing, documentation, and hygiene rules that keep the accepted A1 baseline small as independent features are added.

## Requirements

### Requirement: Every production module has one current owner
Each production source file SHALL belong to one named foundation area or feature and SHALL implement a current contract exercised by production entry points or an explicitly retained public boundary. Code SHALL NOT remain solely for historical reference, speculative reuse, superseded architecture, or a deferred change.

#### Scenario: Audit finds an unreachable module
- **WHEN** a production module has no current entry-point reachability, public consumer, or active contract
- **THEN** the baseline consolidation SHALL delete it or move the required behavior under a current owner rather than retaining it as dormant code

#### Scenario: Historical implementation is useful for reference
- **WHEN** removed behavior may help a future investigation
- **THEN** Git/OpenSpec history SHALL remain the reference and the obsolete implementation SHALL not remain in the active production tree

### Requirement: Features are cohesive and expose one public entry
Each product feature SHALL own its implementation, tests, settings contract, and feature documentation under a recognizable feature name. Cross-feature production imports SHALL use the provider's public entry or an explicit foundation contract; consumers SHALL NOT deep-import another feature's private internals.

#### Scenario: New feature is introduced
- **WHEN** a feature adds multiple implementation files or owns settings
- **THEN** those files SHALL be grouped under one feature directory with a thin public entry and private internals

#### Scenario: Another feature needs a capability
- **WHEN** one feature consumes behavior owned by another
- **THEN** the dependency SHALL pass through the provider's declared public contract and architecture checks SHALL reject private deep imports

### Requirement: Foundation areas remain product-agnostic
Shared lifecycle, protocol, release, storage, supervision, and terminal-attachment foundations SHALL not import product features or select behavior from Pi identity, extension identity, executable text, arguments, or visible terminal content. A generic `core`, `common`, `utils`, or `misc` area SHALL NOT become an unowned dumping ground.

#### Scenario: Feature requires shared logic
- **WHEN** logic is needed by multiple features
- **THEN** it SHALL move to a specifically named foundation contract only when it is product-agnostic and has more than one real owner

#### Scenario: Helper has one consumer
- **WHEN** a helper is used by only one feature and expresses that feature's policy
- **THEN** it SHALL remain private to that feature rather than being promoted to a generic shared area

### Requirement: The repository has one dependency authority
A1 SHALL use one repository-level package manifest, lockfile, and dependency installation for TypeScript production and test code. Feature source directories SHALL NOT contain nested `node_modules`, independent lockfiles, vendored runtime caches, generated logs, sessions, browser profiles, or package-manager state.

#### Scenario: Feature needs a package
- **WHEN** a feature introduces an external dependency
- **THEN** the dependency SHALL be reviewed and declared through the repository-level manifest and lockfile

#### Scenario: Generated runtime data appears in source
- **WHEN** a feature creates logs, sessions, caches, downloaded packages, browser data, or compiled output
- **THEN** it SHALL write to an ignored runtime/artifact location outside tracked feature source and repository policy SHALL reject accidental inclusion

### Requirement: Tests prove current contracts without duplicating implementation
Every retained test SHALL identify a current contract and the smallest independent boundary capable of proving it. Tests SHALL NOT be retained for deleted behavior, historical bug names alone, private implementation shape, duplicated assertions already covered at a stronger boundary, or self-modelled terminal behavior. A validation tier SHALL NOT perform an equivalent complete-repository documentation scan twice or reproduce an equivalent rendering producer/mode/workload matrix solely because separate test files consume different assertions; one authoritative captured result SHALL support all applicable assertions at that boundary.

#### Scenario: Multiple tests prove the same contract
- **WHEN** two tests exercise the same cause and observable outcome without distinct boundary risk
- **THEN** the baseline audit SHALL retain the clearest minimal test and remove or consolidate the redundant test

#### Scenario: Confirmed regression still has a live cause
- **WHEN** a historical regression maps to a current deterministic contract
- **THEN** its test SHALL be expressed under the current owner and named for the invariant rather than the obsolete implementation story

#### Scenario: Test belongs to deferred physical certification
- **WHEN** a test or fixture exists only to implement future physical-host automation
- **THEN** it SHALL be removed from the active baseline or moved into the separately authorized future change and SHALL not run on ordinary workstations or preview gates

#### Scenario: Documentation command and repository baseline overlap
- **WHEN** an authoritative documentation command already evaluates the selected repository scope in a validation tier
- **THEN** the ordinary Vitest remainder SHALL retain fixture-based policy tests but SHALL NOT repeat the same repository-wide baseline scan

#### Scenario: Rendering assertions share one workload result
- **WHEN** semantic parity, terminal paint, determinism, and damage budgets require the same rendering producer/mode/workload matrix
- **THEN** the gate SHALL capture that matrix once and SHALL evaluate every applicable assertion from the shared evidence

### Requirement: Documentation governance is incremental during development and complete nightly
Pull-request and local development documentation governance SHALL inspect policy-relevant files that are modified, newly added, or renamed to a new path in the current change. It MAY resolve bounded ownership, export, and dependency metadata needed to determine the changed file's policy obligations, but SHALL NOT scan every unchanged source file as a development prerequisite. A deletion without a modified or new destination SHALL require no documentation-content check. The ordinary fast tier SHALL execute one authoritative changed-file documentation check plus focused fixture-based policy tests, not a second complete-repository baseline scan.

The scheduled nightly workflow SHALL run one full documentation-governance review over every tracked policy-relevant file at the exact authoritative `origin/develop` commit. That review SHALL be platform-independent, SHALL execute once rather than once per release matrix platform, SHALL report all offending paths and rules, and SHALL gate successful nightly completion. Maintainers SHALL retain an explicit complete-review command and manual workflow path for on-demand use.

#### Scenario: Existing source file is modified
- **WHEN** a pull request modifies a policy-relevant tracked source file
- **THEN** development validation SHALL inspect the complete changed file against every applicable documentation rule
- **AND** a violation in that file SHALL fail the required pull-request gate

#### Scenario: New source file is added
- **WHEN** a pull request adds a policy-relevant source file
- **THEN** development validation SHALL classify its ownership and source role and SHALL inspect it against every applicable documentation rule

#### Scenario: Source file is renamed
- **WHEN** a policy-relevant file receives a new path
- **THEN** development validation SHALL treat the destination as a changed file and SHALL apply path-sensitive documentation rules at the new location

#### Scenario: Source file is only deleted
- **WHEN** a policy-relevant file is deleted without a modified or new destination
- **THEN** development documentation validation SHALL not attempt to inspect content that no longer exists

#### Scenario: Changed export needs bounded context
- **WHEN** documentation obligations for a changed file depend on its declared owner or public export relationship
- **THEN** the checker MAY resolve only the bounded metadata needed to classify that changed file
- **AND** it SHALL not turn that resolution into an unconditional complete-repository source scan

#### Scenario: Ordinary code pull request runs policy tests
- **WHEN** the fast tier validates a code pull request
- **THEN** fixture-based tests SHALL continue proving source roles, public contracts, comment hygiene, diagnostics, and changed-file selection behavior
- **AND** only one command SHALL inspect the pull request's real changed files

#### Scenario: Nightly review runs
- **WHEN** the scheduled nightly workflow selects the authoritative `origin/develop` source
- **THEN** one job SHALL inspect every tracked policy-relevant file at that exact commit
- **AND** any violation SHALL fail nightly completion with actionable evidence

#### Scenario: Complete review is requested manually
- **WHEN** a maintainer invokes the complete documentation command or its declared manual workflow
- **THEN** the same full tracked-repository invariant used nightly SHALL execute and report its timing and result

### Requirement: Documentation carries cross-cutting rationale
Cross-cutting architecture, feature contracts, operational procedures, and irreversible decisions SHALL live in concise maintained documents under `docs/architecture` or `docs/features`. Documentation SHALL describe current behavior and limitations rather than narrating milestone history that is already available in Git/OpenSpec.

#### Scenario: Architecture decision affects multiple modules
- **WHEN** a non-obvious decision constrains multiple owners or future work
- **THEN** it SHALL be documented once in an architecture document or short decision record and linked from relevant public entries when necessary

#### Scenario: Documentation describes completed redesign as future work
- **WHEN** an audit finds phrases such as `during redesign`, `temporary`, or `will be added later` that no longer match production state
- **THEN** the documentation SHALL be rewritten as a current invariant or removed

### Requirement: Source comments are sparse and purposeful
Source comments SHALL be used only for non-obvious rationale, invariants, safety or security constraints, platform behavior, compatibility, protocols, concurrency, performance, provenance, tracked follow-up work, tool-required suppressions, and public contract semantics. Comments SHALL NOT restate code, preserve implementation history, describe obvious control flow, hold commented-out code, use summary tags, attach multiple documentation blocks to one declaration, or serve as untracked TODO storage.

Every first-party TypeScript class exposed through a declared owner public entry SHALL have exactly one concise JSDoc contract at its declaration that identifies the class responsibility and any material ownership, lifecycle, or safety boundary. JSDoc SHALL NOT be used on private or protected members. Exported status alone SHALL NOT require documentation for every function, type, method, constructor, or property; names, types, and decomposition SHALL remain the default explanation for ordinary behavior.

Retained first-party implementation comments SHALL declare one accepted intent: `Invariant`, `Rationale`, `Security`, `Platform`, `Compatibility`, `Protocol`, `Concurrency`, `Performance`, or `Provenance`. Follow-up markers SHALL identify a tracked issue, and suppression directives SHALL include a reason. These hygiene rules SHALL apply to first-party production, test, tooling, and native source according to language role. Synchronized, vendored, generated, build, and runtime sources SHALL be excluded from style rewriting only through explicit repository classification, and synchronized source SHALL retain verifiable provenance.

#### Scenario: Type and name already explain behavior
- **WHEN** a comment merely repeats a function name, branch condition, type, assignment, loop, or method inventory
- **THEN** the comment SHALL be removed and unclear code SHALL be clarified through naming, typing, or decomposition

#### Scenario: Public owner class exposes a contract
- **WHEN** a first-party TypeScript class is reachable through its declared owner's public entry
- **THEN** its declaration SHALL carry exactly one concise JSDoc contract describing its responsibility
- **AND** the contract SHALL state a material ownership, lifecycle, or safety boundary when one exists

#### Scenario: Ordinary member is self-explanatory
- **WHEN** an exported function, type, method, constructor, property, private class, or other declaration is already explained by its name and type and has no non-obvious semantic contract
- **THEN** repository policy SHALL NOT require a boilerplate documentation block solely because that declaration exists or is exported

#### Scenario: Internal state needs explanation
- **WHEN** a private field or implementation step depends on a non-obvious invariant or constraint
- **THEN** any retained comment SHALL use the applicable accepted intent and SHALL NOT use JSDoc on a private or protected member

#### Scenario: Ownership cleanup relies on subtle proof
- **WHEN** safe process cleanup or terminal ownership depends on a non-obvious invariant
- **THEN** a concise `Invariant`, `Security`, or `Protocol` comment MAY remain at the enforcement point and the broader rule SHALL live in architecture documentation

#### Scenario: Follow-up or suppression is necessary
- **WHEN** first-party source requires a TODO or FIXME marker or a compiler, linter, coverage, or governance suppression
- **THEN** a follow-up marker SHALL identify its tracked issue and a suppression SHALL state why the exceptional directive is safe

#### Scenario: Source is not first-party maintained code
- **WHEN** a tracked source path is synchronized, vendored, or generated rather than maintained as first-party code
- **THEN** repository policy SHALL apply its declared exclusion without rewriting that source's documentation style
- **AND** synchronized source SHALL retain the provenance evidence required by its owner

### Requirement: Repository governance is executable
Architecture, documentation, and hygiene rules SHALL be enforced by deterministic checks that report stable rule identifiers and actionable path, line, and symbol violations where applicable. Checks SHALL cover feature dependency direction, forbidden deep imports, nested package/dependency state, generated artifacts in tracked source, prohibited terminal interception, stale redesign markers in current production documentation, production files with no declared ownership, and the complete first-party code-documentation policy. The code-documentation gate SHALL inspect the complete applicable tracked baseline without a grandfathered count, path allowlist, or accepted-violation snapshot and SHALL run in both fast pull-request validation and full release validation.

#### Scenario: New code violates a boundary
- **WHEN** a change introduces a forbidden dependency, unowned source location, nested lockfile, prohibited terminal mechanism, or code-documentation violation
- **THEN** the applicable repository gate SHALL fail with the offending path and stable violated-rule identifier
- **AND** it SHALL report the line and declaration symbol when that information is available

#### Scenario: Documentation policy behavior is changed
- **WHEN** an accepted or rejected documentation form or source classification is added or changed
- **THEN** focused governance tests SHALL prove the policy result with representative valid and invalid fixtures

#### Scenario: Existing violation remains when enforcement is enabled
- **WHEN** the complete applicable first-party baseline contains a code-documentation violation
- **THEN** fast and full validation SHALL fail rather than recording or incrementally grandfathering the violation

#### Scenario: Excluded source is scanned
- **WHEN** the documentation gate encounters synchronized, vendored, generated, build, or runtime source
- **THEN** it SHALL apply the repository's explicit classification and provenance rules instead of treating accidental path omission as an exemption

#### Scenario: Governance passes
- **WHEN** the complete baseline check runs
- **THEN** every production file, test, document, workflow, dependency, and applicable source comment SHALL satisfy its current owner and governance contract
- **AND** all mandatory architecture, documentation, type, unit, integration, update, package, and release checks SHALL pass

### Requirement: Transparent and composed scope remain explicit
The accepted transparent baseline SHALL support one direct full-viewport foreground terminal session and SHALL not claim A1-managed arbitrary-CLI tabs, resident terminal surfaces, input routing among internal tabs, or visual reconnection. After the baseline/profile change completes, A1 SHALL create a separate follow-up plan for evolving bare `a1` into the multi-agent UX. That plan SHALL distinguish structured/RPC agent surfaces from arbitrary interactive CLI tabs and SHALL define a composed-terminal authority and certification plan for the latter.

#### Scenario: Product planning requests multiple arbitrary CLI tabs
- **WHEN** the future bare-`a1` multi-agent UX needs inactive interactive CLIs to remain resident and switchable inside A1
- **THEN** planning SHALL introduce a separate composed-terminal capability rather than modifying transparent mode or reactivating raw relay experiments implicitly

#### Scenario: Multi-agent planning begins
- **WHEN** the accepted baseline and three launch profiles are complete
- **THEN** the next change SHALL plan bare `a1` as the multi-agent UX entry point while preserving `a1 pi` as the prerelease Pi comparison

### Requirement: Live repository surfaces use centralized A1 identity
Production source, scripts, workflows, current tests and fixtures, current documentation, main specifications, and non-archived changes SHALL use the A1 product-identity authority for executable identity values and SHALL NOT define former product identity literals independently. Repository validation SHALL fail on an unapproved legacy occurrence or an identity-bearing literal outside the declared authority and its explicit boundary tests.

#### Scenario: Feature adds a branded diagnostic
- **WHEN** a feature needs to display the product name
- **THEN** it SHALL obtain `A1` from the product-identity authority rather than embedding a local display-name string

#### Scenario: Script needs package or command metadata
- **WHEN** a build, release, or governance script needs the current command or package name
- **THEN** it SHALL read or derive the value from the authoritative product identity or package manifest and SHALL NOT maintain a divergent copy

#### Scenario: Legacy name is reintroduced
- **WHEN** a live repository surface introduces a former product identity literal outside an approved historical or rejection/deprecation exception
- **THEN** the non-desktop repository gates SHALL fail with the file and legacy occurrence

#### Scenario: Archived record contains the old identity
- **WHEN** an archived change or immutable historical evidence contains a factually correct legacy identity
- **THEN** governance SHALL preserve and allow that record while proving no live runtime or generation path consumes it as current identity

### Requirement: Development work is isolated and integrated once
Planning and implementation SHALL occur in one detached worktree at `{working-dir}/.worktrees/<task-id>`, where `{working-dir}` is the agent session's initial working directory, based on current `origin/develop` unless another base is selected. `.worktrees/` SHALL be a child of that working directory; a sibling checkout path such as `{working-dir}-<task-id>` SHALL NOT be used. The primary worktree SHALL remain on `develop` for integration only. Coherent work for one request SHALL use one temporary pull-request branch, one relevant validation cycle, and one integration; planning SHALL NOT be merged separately when implementation is part of the same approved request.

#### Scenario: Work begins
- **WHEN** a request requires repository changes
- **THEN** work SHALL begin in one detached worktree at `{working-dir}/.worktrees/<task-id>` rather than editing the primary worktree or creating a sibling checkout

#### Scenario: Approved implementation has ready scope
- **WHEN** the user requests implementation and its planning artifacts are ready
- **THEN** the agent SHALL use those artifacts as context and begin implementation without proposing, revising, or separately merging them

#### Scenario: Work is integrated
- **WHEN** the requested change is coherent and its relevant validation passes
- **THEN** it SHALL integrate through one pull request, after which its temporary remote branch and clean worktree SHALL be removed
- **AND** unintegrated commits or changes SHALL never be discarded during cleanup
