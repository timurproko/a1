## Why

Delivery agents currently materialize transient command inputs such as pull-request body files under the operating-system temporary directory. Those files sit outside the repository's owned, ignored, and cleanup-managed artifact boundary, making their location harder to inspect and their lifecycle dependent on unrelated system-temp behavior.

## What Changes

- Require agent-selected scratch and command-interchange files for repository work, including pull-request body files, to live beneath the owning repository worktree's exact `.artifacts/` root.
- Prohibit agents from choosing the operating-system temp directory, user home/desktop, sibling checkout, or another worktree for those files.
- Keep `.artifacts/` content ignored, non-authoritative, uncommitted, and eligible for the existing repository-owned generated-content cleanup policy.
- Preserve legitimate tool-internal temporary storage, hermetic test fixtures, and product/runtime temp behavior that the agent does not directly path-select.
- Update delivery guidance, examples, and focused governance checks so the required location is explicit and regression-tested.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Delivery agents keep directly created scratch/interchange files inside the owning worktree's `.artifacts/` boundary instead of system or user temporary locations.

## Impact

The change affects agent delivery policy in OpenSpec configuration, the change-delivery skill, delivery documentation and examples, architecture guidance where needed, and focused repository-governance tests. It does not change product runtime storage, test-fixture isolation, third-party tool internals, public APIs, dependencies, or the existing `.artifacts/` cleanup boundary.
