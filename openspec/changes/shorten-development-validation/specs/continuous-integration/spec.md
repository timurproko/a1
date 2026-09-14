## MODIFIED Requirements

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, copies, deletions, rename sources, and rename destinations. Rendering impact SHALL use transitive production reachability from declared rendering evidence entry points together with explicit invalidators for dynamically loaded resources, terminal/package identity, validation configuration, and evidence infrastructure. Startup, exact-package integration, image/history compatibility, and platform containment selection SHALL likewise use declared scope ownership, base/head transitive dependency reachability, and reviewed invalidators for dynamic process entries, assets, package resolution, native artifacts, and build inputs. Classification SHALL compare sufficient base and head state to recognize removed or renamed dependencies. An unavailable diff, unresolved dependency, unsupported changed input, or classifier failure SHALL select conservative applicable coverage rather than silently skip validation; inability to establish the authoritative head or a trustworthy selection SHALL block the aggregate.

Every changed retained test SHALL select its owning scope, including tests outside the ordinary fast tier. Changes to shared test support SHALL select all affected owners. Unknown ownership SHALL select all applicable integration scopes or block validation, not produce an empty selection. The complete ordinary fast tier, typecheck, architecture, and existing documentation, naming, and rendering policies SHALL remain required for applicable code pull requests. Manual Development validation without a complete trusted change comparison SHALL run all retained development scopes; manual Full regression and nightly/release coverage SHALL not be reduced by PR impact selection.

#### Scenario: Changed source is transitively rendered
- **WHEN** a changed production file is reachable from a declared rendering evidence entry point through direct or transitive dependencies
- **THEN** the classifier SHALL select rendering evidence and record at least one bounded dependency reason

#### Scenario: Unrelated foundation changes
- **WHEN** every changed code path is outside the rendering dependency surface and no rendering invalidator changed
- **THEN** the classifier SHALL select no rendering scope
- **AND** the ordinary fast and architecture gates SHALL still run

#### Scenario: Reachable dependency is deleted or renamed
- **WHEN** a rendering-reachable file in the merge-base revision is deleted or renamed
- **THEN** the classifier SHALL recognize its base-revision impact even when the path is absent from the head graph

#### Scenario: Classification cannot prove safety
- **WHEN** the complete diff or dependency classification cannot be obtained or contains an unclassified relevant input
- **THEN** development validation SHALL select full rendering and conservative applicable integration coverage, or block when trustworthy execution cannot be established
- **AND** the reason SHALL be visible in machine-readable and human-readable evidence

#### Scenario: A transitive launch dependency changes
- **WHEN** a changed module is reachable from a packaged launch entry at either revision, even outside a launcher directory
- **THEN** Windows startup validation and every other impacted integration owner SHALL be selected with bounded reasons

#### Scenario: Only unrelated governance tooling changes
- **WHEN** complete classification proves the changed tooling is outside all product integration surfaces and no shared invalidator changed
- **THEN** unrelated startup and platform integration scopes SHALL be explicitly unselected
- **AND** all ordinary fast tests and applicable governance gates SHALL remain required

#### Scenario: Integration tests or shared fixtures change
- **WHEN** a retained integration test or a supporting subprocess entry, asset, or shared fixture changes without production changes
- **THEN** all affected retained test owners SHALL execute in current-head PR validation
- **AND** deleting or renaming support SHALL not evade base-revision ownership

#### Scenario: Validation selection infrastructure changes
- **WHEN** scope ownership, workflow selection, dependency resolution policy, package dependencies, or common build configuration changes
- **THEN** classification SHALL select every integration scope invalidated by that change
- **AND** selector or ownership-policy changes SHALL require all retained development integration scopes

#### Scenario: Manual development validation has no trusted comparison
- **WHEN** Development validation is manually dispatched without a complete authoritative change comparison
- **THEN** every retained development scope SHALL run rather than treating an empty diff as proof of no impact

## ADDED Requirements

### Requirement: Independent development partitions do not serialize feedback
Development validation SHALL schedule the ordinary fast remainder, its declared resource-sensitive partition, and selected package integration independently after their actual prerequisites. Resource-sensitive files SHALL remain non-file-parallel on an isolated runner, with the same authoritative membership and unchanged timeout semantics used by full validation. No selected test SHALL be duplicated between partitions on the same platform/runtime merely because job boundaries changed. Cross-platform and cross-runtime executions SHALL remain distinct required evidence where selected.

