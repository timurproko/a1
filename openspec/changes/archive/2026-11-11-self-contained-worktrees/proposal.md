# Self-contained worktree operations

## Why

A successful worktree link can immediately appear unverifiable because ordinary footer polling holds the global mutation gate. Repository instructions turn that advisory race into a task blocker. Repositories should guide agents to a small product command interface, not implement coordination and recovery in prose.

## What Changes

- Add `a1 worktree enter <branch>`, `attach <path>`, `detach`, and `list`, retaining session-context aliases.
- Own creation/resumption, exact identity and claim checks, bounded contention handling, and authoritative attachment outcomes in A1.
- Make background repository observation read-only after initial activation and resolve built-in tool working directories from the current verified attachment.
- Replace repository-specific linkage recipes with shared minimal guidance; migrate XR Build separately only after the new interface is installed.
- Preserve worktree contents, real ownership conflicts, repository-specific setup, and separate cleanup/merge authority.

## Impact

CLI dispatch, launch orchestration, lifecycle claims, runtime publication, Pi built-in tools, tests, and development documentation. No worktree removal, branch deletion, remote merge, dependency installation, or repository hook execution is added.
