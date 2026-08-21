## Context

See `proposal.md` for motivation and `specs/project-structure-governance/spec.md` for normative behavior. The repository uses `develop` for integration, `master` for stable releases, and short-lived topic or milestone branches. Git can prove whether one local branch is fully merged by testing whether its tip is an ancestor of the integration target, but it does not automatically remove local branches after merge. CI also cannot clean branches in a maintainer's clone.

## Goals / Non-Goals

**Goals:**
- Make safe post-merge cleanup a mandatory completion step.
- Give maintainers a deterministic preview before deletion.
- Protect long-lived, checked-out, and unmerged branches.
- Reconcile the current accumulated merged branch inventory.

**Non-Goals:**
- Force-delete branches.
- Delete `develop` or `master` locally or remotely.
- Rewrite history, squash commits, or choose merge strategy.
- Let CI modify local clones.
- Delete unmerged work or infer safety from branch names alone.

## Decisions

### Provide repository-owned dry-run/apply tooling

A repository script will inspect local branch refs and classify each as protected, current, merged-deletable, or unmerged relative to an explicit base that defaults to `develop`. Dry-run output is the default. An explicit apply mode will invoke Git's safe branch deletion for only the merged-deletable set.

This is preferred over shell aliases because it gives Windows and Unix contributors the same behavior and can be covered by deterministic tests. It is preferred over a post-merge Git hook because hooks are clone-local, are not installed reliably, and can run after merges where no source branch should be deleted.

### Use ancestry, not naming, as the deletion proof

A branch is eligible only when its tip is an ancestor of the selected integration target. Names determine protection and presentation, not merge safety. Deletion still uses `git branch -d`, adding Git's own safety check instead of bypassing it.

This is preferred over deleting every `topic/*`, `fix/*`, `chore/*`, or `milestone/*` branch because a named branch may contain unmerged commits.

### Keep protected branches explicit

`develop`, `master`, and the checked-out branch are always retained. Additional protected branches can be supplied explicitly when necessary. Remote cleanup requires an explicit remote/apply option and excludes protected branches.

This is preferred over retaining every milestone branch indefinitely: milestone status does not justify keeping a branch after its complete history is already reachable from `develop`.

### Make cleanup part of merge completion

The documented agent and maintainer workflow will be: validate source branch, merge into `develop`, push `develop`, switch to `develop`, preview cleanup, safely delete the merged source branch, and delete its non-protected remote counterpart if present. The source branch is not considered fully closed until that cleanup completes.

For the initial reconciliation, the script will preview all existing branches and then remove only branches proven merged into `develop`. The currently unmerged change branch remains until its own later merge.

## Risks / Trade-offs

- **[A branch is merged into a different target but not `develop`]** → Require an explicit integration target and default conservatively to `develop`.
- **[Remote deletion removes a branch another maintainer still uses]** → Restrict remote deletion to the just-merged source branch or an explicitly reviewed apply set; never infer remote cleanup from all remote refs silently.
- **[Dirty working-tree changes are confused with branch commits]** → Report that branch safety concerns committed ancestry only; never alter, stash, or discard working-tree files during cleanup.
- **[A local branch pointer is useful as a bookmark]** → Git history and tags remain available; an explicitly protected branch can be retained, but merged topic branches are removed by default.

## Migration Plan

1. Add and test the branch-classification and safe-cleanup command.
2. Document the branch lifecycle in repository workflow guidance.
3. Run dry-run classification against the current clone and review the exact sets.
4. Delete only the currently merged, non-protected local topic and milestone branches; retain `develop`, `master`, and all unmerged branches.
5. After this change is merged and pushed, delete its source branch using the new workflow.

Rollback consists of recreating any deleted local branch from its merge commit or reflog. No commit objects or working-tree files are removed by safe branch deletion.
