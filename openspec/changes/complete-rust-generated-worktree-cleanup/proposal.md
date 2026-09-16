## Why

The standard completed-delivery command still blocks an otherwise verified worktree when repository-owned Rust builds leave the ignored `native/process-guardian/target` tree behind. Agents are forbidden from deleting that generated tree manually, so the centralized policy must recognize the exact repository-owned root without weakening cleanup's content boundaries.

## What Changes

- Add the exact ignored `native/process-guardian/target` root to the completion command's central generated-content policy.
- Keep similarly named paths, other Cargo target directories, and content outside that exact root blocking.
- Preserve bounded traversal and all nested repository, link, special-file, dirty-content, identity, and non-force removal safeguards for the Rust build tree.
- Add focused fixtures and operator documentation for successful exact-root cleanup and fail-closed near matches/boundaries.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Extend the repository-generated disposal contract to the exact native process-guardian Cargo target root while preserving all existing fail-closed checks.

## Impact

Affected areas are the repository-owned local cleanup policy and state validation, focused cleanup fixtures, the local cleanup runbook, and the local-worktree-cleanup specification. Product runtime behavior, remote cleanup, merge authority, and publication behavior are unchanged.
