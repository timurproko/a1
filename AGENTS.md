# Project rules for coding agents

## Delivery workflow

Change delivery is owned by the shared `change-delivery` skill of `timurproko/MyWorkflows`, not by this repository: load it before making, planning, shipping, merging, or cleaning up after any change. It defines the draft-PR plan, ticking outcomes as they land, automatic readiness and OpenSpec finalization, handoff, merge rules, and local cleanup with `delivery cleanup`. Where a rule below is stricter than the skill, the rule below wins.

If no `change-delivery` skill is available on this machine, install it once and then load it: `git clone https://github.com/timurproko/MyWorkflows.git ~/.workflow && node ~/.workflow/bin/delivery.mjs install`. It keeps itself up to date from then on.

## Worktrees

In an active A1 session, prefer the `worktree` tool; `a1 worktree enter <branch>` with optional `--repo <absolute-path>` and `a1 worktree attach <absolute-path>` remain shell alternatives. Work in the returned directory only after runtime confirmation; a queued request is not attachment success. A1 reloads project resources after resolving target trust. Keep the task attached after implementation completion and review handoff so follow-up fixes retain its checkout and PR. After a verified merge, use `worktree complete` or `a1 worktree complete`: tools return to startup and cleanup runs from the selected repository's primary checkout, so never clean the attached checkout directly. Detach only when explicitly requested or switching tasks; it preserves files and branches. Runtime shutdown releases claims automatically. A1 owns coordination, retries, and recovery; inventory is informational. Outside A1, use ordinary Git worktrees.

## Commands for the user

- For an interactive checkout test in a handoff, build first and use `./scripts/dev` or `./scripts/dev pi`; never hand off or invoke a direct Node launcher such as `node scripts/development/dev-launch.mjs`.
- Whenever you give the user a command to run themselves (manual test, build, dev server, script, git step), give exactly one Git Bash line in one fenced code block, starting with `cd <absolute path of the repo or worktree> && ...`, so it can be pasted into any Git Bash window regardless of its current directory. Example: `cd /d/Git/a1/.worktrees/my-task && export FOO=1 && npm run build && ./scripts/dev`.
- Use Git Bash syntax only: forward-slash paths (`/d/Git/...`), `export VAR=value` or `VAR=value cmd`, `&&` between steps. Never PowerShell or cmd syntax, never several lines, never assume the user is already in the right folder.
