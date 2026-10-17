## 1. Hooks

- [x] 1.1 Add `scripts/governance/claude-worktree-create.mjs`, which resolves the primary checkout from the hook input, refuses unsafe names, creates or reuses `.worktrees/<name>` detached at fresh `origin/develop`, and prints its absolute path.
- [x] 1.2 Add `scripts/governance/claude-worktree-remove.mjs`, which declines removal and names the governance cleanup tool.
- [x] 1.3 Wire both hooks in `.claude/settings.json` through `$CLAUDE_PROJECT_DIR`.
- [x] 1.4 Cover creation, reuse, name refusal, removal refusal, and the settings wiring with a governance test.

## 2. Guidance

- [x] 2.1 Update the change-delivery skill, the OpenSpec project workflow context, and the project-structure guide so Claude Code sessions link by name through the hook and use `EnterWorktree(path)` only for a hand-made worktree from the primary checkout before any shell command.
