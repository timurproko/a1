## Why

The first live use of the standardized completion command retained its own delivered worktree because repository-generated `.artifacts/validation/` reports were not included in the central disposable policy. Agents must not delete those reports ad hoc, so the policy needs an exact, tested entry for this known generated root while continuing to protect every other `.artifacts/` path.

## What Changes

- Add `.artifacts/validation` to the exact repository-owned disposable roots used by completed-delivery cleanup.
- Verify validation reports are accepted only under the existing ignored-path, containment, file-type, nested-repository, and non-force removal safeguards.
- Keep `.artifacts`, sibling artifact directories, near matches, unknown files, links, special files, and nested repositories blocking.
- Document the expanded exact policy and the live cleanup retry for the retained PR #435 worktree.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Treat repository-generated validation reports under the exact `.artifacts/validation` root as centrally disposable without broadening authority to all artifact content.

## Impact

Affected areas are the local cleanup completion policy, focused cleanup fixtures, CLI/help and cleanup documentation, and delivery evidence. There are no product runtime, remote mutation, dependency, or public API changes.
