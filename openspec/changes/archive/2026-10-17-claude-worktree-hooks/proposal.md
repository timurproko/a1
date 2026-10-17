## Why

Claude Code manages worktrees under `.claude/worktrees/`, while this repository requires every task worktree at `{working-dir}/.worktrees/<task-id>`. Sessions therefore link with `EnterWorktree` by path, which Claude Code treats as a foreign worktree: it asks the maintainer for approval on every link, refuses the link from inside another worktree session, and leaves the shell tools anchored to the primary checkout so the isolation guard refuses their commands. Across 45 recent sessions this produced 147 refused shell commands and repeated exit-and-relink cycles.

## What Changes

- The repository ships `WorktreeCreate` and `WorktreeRemove` hooks for Claude Code in `scripts/governance/` and wires them in the tracked `.claude/settings.json`, so a fresh clone carries the configuration.
- `EnterWorktree(name)` and `claude --worktree <name>` create or reuse `.worktrees/<name>` detached at fresh `origin/develop`; the agent creates its `<type>/<short-description>` branch inside it.
- Claude Code removal requests are declined so `local-worktree-cleanup.mjs` stays the only removal path.
- The delivery skill, project workflow context, and project-structure guide tell Claude Code sessions to link by name and reserve `EnterWorktree(path)` for a worktree created by hand, used from the primary checkout before any shell command.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `change-delivery-workflow`: Claude Code sessions link the task worktree by name through the repository hook.

## Impact

`scripts/governance/claude-worktree-create.mjs`, `scripts/governance/claude-worktree-remove.mjs`, `.claude/settings.json`, `.agents/skills/change-delivery/SKILL.md`, `openspec/config.yaml`, `docs/architecture/project-structure.md`, and a governance test. No product code changes; A1 shell sessions keep `a1 session link-worktree`.
