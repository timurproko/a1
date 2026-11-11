# Implementation evidence

## Delivered behavior

- The identical shared Worktrees block in root instructions and feature documentation preserves attachment after implementation completion and review handoff.
- Explicit detach is limited to a request or task switch. Runtime shutdown still releases claims; no runtime implementation or coordination safeguards were changed.
- Documentation separates runtime attachment from repository cleanup handoff.
- The guidance test requires the corrected policy and rejects the old detach-on-finish wording.
- The real-worktree/SDK composition fixture observes the attached branch and synthetic PR through initial and follow-up tool writes, including claim recovery, then verifies explicit detach restores startup tool and PR context while preserving task files.

## Focused local validation

- Four selected Vitest files passed: guidance, session-worktree-tools composition, session-runtime-registry, and repository-metadata (16 tests total).
- `npm run build:core` passed, followed by `npm run typecheck` (source and shipped launchers).
- Strict validation of `preserve-task-worktree` passed.
- `git diff --check` passed.

The first test attempt preceded task-local dependency installation and could not load its settings metadata input; no test ran. After installing frozen dependencies, all selected tests passed. Launcher typecheck initially required generated `dist` imports; building core resolved that setup prerequisite without source changes.

## Known-gap disposition

No remaining implementation gaps. PR lookup is synthetic in the composition fixture; live GitHub/footer acceptance is not claimed. An interactive maintainer can review the repository guidance and continue the same task without issuing detach. Remote exact-head validation and integration remain separate, pending trusted automation and the maintainer decision; local checks do not substitute for them. Existing sessions may have already loaded old instructions, so the corrected policy must be loaded or supplied explicitly. Publishing a package alone does not change another repository's instructions.
