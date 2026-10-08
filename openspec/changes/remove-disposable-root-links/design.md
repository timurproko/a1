## Context

See `proposal.md` for motivation. `inspectWorktree` currently rejects a symbolic link or Windows junction when its path equals an approved disposable root. The purge layer already removes verified descendant links with `unlink` or Windows `rmdir` through a bounded, non-recursive primitive, but its validation also rejects root-link records. The recent `node_modules` junction cleanup blocker demonstrated that this leaves manual unlinking as the only recovery.

The cleanup boundary must remain stricter than ordinary generated-file deletion: no operation may recursively traverse a root link, infer that an arbitrary ignored path is disposable, or let a link change between inspection and purge.

## Goals / Non-Goals

**Goals:**

- Let existing `complete`, `sweep`, and other policy-backed cleanup paths remove a link entry at an exact central-policy disposable root.
- Prove the operation deletes only the link entry and leaves the resolved target and its content untouched.
- Revalidate link filesystem identity and canonical target immediately before removal.
- Preserve current registration, ownership, accepted-head, remote-ref, path, deadline, and journal gates.

**Non-Goals:**

- Following, scanning, cleaning, or recursively deleting the root link target.
- Allowing links at near-match, user-selected, unknown ignored, worktree-root, or Git metadata paths.
- Adding a general-purpose unlink command or weakening manual-cleanup prohibitions.
- Treating broken, cyclic, drifting, replaced, or locked links as safe.

## Decisions

### 1. Represent exact-root links as inspected disposable links

Inspection will admit a link only when its lexical path exactly equals an existing central-policy disposable root. It will record the link path, declared root, filesystem fingerprint, canonical resolved target, and an explicit root-link classification. Resolution failure and cycles remain blockers.

This reuses the existing inspected-link handoff rather than adding a separate repair command. A repair command was rejected because cleanup already has candidate authority and a separate mutation path would duplicate ownership and evidence gates.

### 2. Never traverse an exact-root link target

For a root-link record, inspection will not recurse into the target or apply descendant containment rules. Purge will re-read the link entry, require the same fingerprint and canonical target, then invoke only the existing non-recursive link-removal primitive. The later disposable-root loop will observe the lexical root as absent and will not call recursive removal on the target.

Requiring the target to stay inside the disposable root was rejected because a root link necessarily resolves the root itself elsewhere and the intended case is a worktree dependency junction to an external shared directory. Traversal is unnecessary because the target receives no deletion authority.

### 3. Keep descendant links under the current stricter containment rule

Links below a disposable directory continue to require a canonical target inside that same exact root, target inspection, cycle checks, and pre-purge revalidation. The new root-link classification cannot be inferred for descendants.

This prevents the narrow exception from admitting escaping links hidden inside generated trees.

### 4. Verify target preservation in destructive fixtures

Tests will create an external sentinel target containing known bytes, link an exact disposable root to it, run the ordinary cleanup path, and assert the worktree/link is removed while the target and sentinel bytes remain. Cross-platform symbolic-link coverage will run where supported, and Windows will exercise an actual directory junction. Unit-level drift fixtures will replace the link or target between inspection and purge and require `content-link-drift` without target mutation.

## Risks / Trade-offs

- **[Recursive removal accidentally reaches the external target]** → Remove root links before the disposable-root loop with the non-recursive primitive and verify target survival in destructive fixtures.
- **[Link replacement races inspection]** → Bind path, root classification, filesystem fingerprint, and canonical target; revalidate all immediately before unlinking.
- **[The exception broadens to arbitrary ignored links]** → Require exact equality with a central-policy disposable root and retain ordinary status/path checks.
- **[Windows junction behavior differs from POSIX symlinks]** → Keep the existing unlink-then-`rmdir` primitive and require a Windows junction fixture in CI.
- **[Broken or locked links become partially removed]** → Fail before journal transition on resolution/drift and retain bounded `disposable-link-locked` behavior on removal failure.

## Migration Plan

1. Extend inspected-link metadata and purge validation for exact disposable-root links.
2. Add target-preservation, drift, near-match, broken-link, and Windows junction coverage.
3. Update the cleanup runbook and strict OpenSpec contract.
4. Roll back by restoring root links as blockers; no journal schema migration is required because inspected-link metadata exists only within one cleanup pass.
