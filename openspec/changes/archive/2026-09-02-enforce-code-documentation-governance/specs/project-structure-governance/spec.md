## MODIFIED Requirements

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
