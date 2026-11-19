## ADDED Requirements

### Requirement: Exact-package startup graph and latency are release-gated
Exact-package validation SHALL record the modules, files, evaluated bytes, and elapsed phases required from command invocation through first input-ready render for both interactive profiles. Evidence SHALL distinguish A1-owned startup code, documented Pi entry points, other dependency modules, process startup, runtime initialization, and rendering. The accepted baseline SHALL fail when an unapproved broad entry point or optional feature becomes eagerly reachable, even when aggregate time happens to remain within budget.

On the accepted Defender-enabled Windows runner, each supported Node lane SHALL execute post-update, no-live-supervisor, and warm scenarios once without automatic retry. Post-update and warm launches SHALL complete within 2 seconds; no-live-supervisor launches SHALL complete within 2.5 seconds.

#### Scenario: Broad entry point enters the startup graph
- **WHEN** a change makes an unapproved barrel, command mode, optional workflow, or optional presentation module eagerly reachable before first input-ready render
- **THEN** deterministic graph validation SHALL fail with the introducing edge and affected module/file totals

#### Scenario: Startup graph grows within the elapsed budget
- **WHEN** loaded module count or evaluated bytes exceed the accepted startup baseline without an explicitly reviewed baseline change
- **THEN** validation SHALL fail even if elapsed startup remains below its time budget

#### Scenario: Startup exceeds its budget
- **WHEN** an exact packaged profile exceeds its applicable first-attempt budget
- **THEN** validation SHALL fail without retry and report the dominant phases, module groups, loaded file count, and evaluated bytes

#### Scenario: Deferred capability is exercised
- **WHEN** exact-package validation invokes a feature excluded from the eager graph
- **THEN** that feature SHALL load on demand and retain its supported behavior, diagnostics, and triggering interaction

#### Scenario: Generated startup artifact is packaged
- **WHEN** a candidate contains an A1-owned bundled or generated startup artifact
- **THEN** validation SHALL bind it to exact source and dependency identities and SHALL verify public Pi provenance, licenses, provider registration, extension compatibility, terminal identity, and runtime payload completeness
