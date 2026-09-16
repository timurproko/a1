## Why

Development preview publication regressed from roughly ten minutes to twelve or more because package-contract and startup owners each repeat the same clean global installation on every platform/runtime lane. A failed Windows Node 22 publication spent 158 and 248 seconds on those equivalent installs, unnecessarily repacked a downloaded candidate after rejecting its locally rebound receipt, and then measured startup only after the preceding package-contract workload. The duplicate preparation is especially expensive under Windows Defender and delays every explicit preview without adding independent package-byte evidence.

## What Changes

- Reuse the downloaded candidate and its correctly rebound prerequisite receipt without an unnecessary lane-local repack.
- Prepare one fresh exact-candidate installation per publication platform/runtime lane and reuse its immutable installed package across package-contract and startup owners.
- Run cold startup immediately after shared preparation, before package-contract workload, while keeping each owner's mutable data, runtime, configuration, process, and cleanup state isolated so reuse cannot pre-warm startup behavior or couple outcomes.
- Preserve separate owner outcomes, exact-package identity checks, supported-platform coverage, startup budgets, assertions, and fail-closed publication authority.
- Add machine-readable timing and regression coverage that rejects duplicate clean-install preparation when both owners are selected in one lane.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: Require exact-package publication planning to deduplicate identical clean-install preparation within a platform/runtime lane while retaining distinct owner outcomes.
- `isolated-regression-testing`: Permit immutable installed-package reuse only with fresh owner-specific mutable state and unchanged cold-start, identity, and cleanup guarantees.

## Impact

Affected areas include validation suite planning and execution under `scripts/release/`, exact-package fixtures under `test/foundation/release/`, suite ownership/configuration, release and full-regression prerequisite receipt handoffs, workflow evidence, and focused governance tests. Package contents, public commands, runtime behavior, supported platforms, publication permissions, and npm versioning remain unchanged.
