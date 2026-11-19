## MODIFIED Requirements

### Requirement: Faster package fixtures preserve cold-state and oracle independence
Fixture optimizations SHALL preserve fresh installation boundaries, exact package identity, representative workload sizes, independent comparison processes, hermetic mutable state, and verified owned-process cleanup. Immutable source templates or downloaded bytes SHALL be reusable only where their reuse does not supply the behavior under test or pre-warm a measured first-attempt launch. Every mutable instance, prefix, endpoint, release state, and cancellation lifecycle SHALL remain scenario-owned. Failed setup, assertions, command execution, or cleanup SHALL remain visible under the retained failure semantics rather than becoming a timing success.

A production-shaped historical backlog fixture SHALL construct its retained payload through a reviewed finite I/O-concurrency bound before invoking the cleanup behavior under test. It SHALL preserve the release count, payload-file count, paths, contents, exact packaged worker, assertions, phase evidence, and existing timeout, and SHALL NOT use retries, sleeps, workload reduction, antivirus exclusions, or timeout extension to convert contention into success.

#### Scenario: Repeated command fixtures share preparation
- **WHEN** equivalent command tests reuse an immutable repository template
- **THEN** each mutating scenario SHALL receive separate writable state and the same independent command assertions
- **AND** subsequent scenarios SHALL not observe prior refs, files, processes, or captured output

#### Scenario: A first-attempt startup fixture is prepared
- **WHEN** the exact candidate startup fixture is created using cached dependency downloads
- **THEN** it SHALL still use a fresh installation and preserve the existing declared certification and warmup sequence
- **AND** no additional warm launch, restored launch compile cache, or reused certified fixture SHALL precede its first measured attempt

#### Scenario: An independent parity oracle is expensive
- **WHEN** profiling identifies repeated pinned-versus-owned command processes as a cost
- **THEN** optimization SHALL retain independent oracle execution and strict output assertions rather than substituting owned output, recorded passing output, or shared mutable oracle state

#### Scenario: A large cleanup backlog dominates setup
- **WHEN** a production-shaped historical backlog is expensive to construct
- **THEN** optimization SHALL retain the existing release and payload counts and ownership/failure cases
- **AND** smaller workloads SHALL not be reported as equivalent acceptance evidence

#### Scenario: Backlog preparation runs on Defender-enabled Windows
- **WHEN** the production-shaped exact-package cleanup fixture creates its historical payload before invoking the packaged worker
- **THEN** payload creation SHALL use the reviewed finite I/O-concurrency bound and complete every write before cleanup begins
- **AND** the first execution SHALL retain the existing timeout, workload, worker, semantic assertions, and phase evidence without an automatic retry

#### Scenario: A failure would otherwise be hidden by cleanup
- **WHEN** a fixture command or assertion fails and teardown also encounters a problem
- **THEN** evidence SHALL retain the primary failure and separately identify cleanup outcome without reporting the fixture as passed
