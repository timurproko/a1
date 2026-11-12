## ADDED Requirements

### Requirement: Startup payload compatibility uses complete authenticated selected-release evidence

For an invocation color or literal prompt payload, bootstrap SHALL establish support from authenticated complete release evidence bound to the exact selected release before spawning that release's UI. A compact restart projection SHALL NOT be treated as a complete feature inventory: absence of the owned startup parser from its minimal executable entries SHALL NOT imply that the selected release lacks support. Conditional full-manifest loading SHALL retain existing release ID, version, content/contract digest, managed-root, manifest identity/immutability, and dependency evidence checks. Installed-package discovery or another release's capabilities SHALL NOT authorize the selected release. Unsupported or unverifiable selected releases SHALL fail closed without forwarding an unknown payload, silently dropping it, or retrying without it.

Support resolution SHALL apply independently to every ultimately selected release, including update-prior selection, retained fallback, active-selection races, and bounded reselection. Existing restart seals and their minimal executable-entry contract SHALL remain compatible. Ordinary launches without invocation color or literal prompt arguments SHALL add no support-only full-manifest read, recursive payload scan, or full rehash; their existing bounded restart validation and fallback policies SHALL remain unchanged.

#### Scenario: Compatible release launches cold and repeatedly warm
- **WHEN** the selected release's authenticated complete manifest supports the owned startup payload and launch uses full materialization or a compact restart projection containing only `bin/ui.js`
- **THEN** bootstrap SHALL accept the invocation color or literal prompt payload on the cold launch and repeated warm launches after certification
- **AND** the child SHALL receive the same literal arguments and apply invocation color before its first visible owned frame without settings writes

#### Scenario: Genuinely unsupported selected release
- **WHEN** the exact selected release's authenticated complete manifest lacks owned startup payload support
- **THEN** bootstrap SHALL reject invocation color and literal prompt arguments before spawning that UI
- **AND** ordinary no-payload launching SHALL retain its existing compatibility and fallback behavior

#### Scenario: Capability evidence belongs to a different release
- **WHEN** the installed package or another certified release supports startup payloads but the ultimately selected retained release does not
- **THEN** that other release's capabilities SHALL NOT authorize the selected release
- **AND** bootstrap SHALL fail the payload before spawning the unsupported UI

#### Scenario: Complete evidence cannot authenticate the selected identity
- **WHEN** required release, manifest, certification, managed-root, immutability, or dependency evidence is missing, changed, or mismatched and existing verification recovery cannot establish the exact approved release
- **THEN** bootstrap SHALL fail closed before spawning an unverifiable selected UI with the payload
- **AND** it SHALL NOT substitute filesystem existence or installed-version claims for authenticated support

#### Scenario: Update selection or reselection changes support
- **WHEN** update-prior selection, installation-failure fallback, active-selection races, or bounded reselection chooses a different release from an earlier supported candidate
- **THEN** bootstrap SHALL resolve startup support for that newly selected identity independently
- **AND** only a supported authenticated selected release SHALL receive the unchanged invocation payload

#### Scenario: Ordinary restart keeps its operation boundary
- **WHEN** an approved release launches with valid existing restart certification and no invocation color or literal prompt arguments
- **THEN** capability resolution SHALL add no full-manifest read, recursive discovery, or full content verification
- **AND** existing compact restart evidence operations SHALL remain independent of product payload size
