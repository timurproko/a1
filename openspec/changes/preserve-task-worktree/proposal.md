# Preserve task worktree context after implementation

## Why

The shared guidance introduced in #908 tells agents to detach when handing off or finishing. An implementation handoff is not the end of the task: review and bug fixes still need the same checkout and PR. Detach restores the startup checkout and its PR discovery, hiding the task PR unnecessarily.

## What Changes

- Keep sessions attached through implementation completion, review handoff, and follow-up fixes.
- Limit agent-issued detach to explicit requests or switching tasks; retain automatic claim release at runtime shutdown.
- Update the shared repository guidance and document the distinction between implementation handoff, runtime attachment, and cleanup ownership.
- Cover the guidance and continued tool/PR context with focused regression tests while preserving explicit detach behavior.

## Impact

Repository instructions, worktree documentation, session-worktree-recovery specifications, and focused tests. No runtime API, claim coordination, worktree cleanup, or merge-authority changes. XR Build's separate repository will receive its own instruction correction.
