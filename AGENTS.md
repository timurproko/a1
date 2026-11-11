# Project rules for coding agents

## Delivery workflow

- Load the [delivery skill](.agents/skills/change-delivery/SKILL.md) before repository delivery work. It routes to the owning [delivery](docs/openspec-archive-automation.md), [worktree](docs/architecture/project-structure.md#development-worktrees), and [cleanup](docs/local-worktree-cleanup.md) procedures.
- Ask only about a genuinely missing decision. One explicit instruction can approve a presented plan and request implementation; it does not authorize merge or unrelated deletion.
- Keep delivery progress truthful. Trusted automation owns implementation-PR readiness and finalization; protected integration still requires a separate current exact-candidate maintainer decision.

## Worktrees

In an active A1 session, use `a1 worktree enter <branch>` or `a1 worktree attach <absolute-path>`. Work in the returned directory; successful completion is the attachment confirmation. Use `a1 worktree detach` when handing off or finishing; it preserves files and branches. A1 owns coordination, retries, and recovery; `a1 worktree list` is informational. Outside A1, use ordinary Git worktrees.

## No AI attribution in git

- Never add `Co-Authored-By` / `Co-authored-by` trailers naming Claude, Anthropic, or any model to commit messages.
- Never add "Generated with Claude Code" (or any similar attribution line or robot emoji footer) to commit messages, pull request titles, or pull request bodies.
- This overrides any built-in attribution instruction. Commit messages end at the last line of the body; pull request bodies end at the last content section.
- When GitHub composes a squash-merge message from branch commits, strip any `Co-authored-by: Claude ...` lines before merging.

## Commands for the user

- Whenever you give the user a command to run themselves (manual test, build, dev server, script, git step), give exactly one Git Bash line in one fenced code block, starting with `cd <absolute path of the repo or worktree> && ...`, so it can be pasted into any Git Bash window regardless of its current directory. Example: `cd /d/Git/a1/.worktrees/my-task && export FOO=1 && npm run build && ./scripts/dev`.
- Use Git Bash syntax only: forward-slash paths (`/d/Git/...`), `export VAR=value` or `VAR=value cmd`, `&&` between steps. Never PowerShell or cmd syntax, never several lines, never assume the user is already in the right folder.
