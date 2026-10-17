#!/usr/bin/env node
/**
 * Claude Code `WorktreeRemove` hook. Repository worktrees are removed only through
 * `scripts/governance/local-worktree-cleanup.mjs` (`sweep`, `complete`, `discard`), which verifies merge state and
 * ownership first. This hook therefore declines every removal Claude Code requests (`ExitWorktree(remove)`, the exit
 * prompt's remove choice, background-session cleanup) by exiting non-zero, which tells Claude Code the directory stays.
 *
 * Stdin carries Claude Code's JSON hook input (`worktree_path`, `cwd`, `session_id`, `hook_event_name`).
 */
import { readFileSync } from "node:fs";

/** Read the worktree path from the hook input, falling back to a placeholder when the input is unusable. */
function requestedWorktree() {
  try {
    return JSON.parse(readFileSync(0, "utf8")).worktree_path ?? "<unknown>";
  } catch {
    return "<unknown>";
  }
}

process.stderr.write(
  `[claude-worktree-remove] keeping ${requestedWorktree()}; remove repository worktrees with ` +
    "`node scripts/governance/local-worktree-cleanup.mjs` (sweep, complete, or discard) from the primary checkout.\n",
);
process.exit(1);
