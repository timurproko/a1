# Validation Evidence

## Implemented Behavior

- Successful background refresh keeps muted `(refreshing)` visible through the existing one-second minimum, then removes the refresh suffix directly without rendering `(refreshed)` or the success sentence.
- Refreshed rows, query, surviving selection, pending scope edits, and `(unsaved)` state remain intact across completion.
- Failure and timeout details still replace progress after the minimum interval; restarted refresh and disposal cancel stale delayed outcomes without late renders.

## Automated Evidence

- `npx vitest run test/integrations/pi/components/models-dialog.test.ts test/app/session-shell/session-shell-models.test.ts` — 2 files and 29 tests passed.
- `npm run build` — passed and produced the interactive candidate.
- `npm run typecheck` — passed after the required build generated the bin-imported distribution declarations. An initial pre-build attempt failed only because a fresh worktree had no `dist/` output.
- `npm run check:architecture` — passed all architecture, product identity, package identity, pinned Pi source ledger, and terminal-host provenance checks.
- `npm run check:code-documentation:changed` — passed with no violations.
- `npx openspec validate hide-model-refreshed-status --type change --strict --no-interactive` and `git diff --check` — passed.

## Physical Review

The maintainer tested the built interactive candidate through `/models` and confirmed the new behavior works: successful refresh goes directly from `(refreshing)` to no suffix without showing `(refreshed)`. No implementation gap is known.
