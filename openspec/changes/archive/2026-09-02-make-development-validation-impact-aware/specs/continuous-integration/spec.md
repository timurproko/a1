## MODIFIED Requirements

### Requirement: Validation effort matches the change and the channel
Automated validation SHALL scale with what is being shipped. Documentation and specification changes SHALL require no product build or product test execution, but SHALL run every lightweight governance consistency check whose scanned inputs they change; OpenSpec changes SHALL also pass strict OpenSpec validation. Pull requests into `develop` SHALL require the ordinary fast code tier and architecture checks, SHALL check documentation policy only for policy-relevant modified, newly added, and renamed-to files, and SHALL select rendering evidence according to classified rendering impact. Preview publication SHALL additionally require exact-package gates on every supported platform. Stable publication SHALL require the complete automated suite on every supported platform. The scheduled nightly workflow SHALL run one full tracked-repository documentation review against its authoritative `origin/develop` source before publication can succeed.

#### Scenario: Docs-only pull request
- **WHEN** every changed path is documentation, an OpenSpec artifact, a Markdown file, `LICENSE`, or `.gitignore`
- **THEN** the required development check SHALL avoid product builds and tests, run strict OpenSpec validation when applicable, and run docs-sensitive governance consistency checks

#### Scenario: Code pull request targets develop
- **WHEN** a pull request changes any non-documentation path
- **THEN** validation SHALL run the ordinary fast tier, architecture checks, changed-file documentation governance, and any rendering scope selected from the complete pull-request impact
- **AND** the required aggregate check SHALL gate the merge

#### Scenario: Preview candidate is built
- **WHEN** a preview is published to `next`
- **THEN** validation SHALL run the fast tier and exact packed-candidate gates (package content, clean install) on Windows, Linux, and macOS without requiring the complete suite

#### Scenario: Stable candidate is certified
- **WHEN** a version is published to `latest`
- **THEN** the complete automated suite SHALL pass against the exact final-version package bytes on Windows, Linux, and macOS before publication

#### Scenario: Scheduled nightly source is selected
- **WHEN** the nightly publication workflow resolves the authoritative `origin/develop` commit
- **THEN** one platform-independent job SHALL inspect documentation governance across every tracked policy-relevant file at that exact commit
- **AND** the platform validation matrix SHALL not repeat the same complete documentation review

## ADDED Requirements

### Requirement: Development validation impact is classified deterministically
The development workflow SHALL derive one machine-readable validation selection from the complete merge-base-to-head change, including additions, modifications, deletions, rename sources, and rename destinations. Rendering impact SHALL use transitive production reachability from declared rendering evidence entry points together with explicit invalidators for dynamically loaded resources, terminal/package identity, validation configuration, and evidence infrastructure. Classification SHALL compare sufficient base and head state to recognize removed or renamed dependencies. An unavailable diff, unresolved dependency, unsupported changed input, or classifier failure SHALL select the conservative applicable scope rather than silently skip validation.

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
- **THEN** development validation SHALL fail closed to the full rendering scope
- **AND** the reason SHALL be visible in machine-readable and human-readable evidence

### Requirement: Rendering evidence is modular without losing contract coverage
Rendering selection SHALL have exactly three outcomes: `none`, `smoke`, and `full`. `smoke` SHALL exercise representative independent producer, terminal-paint, semantic parity, and logical-damage evidence for a rendered shell or component change. `full` SHALL exercise every declared deterministic rendering workload when viewport composition, stream scheduling, terminal adaptation, rendering evidence infrastructure, package/terminal identity, or impact classification changes. Each selected workload SHALL be produced at most once within one gate, and its captured result SHALL supply all applicable semantic, paint, parity, determinism, and budget assertions. Rendering validation SHALL run independently and in parallel with ordinary fast validation, while the single required aggregate check SHALL require its success whenever its tier is not `none`.

#### Scenario: Rendered shell presentation changes
- **WHEN** impact classification finds a rendered shell, status, transcript component, or theme change outside the full-critical surface
- **THEN** the rendering tier SHALL be `smoke`
- **AND** representative captured terminal-paint evidence SHALL gate the pull request

#### Scenario: Rendering infrastructure changes
- **WHEN** the viewport, damage-aware terminal, presentation scheduler, rendering workload, capture/replay harness, package identity, or classifier changes
- **THEN** the rendering tier SHALL be `full`
- **AND** every deterministic rendering workload SHALL remain required

#### Scenario: Rendering is not involved
- **WHEN** the rendering tier is `none`
- **THEN** the rendering job SHALL be skipped without weakening the ordinary fast required path
- **AND** the aggregate gate SHALL accept that skip only when it belongs to the current classifier result

#### Scenario: Equivalent matrix assertions are requested
- **WHEN** multiple rendering contracts consume the same producer/mode/workload result in one gate
- **THEN** they SHALL evaluate one captured result rather than launching an equivalent matrix again

### Requirement: Validation selection and timing are auditable
Every modular development gate SHALL emit its selected scopes, classification tier, changed inputs, bounded reasons, fallback decisions, elapsed time, and result in machine-readable evidence and a concise workflow summary. The required aggregate SHALL bind those outcomes to the current pull-request head and SHALL reject a missing, stale, unsuccessful, or unexpectedly skipped required scope.

#### Scenario: Maintainer inspects a rendering selection
- **WHEN** a pull request selects `smoke` or `full` rendering evidence
- **THEN** the workflow summary SHALL identify the changed input and classification reason that selected it

#### Scenario: Required modular result is stale
- **WHEN** a modular job result belongs to an older pull-request head or a different classifier result
- **THEN** the aggregate required check SHALL fail
