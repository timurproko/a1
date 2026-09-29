## MODIFIED Requirements

### Requirement: The complete suite remains available on demand

The complete non-physical automated suite SHALL remain runnable locally (`npm run test:full`) and through manual workflow dispatch, so a maintainer can widen validation when a change feels risky, and SHALL run on a nightly schedule against the current `develop` tip so exhaustive owners and enforced budgets are exercised every day independent of publication. Routine development SHALL NOT require it.

Standalone and selected PR-attached Full regression SHALL execute the complete Windows Node 22 and Node 24 coverage through reviewed parallel hosted-runner shards. Each Windows runtime SHALL have `core`, `resource`, `rendering`, and `package` shard evidence derived from one canonical complete plan. Every canonical command and test invocation SHALL belong to exactly one shard, and one successful Windows lane result SHALL be reconstructed only from all four exact-source, exact-run, exact-attempt, exact-runtime shard results. Missing, duplicate, stale, malformed, failed, cancelled, or unexpected shard evidence SHALL fail the applicable lane and required aggregate. Linux, macOS, local full validation, and publication validation MAY retain one sequential complete plan.

A scope that the complete-regression lanes cannot run MAY be excluded from the `full-release` plan only through an explicit `fullReleaseExclusion` reason on its definition in `config/validation-suites.json`. The only permitted exclusion is the Windows-only `terminal-host` scope, whose pull-request owner validates every change to its paths. Adding another exclusion SHALL require a reviewed change to this requirement.

#### Scenario: Maintainer requests full validation

- **WHEN** the maintainer dispatches the full-regression workflow or runs the full tier locally
- **THEN** every non-physical scope without a declared `fullReleaseExclusion` SHALL execute and report per-scope timing and outcomes
- **AND** workflow-dispatched Windows coverage SHALL reconstruct each runtime lane from all four required shards while local validation MAY remain sequential

#### Scenario: Nightly schedule fires

- **WHEN** the scheduled Full regression runs
- **THEN** it SHALL validate the current `develop` tip with every pull-request and exhaustive owner whose scopes are not declared `fullReleaseExclusion`, and with enforced startup budgets
- **AND** its failure SHALL be visible as a workflow failure without changing publication authority

#### Scenario: Windows shard evidence is complete

- **WHEN** all four Windows shards for one runtime belong to the same exact source, canonical plan, workflow run, and attempt and every assigned outcome succeeds
- **THEN** validation SHALL reconstruct one complete result in canonical outcome order and bind it to the existing Windows runtime lane
- **AND** the protected complete-regression aggregate SHALL continue to require that lane alongside the other three platform/runtime lanes

#### Scenario: Windows shard evidence is incomplete

- **WHEN** a required shard is missing, duplicated, stale, malformed, cancelled, failed, belongs to another runtime or plan, or omits or duplicates assigned work
- **THEN** no successful Windows lane envelope SHALL be produced
- **AND** the final complete-regression aggregate SHALL fail closed with available shard failure evidence

#### Scenario: A scope is excluded from complete regression

- **WHEN** a scope definition declares `fullReleaseExclusion`
- **THEN** it SHALL carry a non-empty reason, SHALL NOT be included by `full-release`, and SHALL be `terminal-host`

### Requirement: Validation selection and timing are auditable

Every modular development gate and complete-regression shard SHALL emit its selected scopes or assigned canonical work, classification or shard identity, exact source context, bounded reasons or plan digest, elapsed time, and result in machine-readable evidence and a concise workflow summary. The required aggregate SHALL bind those outcomes to the current pull-request head or standalone source and SHALL reject a missing, stale, unsuccessful, duplicated, or unexpectedly skipped required scope or shard.

#### Scenario: Maintainer inspects a rendering selection

- **WHEN** a pull request selects `smoke` or `full` rendering evidence
- **THEN** the workflow summary SHALL identify the changed input and classification reason that selected it

#### Scenario: Required modular result is stale

- **WHEN** a modular job result belongs to an older pull-request head or a different classifier result
- **THEN** the aggregate required check SHALL fail

#### Scenario: Maintainer inspects Windows Full regression

- **WHEN** Windows complete coverage executes in parallel shards
- **THEN** the workflow and merged evidence SHALL report each shard's assigned owners, elapsed time, result, and overlap context
- **AND** a failed owner SHALL remain attributable to its canonical Windows runtime and shard job
