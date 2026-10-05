# Design

## Context

The cleanup state lives beneath the Git common directory, so moving the primary repository also moves its journal. The journal intentionally records exact absolute `primary`, `common`, `root`, and worktree paths. After a move from one Windows drive to another, repository discovery returns the new canonical paths while the carried state still names the old paths. Exact identity validation therefore reports `state-schema` before cleanup can evaluate a candidate.

The observed journal has 44 entries, all in terminal `done`/`complete` state and all beneath the recorded old `.worktrees` root. It contains no released, owned, or partially deleting authority.

## Goals

- Recover cleanup after a whole-repository path or drive relocation when the persisted journal is terminal and internally consistent.
- Keep repository identity, active ownership, partial deletion, and path-boundary checks fail closed.
- Avoid hard-coded drive letters and preserve audit history.

## Non-goals

- Migrating active, released, owned, or partially deleting registrations.
- Treating arbitrary copied state as authority for a different repository.
- Repairing broken Git worktree metadata or moving worktrees independently of the primary repository.
- Weakening runtime canonical-path or filesystem-identity checks.

## Decisions

### Migrate only terminal history under the mutation lock

State loading will first validate a mismatched journal against its own recorded identity. A mutating cleanup operation that already holds the repository mutation lock may migrate it only when every entry is `done` with step `complete`. Read-only operations will not silently rewrite state.

This boundary is intentionally narrower than general relocation support: terminal entries authorize no future deletion. After migration, an exact completion command must still capture and register the current worktree afresh and pass all ordinary merge, archive, CI, remote-ref, content, and filesystem gates.

### Require stable repository identity and exact topology

Migration will require the old and current identities to name the same canonical GitHub `owner/repository` and the same named `origin` remote. Both identities must be structurally valid. Every persisted entry path must be a direct descendant of the old recorded worktree root, with no escape or alias spelling, and will be rebased by its relative suffix beneath the current canonical worktree root.

The current state file is already located beneath the newly discovered Git common directory because it moved with the repository. A repository/remote mismatch, malformed old identity, nonterminal entry, out-of-root path, duplicate rebased path, or invalid rebased state remains blocked with a named relocation/state reason.

### Preserve data and replace atomically

Migration retains state version, queue enablement, cursor, registration IDs, generations, owner hashes, lifecycle identity, completion notes, and all non-path entry data. It changes only the recorded repository path fields and terminal entry paths. The transformed state must pass the ordinary validator against the current identity before `atomicJson` replaces the old complete file.

A failed validation or replacement leaves the prior journal intact. No worktree, branch, ref, generated content, lock record, or Git metadata is changed by state migration.

## Risks / Trade-offs

- **Automatic migration could hide an unsafe move** → It is available only while holding the mutation lock and only when no entry carries live or partial deletion authority.
- **Completed historical paths change spelling** → Registration IDs and completion records remain stable; only the repository-root prefix follows the actual move.
- **Read-only status still encounters stale state** → Documentation will identify the relocation blocker; an explicit mutating candidate operation performs the bounded safe migration before normal evaluation.
- **An active repository move remains unsupported** → Cleanup fails closed and requires the active registrations to be reconciled before relocation rather than guessing at their identity.

## Rollback

Reverting the migration path restores exact absolute identity rejection. Journals already migrated remain valid at the current repository location because their ordinary schema is unchanged.
