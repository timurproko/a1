## Why

Merged worktree cleanup currently depends on each agent remembering a multi-command ownership protocol, choosing disposable paths, manually removing generated dependencies/reports, and interpreting conservative blockers. This leaves completed worktrees behind and creates inconsistent cleanup behavior even when merge, archive, remote-ref, and tracked-content safety are already verified.

## What Changes

- Provide one repository-owned completion command that explicitly registers the invoking agent's exact worktree when needed, applies a centrally defined generated-content policy, releases ownership, performs one bounded verified cleanup pass, and disables mutation authority afterward.
- Automatically treat known repository-generated worktree content such as installed dependencies and OpenSpec finalization reports as disposable, while continuing to block staged, unstaged, untracked, unknown ignored, linked, or special content.
- Distinguish actual nested repositories/submodules from harmless tracked vendor metadata so an empty tracked `.gitmodules` file does not block cleanup, while real gitlinks, nested `.git` metadata, and submodule changes still fail closed.
- Make delivery guidance require the standard command after verified merge instead of asking each agent to invent registration, deletion, or branch-cleanup steps.
- Preserve exact-head merge/archive verification, remote-ref absence, ownership, non-force Git removal, bounded execution, journaling, and local-only audit evidence.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `local-worktree-cleanup`: Add a deterministic one-command completed-worktree cleanup path, repository-owned disposable defaults, and accurate nested-repository detection.
- `change-delivery-workflow`: Require agents to invoke the standard cleanup procedure after verified delivery rather than manually deciding how to remove generated content and worktrees.

## Impact

The local cleanup CLI, cleanup state/content inspection, worktree removal orchestration, delivery guidance, cleanup documentation, and focused temporary-repository fixtures are affected. GitHub merge authority, remote branch deletion ownership, product runtime behavior, and cleanup of untracked user content remain unchanged.
