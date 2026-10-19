## ADDED Requirements

### Requirement: Claude Code sessions link the task worktree by name through the repository hook
The repository SHALL provide Claude Code `WorktreeCreate` and `WorktreeRemove` command hooks under `scripts/governance/`, wired in the tracked `.claude/settings.json` through the session root variable, so that a fresh clone carries them. The create hook SHALL resolve the primary checkout from the hook input, SHALL accept only names made of letters, digits, dots, underscores, and dashes, SHALL create `.worktrees/<name>` detached at freshly fetched `origin/develop` when that path is not yet registered, SHALL print the registered path when it already exists, and SHALL fail for an unregistered directory at that path. The remove hook SHALL decline every removal and name `local-worktree-cleanup.mjs`. A Claude Code session SHALL link its task worktree with `EnterWorktree` by name, then create the `<type>/<short-description>` branch inside it, and SHALL use `EnterWorktree` by path only for a worktree created by hand, from the primary checkout, before any shell command in that session.

#### Scenario: Session enters a new task worktree by name
- **WHEN** a Claude Code session calls `EnterWorktree` with a task name that has no worktree yet
- **THEN** the hook SHALL create `{working-dir}/.worktrees/<name>` detached at fresh `origin/develop` and Claude Code SHALL anchor the session there without an approval prompt
- **AND** the agent SHALL create the task branch inside that worktree before editing

#### Scenario: Session resumes an existing task worktree by name
- **WHEN** `.worktrees/<name>` is already a registered worktree of the repository
- **THEN** the hook SHALL print that path so the session re-enters the same worktree, branch, and history

#### Scenario: Hook receives an unsafe name or an unregistered directory
- **WHEN** the requested name contains a path separator or parent reference, or `.worktrees/<name>` exists without being registered
- **THEN** the hook SHALL fail and Claude Code SHALL NOT enter any worktree

#### Scenario: Claude Code asks to remove a worktree
- **WHEN** `ExitWorktree(remove)` or the exit prompt requests removal
- **THEN** the remove hook SHALL decline and the worktree SHALL remain until `local-worktree-cleanup.mjs` removes it with verified evidence
