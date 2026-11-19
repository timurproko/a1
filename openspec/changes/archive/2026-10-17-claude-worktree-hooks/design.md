# Design

## Let Claude Code own the link, in the repository's location

Claude Code only anchors a session to a worktree it created or one under its own `.claude/worktrees/`. Entering any other path is a documented special case: an approval prompt on every entry, no switching from inside another worktree, and shell tools whose remembered directory and reset target stay at the launch root while the isolation guard refuses commands that resolve there. Moving the repository's worktrees into `.claude/worktrees/` was rejected because the project-structure spec, the cleanup tool, and the A1 session inventory all address `.worktrees/<task-id>`.

Claude Code's `WorktreeCreate` hook replaces its `git worktree add` with a repository command and takes the printed path as the worktree. The hook therefore creates `.worktrees/<name>` and Claude Code treats it as its own: no prompt, and the session is anchored there from the first command.

## Detached at fresh `origin/develop`

The hook knows only the worktree name, not the `<type>/` prefix the branch convention needs, so it creates the worktree detached at `origin/develop` after fetching, which is what the project-structure spec already requires. The agent then runs `git -C <worktree> switch -c <type>/<short-description>`. The fetch failure path falls back to the local `origin/develop` ref so an offline session still gets a worktree.

## Reuse by name

When `.worktrees/<name>` is already registered, the hook prints that path instead of failing, so a resumed delivery re-enters its worktree with the same `EnterWorktree(name)` call. An unregistered directory at that path is an error rather than something to adopt, matching the ownership rules for existing checkouts.

## Removal stays with governance cleanup

`WorktreeRemove` exits non-zero with a pointer to `local-worktree-cleanup.mjs`, so neither `ExitWorktree(remove)` nor the exit prompt can delete work before its merge, archive, and remote-ref evidence verify. Sessions leave with `ExitWorktree(keep)` as before.

## Hook location

The scripts live in `scripts/governance/` with the other delivery tooling and are referenced through `"$CLAUDE_PROJECT_DIR"`, which Claude Code keeps at the launch root even inside a worktree, so the hook is found from the primary checkout regardless of where the session currently is.
