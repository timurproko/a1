## Context

See `proposal.md` for motivation and `specs/local-worktree-cleanup/spec.md` for the behavioral contract. The completion command currently supplies a fixed disposable-root list, while persisted registration validation admits only the existing root families. A blocked `complete` invocation leaves a released registration that a later invocation can safely reuse and augment with newly reviewed central policy entries.

## Goals / Non-Goals

**Goals:**
- Recognize only `native/process-guardian/target` as repository-owned Cargo output.
- Route that tree through the existing generated-content allowance and every existing boundary check.
- Let a later `complete` invocation safely resolve the already-recorded PR #437 blocker after this policy is integrated.

**Non-Goals:**
- Approving arbitrary Cargo `target` directories or all ignored native output.
- Adding a manual deletion fallback, force removal, or caller-selected path to the standard completion flow.
- Changing merge, archive, remote-ref, ownership, journaling, or cleanup evidence rules.

## Decisions

### Add one component-exact central root

Add `native/process-guardian/target` to the completion policy and admit that exact value in registration-state validation. Existing component-prefix matching will cover descendants while leaving the parent, siblings, and near matches outside authority.

A generic `target` rule or unrestricted `native/**/target` pattern was rejected because it would silently broaden disposal authority to projects that have not been reviewed as repository-generated and reproducible.

### Reuse generated traversal and safety checks

Keep the current inspection algorithm unchanged: Git status must classify encountered files as ignored, and traversal charges all descendants to the finite generated allowance while rejecting nested `.git` metadata, links, special files, deadline exhaustion, and entry-budget exhaustion. No special Cargo shortcut will bypass inspection.

A pre-removal recursive deletion step was rejected because `git worktree remove` must remain the only worktree deletion primitive and agents must not erase blockers manually.

### Exercise central completion behavior and exactness

Extend the temporary-repository fixture's ignore rules and completion scenario with realistic files beneath the approved Cargo root. Add negative coverage for another/near-match target root, and retain the existing generic generated-boundary fixtures as proof that the new root receives no additional privilege.

## Risks / Trade-offs

- **[Risk] A future build moves or adds Cargo output elsewhere** → Keep the policy exact and require a separately reviewed policy change instead of guessing.
- **[Risk] Large Cargo trees exhaust the finite generated allowance or deadline** → Preserve the blocker; this change grants classification authority, not unbounded traversal.
- **[Risk] Persisted registrations do not accept the new root** → Update state validation together with the central policy and verify the completed registration records the exact policy list.

## Migration Plan

Ship the policy, state validation, fixtures, and documentation atomically. After authorized merge and cleanup-tool verification, rerun the standard `complete` command for PR #437 from current `develop`; its existing released registration will gain the reviewed root and be reevaluated normally. Rollback removes the policy entry and validator admission, causing affected worktrees to remain blocked without deleting content.
