## Why

Repository delivery currently requires `a1 session worktrees` and a successful `a1 session link-worktree` before any edits. Those commands require an active A1 shell-tool runtime, so an external coding agent cannot repair a PR even when it has Git access and can use an isolated worktree. The maintainer requested the same worktree-based workflow without requiring A1.

## What Changes

- Make ordinary Git worktree creation and exact repository/path/branch verification sufficient for an external agent to start a new isolated delivery.
- Keep ownership and handoff requirements for existing worktrees, including cleanup-journal claims where applicable; missing A1 integration alone is not an ownership conflict.
- Scope A1 inventory/linking and Claude Code worktree tools to their respective environments instead of making either a universal prerequisite.
- Preserve primary `develop`, same-PR continuity, scoped commands and scratch, approval, finalization, validation, merge, and cleanup safeguards.
- Reconcile the delivery skill, OpenSpec configuration, architecture/runbook guidance, and governance tests so they do not reintroduce the A1-only gate.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Permit delivery from external agents using Git worktrees without an A1 runtime or footer association.

## Impact

- Instructions: `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, `docs/architecture/project-structure.md`, and the delivery and local-cleanup runbooks.
- Governance coverage: `test/repository-governance/change-delivery-guidance.test.ts`.
- No installed A1 CLI, runtime claim registry, footer, Claude hooks, cleanup engine, or branch-protection behavior changes.
- PR #873's supervisor shutdown repair remains separate; this change removes the policy blocker without incorporating that repair.
- Planning only until the maintainer approves this plan and requests implementation.
