# Resident tabs — target requirements

Status: one requirement remains outside the delivered milestones. Milestones 1–6 moved every other requirement into their OpenSpec changes, and the canonical specs now hold them. This file keeps only what no milestone has delivered yet; it binds nothing until a later change adopts it. See [`resident-tabs.md`](resident-tabs.md#roadmap).

## Capability: `resident-terminal-host`

### ADDED Requirements

#### Requirement: Host topology mutations are revisioned and atomic
Client/server topology messages SHALL use the generation-1 protocol established by `resident-tabs-contracts`. A topology subscription SHALL begin with one complete snapshot and monotonic revision, followed by ordered changes. Every create, rename, reorder, close, retry, fresh-start, and stop-all mutation SHALL carry its expected topology or registry revision and SHALL either commit completely at the next revision or be rejected without a partial change. A method absent from an older same-generation server SHALL disable only that operation.

##### Scenario: Two clients mutate one revision
- **WHEN** two clients submit topology mutations against the same expected revision
- **THEN** at most one SHALL commit, the stale mutation SHALL receive a typed revision conflict, and every client SHALL converge on the committed topology

##### Scenario: Newer client calls an unavailable method
- **WHEN** a newer same-generation client attaches to an older server that lacks one optional topology method
- **THEN** attachment and unrelated operations SHALL remain available while only that method is disabled
