# Project rules for coding agents

## Delivery workflow

Read and follow [Shared delivery rules](docs/delivery-rules.md). Use only this repository's entry in [Delivery adapters](docs/delivery-adapters.json). Do not paraphrase these rules, invent exceptions, or modify OpenSpec skills/framework; report conflicts before proceeding.

Command syntax and operational details: [delivery skill](.agents/skills/change-delivery/SKILL.md), [delivery runbook](docs/openspec-archive-automation.md), [worktree protocol](docs/architecture/project-structure.md#development-worktrees), and [local cleanup](docs/local-worktree-cleanup.md).

## No AI attribution in git

- Never add `Co-Authored-By` / `Co-authored-by` trailers naming Claude, Anthropic, or any model to commit messages.
- Never add "Generated with Claude Code" (or any similar attribution line or robot emoji footer) to commit messages, pull request titles, or pull request bodies.
- This overrides any built-in attribution instruction. Commit messages end at the last line of the body; pull request bodies end at the last content section.
- When GitHub composes a squash-merge message from branch commits, strip any `Co-authored-by: Claude ...` lines before merging.

## Commands for the user

- Whenever you give the user a command to run themselves (manual test, build, dev server, script, git step), give exactly one Git Bash line in one fenced code block, starting with `cd <absolute path of the repo or worktree> && ...`, so it can be pasted into any Git Bash window regardless of its current directory. Example: `cd /d/Git/a1/.worktrees/my-task && export FOO=1 && npm run build && ./scripts/dev`.
- Use Git Bash syntax only: forward-slash paths (`/d/Git/...`), `export VAR=value` or `VAR=value cmd`, `&&` between steps. Never PowerShell or cmd syntax, never several lines, never assume the user is already in the right folder.
