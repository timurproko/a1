# Design

## Cause and correction

The runtime does not detach on implementation completion. Agents issue detach because the root Worktrees block explicitly requests it at handoff or finish. Correct the policy rather than adding a second runtime mechanism or keeping stale PR metadata after an intentional detach.

Use identical shared guidance in `AGENTS.md` and `docs/features/worktrees.md`: preserve the attachment through implementation completion and review handoff, detach only when explicitly requested or switching tasks, and let runtime shutdown release claims automatically. The delivery and cleanup procedures remain separate; handoff does not require runtime detach and still does not grant merge authority.

## Regression boundaries

The repository guidance test must require the continuation policy and reject the old detach-on-finish instruction. The existing real-worktree/SDK composition fixture will also observe repository metadata, retain the task branch and PR through repeated tool work and observation, and verify that explicit detach restores startup tool and PR context without deleting task files. Existing runtime-disposal tests retain shutdown claim-release coverage.

## Compatibility and rollout

No product implementation change or new command is required. The instruction correction takes effect when the repository changes are integrated and loaded by an agent; publishing a new package alone does not correct instructions in another repository. Update XR Build separately without importing its repository details into A1's delivery.

## Authorization

The maintainer approved the presented attachment-continuity plan and requested implementation, then explicitly requested the same repository-rule correction in A1 and XR Build. Integration remains a separate maintainer decision.
