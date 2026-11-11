# Guard worktree completion and recover invalid attachments

## Why

After #914 merged, an agent ran repository cleanup while its session was still attached to the task checkout. Cleanup partially removed the checkout, and from then on every built-in tool failed before execution with `associated path must be a Git worktree root`, including the shell call that would have run `a1 worktree detach`. The session could not recover itself.

Two defects combine. Tool working-directory resolution treats an attachment whose checkout is gone as a hard failure with no way back to the startup checkout. And nothing sequences "leave the checkout" before "delete the checkout": on Windows the shell A1 starts for an attached session pins the checkout directory for that shell's whole life, so cleanup issued from an attached session locks itself (`residual-locked`).

## What Changes

- An attachment whose checkout is definitively missing or no longer the recorded Git worktree is released automatically: the affected tool call fails once with an explanation, and the session continues from its verified startup checkout. Uncertain or transient failures still never redirect work.
- Add `a1 worktree complete [--change <id>] [--pr <number>]`. It checks the attached checkout for unpublished content, returns the session to the startup checkout, and then has the A1 runtime run the repository's configured cleanup command from that stable root after the issuing shell has exited.
- The cleanup command is an explicit adapter declared in the repository's committed `.a1/worktree.json` and read from the primary checkout, executed without a shell. Without one, completion detaches and reports that cleanup is unavailable; A1 never deletes worktrees itself.
- Repository cleanup refuses a checkout that a live A1 session still has attached.
- Repository guidance replaces "detach only when asked" with the verified-merge completion lifecycle, in A1's owning documents. XR Build receives the same contract in its own delivery.

## Impact

Session worktree lifecycle (`src/foundation/lifecycle`), CLI grammar (`src/cli`), runtime tool integration (`src/composition`, `src/integrations/pi/engine`), repository cleanup tooling (`scripts/governance`), worktree and cleanup documentation, `session-worktree-recovery` and `local-worktree-cleanup` specifications, and focused tests. No change to merge authority, cleanup eligibility evidence, or plain attach/detach behavior.
