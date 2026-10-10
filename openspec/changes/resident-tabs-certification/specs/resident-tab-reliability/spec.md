## ADDED Requirements

### Requirement: Reliability evidence matches the enablement stage
The server state machine SHALL be implemented independently of I/O and SHALL be exercised by deterministic simulation and property tests that inject arbitrary interleavings of process death, message loss, reordering, delay, stale epochs, controller transfer, client churn, and mutations, asserting that no committed mutation is lost, only one registry writer exists, no session gains two live tabs, client-scoped requests remain attributable, and every desired-running tab converges to running or failed. Every persistence and IPC step SHALL expose a failure-injection point exercised by crash-point tests, and failure-injection points SHALL be absent from shipped binaries. Protocol decoders, persisted-state parsers, and surface encoders SHALL be fuzzed, and bounded chaos/fault-injection suites on each platform against the exact packed candidate SHALL gate the opt-in preview. Implementation SHALL progress through contracts and platform primitives, one persistent tab, failure isolation, crash recovery, complete UX, and packaged certification, each delivered as its own change behind `residentTabs: false`, with evidence at each milestone before dependent behavior is enabled. Intermediate demonstrations SHALL NOT count as shipping acceptance. Historical v2/herdr results, Unix-only tests, and pending 2×2 proof records SHALL NOT substitute for exact-package resident evidence on each platform. Cold launch, warm tab creation, reattach, tab restart, and server recovery SHALL be measured separately on each platform and recorded without being claimed as default-on results.

Before resident tabs may default on for a platform, a separately authorized isolated-worker soak on that platform of at least 24 hours SHALL exercise ten tabs under high-rate output and random termination of servers, holders, tab processes, and clients, controller and resize churn, blocked writes, pseudoterminal creation hangs, and rename denial. It SHALL assert zero lost journaled prompts, zero lost committed entries, zero orphaned processes, zero duplicate tabs, bounded memory and handle growth, reattach p95 under 300 ms, tab restart under 3 s, and server recovery under 2 s. Each later platform SHALL earn equivalent implementation and exact-package evidence before enablement; evidence SHALL NOT be inferred across platforms.

#### Scenario: Opt-in preview changes resident code
- **WHEN** the preview remains disabled by default
- **THEN** deterministic, crash-point, fuzz, bounded chaos, and exact-package physical evidence SHALL be required without claiming that the later 24-hour default-on gate has passed

#### Scenario: Prototype evidence is available
- **WHEN** a reference prototype has a passing benchmark or another platform's detach tests pass
- **THEN** A1's resident milestone and physical verdict on each platform SHALL remain unproven until its own exact-artifact evidence is recorded

#### Scenario: Default-on soak detects a leak
- **WHEN** the authorized 24-hour soak observes handle or memory growth beyond the declared bound
- **THEN** default enablement SHALL remain blocked until the growth is fixed or the bound is explicitly re-justified in a later approved plan

#### Scenario: Simulation finds a duplicate start
- **WHEN** a simulated interleaving produces two live incarnations for one tab
- **THEN** the test SHALL fail with the seed and the minimized event sequence

#### Scenario: Shipped binary contains a failure-injection point
- **WHEN** the exact packed terminal host is inspected
- **THEN** the package test SHALL fail if any failure-injection feature is compiled in
