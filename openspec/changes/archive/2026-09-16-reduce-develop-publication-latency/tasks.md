## 1. Lane-Scoped Preparation

- [x] 1.1 Add a bounded exact-package installation preparation/receipt module that binds candidate digest, package identity, platform, architecture, Node version, run attempt, install policy, prefix, and consuming scopes; verify focused tests reject stale, malformed, cross-lane, and path-escaping receipts.
- [x] 1.2 Make preparation execute the current clean global install and proxy synchronization exactly once and provide bounded cleanup that preserves the primary failure; verify focused tests cover install failure and passed/deferred/failed cleanup outcomes.
- [x] 1.3 Extend validation planning and result schemas with one shared preparation lifecycle for package-contract/startup consumers; verify plan tests show one preparation for combined or individual selection and no preparation for unrelated scopes.
- [x] 1.4 Bind downloaded candidate receipts to the lane's exact build receipt so compatible release artifacts bypass lane-local repacking; verify workflow and runner tests preserve fail-closed rejection for contradictory evidence.

## 2. Independent Consumers

- [x] 2.1 Update the common validation runner to prepare before consumers, pass only verified bounded environment handoffs, and clean after all consumers; verify runner tests prove failure blocks every dependent invocation and cleanup cannot replace an owner failure.
- [x] 2.2 Update the package fixture helper to consume runner-owned preparation while retaining an explicit standalone focused-test fallback; verify tests reject missing or contradictory authoritative receipts instead of silently installing again.
- [x] 2.3 Give package-contract and startup consumers separate mutable roots while sharing only the verified installed package; verify fixture tests prove distinct config/data/runtime/process/cleanup paths and no consumer owns the shared prefix.
- [x] 2.4 Preserve proxy-repair coverage as an idempotence check and verify installed bytes remain unchanged between consumers; add mutation-detection coverage that fails before a later owner can pass.
- [x] 2.5 Schedule startup immediately after shared preparation and before package-contract workload while preserving first-attempt cold state, all current scenarios, supported lanes, budgets, and no-retry behavior; verify focused package-startup coverage records no inherited materialization, certification, warmup, supervisor, profile, or compile-cache state.

## 3. Policy and Evidence

- [x] 3.1 Update suite ownership, workflow-policy, validation-plan, prerequisite-reuse, and result-evidence assertions for shared preparation with startup-first scheduling and distinct package-contract/startup outcomes; verify the focused repository-governance tests pass.
- [x] 3.2 Emit preparation count, duration, identity, candidate digest, cleanup disposition, and consuming scopes alongside existing owner phase timings; verify structured evidence tests reject duplicate equivalent installs and contradictory consumer identity.
- [x] 3.3 Run the focused validation-tier, package fixture, package ownership, workflow policy, and strict OpenSpec checks, recording commands and outcomes in `implementation-evidence.md` without running prohibited local aggregate suites.
- [x] 3.4 Compare implementation structural counts and available hosted phase timings with the recorded pre-change runs, document achieved or unmet latency results and any reviewed gaps, and verify every substantive task/evidence requirement is complete before finalization.
