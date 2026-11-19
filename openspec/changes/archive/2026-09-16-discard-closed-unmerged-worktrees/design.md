## Context

See `proposal.md` for motivation and the two delta specs for behavior. Existing `complete` is intentionally merge-only, state entries distinguish lifecycle roles and journal local removal steps, queue/watch owns released completed deliveries, and GitHub close-event automation intentionally ignores unmerged PRs. The new path must add explicit rejection authority without weakening any of those defaults.

## Goals / Non-Goals

**Goals:**
- Provide one exact `discard` command for a maintainer-confirmed closed-unmerged PR.
- Remove its unchanged remote topic ref, worktree, and unchanged local topic ref through one resumable journal.
- Preserve ownership, content, path, generated-root, protected-ref, expected-SHA, and concurrency safeguards.
- Allow the retained PR #440 worktree to be discarded after this tooling is reviewed and deployed.

**Non-Goals:**
- Bulk cleanup by age, branch name, merged ancestry, directory name, or dead process.
- Automatic discard on PR close, queue/watch adoption, or deletion of another session's worktree.
- Force-removing local worktrees, dirty files, advanced refs, forks, protected branches, or reserved/release refs.
- Changing `complete`, merged-branch automation, OpenSpec acceptance, merge authority, or archive rules.

## Decisions

### Use a separate explicit `discard` command

Add `discard --repo ... --path ... --change ... --pr ... --confirm-closed-unmerged` rather than overloading `complete`. The distinct verb and required confirmation keep merged-delivery evidence and rejected-work authority unambiguous. The command evaluates one candidate and never enables or scans the queue.

A generic `--force`, age-based pruning, and treating closed state as sufficient authority were rejected because they cannot distinguish abandoned generated output from valuable unmerged work.

### Bind live rejection evidence to local identity

The command will require the named PR to be closed with no merge time/commit, target `develop`, originate in the same repository, and expose a safe topic ref/head. That head and ref must exactly match the captured worktree and local branch. Existing released registrations may be rebound to a discard role only under the repository mutation lock after exact candidate and filesystem identity checks; owned, deleting, conflicting, or unrelated registrations remain blockers.

The central generated-content policy and full local inspection run before any remote mutation. The command then revalidates PR/ref protection and identities immediately before deletion and revalidates local state again before worktree removal.

### Use expected-SHA remote compare-and-delete

Delete the remote topic ref with Git's expected-SHA lease form and non-interactive authentication, after read-only GitHub checks prove same-repository ownership and an unprotected/non-reserved branch. This gives the ref update an atomic expected-old-value guard that a plain REST DELETE lacks. Verify remote absence afterward; an advanced ref, authentication failure, server refusal, or ambiguous result blocks local deletion.

The term `force-with-lease` in the transport command does not authorize force-removing a worktree or overwriting a branch: it is used only to delete one ref if and only if its current SHA equals the PR head. Unconditional `--force`, plain `git push --delete`, and REST deletion without an atomic expected SHA were rejected.

### Extend the existing journal instead of adding a deletion path

Represent explicit discard registrations with a dedicated role and extend journal steps to cover remote-delete intent and verified remote absence before the existing worktree/local-ref steps. Queue/watch ignores discard-role entries; only another exact confirmed `discard` invocation may resume them. Existing state records remain valid, avoiding broad adoption or time-based migration.

The destructive order is:

1. Verify confirmation, PR state, exact remote identity/protection, registration/release state, and complete local cleanliness.
2. Journal remote-delete intent; revalidate; compare-and-delete the exact remote ref; verify absence; journal completion.
3. Revalidate PR rejection, local ownership, filesystem/HEAD/ref identity, and cleanliness.
4. Reuse non-force worktree removal and atomic expected-SHA local-ref deletion, journaling each step.

If step 2 succeeds and a later step blocks, report partial state and retain the local evidence for retry. Recreated paths and advanced refs never inherit prior authority.

### Keep evidence and credentials bounded

Reuse the bounded GitHub reader and subprocess deadlines, but add only the closed-unmerged fields and branch-protection reads needed by the exact candidate. Reports include operation, PR, expected/actual SHA, ref, completed steps, and blocker without raw responses, command stderr, tokens, or file contents. Successful repeats report already-discarded from the verified journal.

## Risks / Trade-offs

- **[Risk] Remote deletion succeeds but Windows locks block local removal** → Journal remote absence, report partial, and preserve the worktree/local branch for an exact retry.
- **[Risk] A branch advances during deletion** → Expected-SHA lease refuses the deletion; do not proceed locally.
- **[Risk] A PR is reopened during execution** → Revalidate before each destructive phase and stop with any remaining resources preserved.
- **[Risk] Git credentials permit reads but not deletion** → Report a bounded remote-auth/refusal blocker without attempting local deletion.
- **[Risk] Existing registrations were created for `complete`** → Permit exact released-entry rebinding only inside the explicit discard command; all ownership and identity mismatches remain blocking.

## Migration Plan

Deploy the command, state compatibility, tests, and documentation atomically. Existing registrations remain valid and queue behavior is unchanged. After authorized merge, exact-head validation, deployment to current `develop`, and remote cleanup of this tooling PR, invoke `discard` explicitly for PR #440; do not use PR #440 itself to supply the deletion code. Rollback disables new discard invocations while preserving journals and any partially removed candidate for review.
