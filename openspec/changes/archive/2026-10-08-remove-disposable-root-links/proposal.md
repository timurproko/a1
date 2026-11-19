## Why

Cleanup currently blocks when an exact repository-owned disposable root such as `node_modules` is a symbolic link or Windows junction, even though cleanup already has a non-traversing link-removal primitive. This forces manual junction removal and prevents the repository command from remaining the sole cleanup authority.

## What Changes

- Permit an exact approved disposable root to be a symbolic link or junction when its link identity and resolved target can be captured and revalidated.
- Remove only the root link entry without traversing or mutating its target, then continue normal non-force worktree cleanup.
- Preserve fail-closed behavior for unresolved links, identity or target drift, cycles, unapproved paths, special files, nested worktree boundaries, and removal failures.
- Add cross-platform symlink fixtures and a Windows junction fixture proving external target content survives cleanup.
- Update cleanup guidance so agents continue using the repository command rather than manually unlinking generated roots.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Allow guarded non-traversing removal of links at exact central-policy disposable roots while preserving existing identity, containment, and fail-closed cleanup gates.

## Impact

The change affects exact generated-root entries in `.gitignore`, local cleanup filesystem inspection and purge policy, cleanup tests, and `docs/local-worktree-cleanup.md`. Exact root ignore patterns will cover either a directory or link entry so the existing ignored-path gate remains enforceable cross-platform. It changes no remote-ref authority, merge/archive verification, worktree ownership, accepted-head checks, disposable path allowlist, or Git non-force removal behavior.
