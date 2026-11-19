## Why

Automatic implementation archival and remote-branch deletion leave retained local worktrees behind, requiring repeated manual audits and cleanup. Finish that lifecycle on the owning machine only after the automatic archive documentation PR has actually merged, without risking uncommitted files or another session's work.

## What Changes

- Add a local cleanup reconciler for explicitly registered implementation, acceptance, and archive worktrees associated with an OpenSpec change.
- Require verified implementation integration, verified auto-archive PR integration into `develop`, and live absence of the corresponding remote topic refs before local deletion. An open archive PR, missing branch, or directory named `archive` is not sufficient evidence.
- Register exact repository, PR, path, and reviewed commit identities during delivery; require an explicit ownership release before automatic cleanup. Unregistered legacy folders remain manual-review candidates rather than being adopted by name or ancestry.
- Provide read-only preview, bounded one-shot reconciliation, and an opt-in local watch mode that retries after archive integration or temporary blockers. Run outside target worktrees; no hosted workflow receives access to the developer's filesystem.
- Preserve primary/current, dirty, active, locked, ambiguous, advanced, and open/closed-unmerged-PR worktrees. Remove only eligible worktrees and unchanged associated local topic refs, then perform scoped Git metadata pruning and report the result.
- Integrate registration, release, and reconciliation into repository-owned delivery guidance, with explicit local enable/disable controls and conservative crash recovery.
- Apply the maintainer's delivery refinement: repair routine failed PR checks, including inherited failures, in the existing worktree/branch/PR and repush without a separate proposal. Preserve assertions and validation gates; substantive new scope still needs clarification.

## Capabilities

### New Capabilities

- `local-worktree-cleanup`: Provenance-bound, ownership-aware local reconciliation after automatic OpenSpec archive integration, including safe execution, retry, and evidence.

### Modified Capabilities

None. Existing acceptance, archive publication, documentation merge, and remote-branch cleanup rules remain authoritative and are not broadened. Local reconciliation is a separate consumer of their verified outcomes.

## Impact

- Future implementation: local Git/GitHub-reader policy and command modules under `scripts/governance/`, focused governance tests, and delivery/runbook updates in `.agents/skills/change-delivery/SKILL.md`, `docs/openspec-archive-automation.md`, and applicable OpenSpec workflow guidance.
- Local-only versioned registration, ownership, lock, retry, and report data stored under the Git common directory; no machine paths, process identifiers, or credentials committed to the repository or published to GitHub.
- Uses existing Git and GitHub CLI authentication with read-only remote operations; requires neither a new GitHub App nor broader Actions permissions. No remote deletion or merge authority is added to the local reconciler.
- Supports current version-2 implementation linkage and verified legacy version-1 linkage. Bulk legacy adoption, automatic discard, closed-unmerged cleanup, product UI hooks, OS-service provisioning, and archive publication changes are out of scope.
- The initial draft contained planning artifacts only. The maintainer subsequently approved implementing connected PRs #400 and #401; implementation continues in #400 with #401's delivery-order policy incorporated, without merging either PR. Local watcher activation, live destructive fixtures, final acceptance, and integration remain separately authorized steps.
