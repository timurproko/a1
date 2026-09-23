## Implementation summary

- `openspec/config.yaml` now makes successful `a1 session link-worktree <absolute-worktree>` confirmation a pre-edit checkpoint, stops feature edits on a failed or mismatched association, and requires relinking when a session resumes or switches streams.
- `.agents/skills/change-delivery/SKILL.md` carries the same concise operational rule while preserving explicit worktree command addressing and the separation from tool cwd and cleanup authority.
- `docs/architecture/project-structure.md` now creates a named task branch rather than a detached checkout, links the absolute worktree before task edits, and explains that repository presentation, cwd, and cleanup ownership are separate.
- `test/repository-governance/change-delivery-guidance.test.ts` prevents the three authoritative guidance surfaces from dropping the command, ordering, failure behavior, stream relinking, or explicit-path requirement.

## Verification evidence

- `npx --no-install openspec validate require-delivery-worktree-context --strict` passed.
- `npx --no-install vitest run test/repository-governance/change-delivery-guidance.test.ts` passed 6 tests.
- `npx --no-install vitest run test/cli/session-context.test.ts test/foundation/lifecycle/session-repository-context.test.ts test/integrations/pi/engine/session-runtime.test.ts test/integrations/pi/components/prompt-input-ux.test.ts` passed 30 tests across 4 files, covering command execution, persisted same-repository association, bounded runtime refresh, and linked PR footer rendering.
- `npm run check:docs-governance` passed with all 74 inventoried legacy occurrences matching.
- The owning session ran `a1 session link-worktree C:/git/a1/.worktrees/require-delivery-worktree-context` and received `Session worktree context linked: C:\Git\a1\.worktrees\require-delivery-worktree-context`. Subsequent repository commands remained explicitly scoped to that worktree.
- Draft PR #558 is open on `feature/require-delivery-worktree-context`, matching the linked worktree branch. The existing bounded repository refresh and footer tests establish that this linked context resolves and renders `#558` without changing tool cwd.

## Gap disposition

No known implementation gaps remain. Static guidance checks prevent policy drift but do not by themselves force arbitrary external agents to comply; the repository-owned workflow and skill are the authoritative instructions, while the existing validated session command fails visibly when the required association cannot be established.