The single protected-branch aggregate SHALL require every scope selected for the current head and selection identity, including mandatory fast partitions. It SHALL reject missing, failed, cancelled, stale, malformed, or unexpectedly skipped results. A skipped integration scope SHALL be acceptable only when the current trustworthy selection explicitly excludes it. Independent jobs SHALL not share mutable application state or owned process trees.

#### Scenario: Fast work and resume checks are selected
- **WHEN** a code PR requires the fast remainder, resource-sensitive files, and package resume integration
- **THEN** resource-sensitive and resume jobs SHALL not depend on completion of the fast remainder solely for sequencing
- **AND** all three results SHALL be required before the aggregate succeeds

#### Scenario: Serialization would be replaced by contention
- **WHEN** a resource-sensitive partition is scheduled alongside ordinary validation
- **THEN** it SHALL execute on an isolated runner rather than concurrently on the ordinary runner
- **AND** it SHALL retain one-file-at-a-time execution and all existing assertions and timeouts

#### Scenario: A selected partition is skipped
- **WHEN** the current selection requires an integration or fast partition but that partition is missing, cancelled, or skipped
- **THEN** the aggregate SHALL fail even if every completed partition passed

#### Scenario: Evidence belongs to another selection
- **WHEN** a successful result belongs to another head, run, or selection identity
- **THEN** it SHALL not satisfy the current aggregate

### Requirement: Reused validation setup retains exact identity
Validation SHALL avoid repeated successful builds and candidate packing within a job when the consuming scopes use unchanged source, platform, architecture, toolchain, dependencies, and build inputs. Reuse SHALL depend on verified prerequisite evidence and present artifacts rather than an unchecked environment flag. Missing or incompatible setup evidence SHALL cause fresh preparation or an explicit failure before tests, never successful validation with stale artifacts.

Persistent caches SHALL be limited to integrity-checked dependency downloads and compatible native compiler intermediates, with validation of resulting artifacts after restoration. Clean-install gates SHALL still install exact candidate bytes into fresh private prefixes. Mutable installed fixtures, active releases, certification state, launch compile caches, and prior performance results SHALL not be restored as substitutes for current-head execution. Publication SHALL retain its existing pack-once and exact-byte authority.

#### Scenario: Installation already built the job's candidate
- **WHEN** dependency installation successfully builds the unchanged selected source and records compatible prerequisite evidence
- **THEN** later scopes in that job SHALL consume that build without rebuilding it

#### Scenario: A ready marker is stale or forged
- **WHEN** setup is marked ready but its inputs differ or required artifacts cannot be verified
- **THEN** validation SHALL rebuild or fail before consuming those artifacts

#### Scenario: A package download cache is warm
- **WHEN** a clean-install scenario can reuse cached dependency tarballs
- **THEN** it SHALL verify their integrity and install into a new isolated prefix
- **AND** first-attempt startup evidence SHALL not be replaced by warmed fixture or prior-run evidence

### Requirement: Feedback optimization is measured without weakening coverage
Development validation SHALL report selection time, available queue time, setup/build/pack time, repository gate time, per-scope outcomes, and aggregate elapsed time separately. Package fixtures SHALL report bounded phase timings for installation, materialization, certification/warmup, launch, shutdown, and cleanup where executed, including unsuccessful phases. Evidence SHALL identify head, selection, runner, Node version, candidate digest where applicable, cache state, build/pack counts, and test ownership. Reporting SHALL not expose credentials or raw user content.

Acceptance SHALL compare representative unrelated, startup-sensitive, and conservative-full selections against recorded baselines, preserving all measured attempts and distinguishing cached and uncached setup. Structural ownership and failure-path checks SHALL be mandatory. Wall-clock improvement targets SHALL be reported as achieved or unmet, not enforced by increasing product budgets, shortening representative workloads, hiding failed attempts, or retrying until green.

#### Scenario: A startup job is slow
- **WHEN** a startup job takes substantially longer than its measured command launches
- **THEN** the evidence SHALL distinguish install and fixture phases from actual launch latency and cleanup

#### Scenario: An optimized partition fails
- **WHEN** a scope fails before the remaining scopes execute
- **THEN** completed and failing phase evidence SHALL be retained and unfinished work SHALL remain explicitly incomplete

#### Scenario: A speedup is claimed
- **WHEN** the maintainer reviews optimization acceptance
- **THEN** evidence SHALL include before/after elapsed and runner-cost measurements, selection and ownership differences, cache conditions, and all failed attempts
- **AND** the complete non-PR suite SHALL retain every prior semantic scenario and supported platform/runtime owner
