# Implementation evidence

## Delivered behavior

- Agent settings exposes **Session name format** beside **Automatic session name**, with exactly Kebab case, Sentence case, and Title Case. Stored values are `kebab`, `sentence`, and `title`; default and invalid-value fallback are `kebab`. The existing manager supplies live updates, profile persistence, restart restoration, and default-override removal.
- Provider candidates and deterministic prompt fallback share the same bounded formatter. Kebab preserves lowercase hyphenation; sentence/title use spaces and preserve uppercase acronyms and internally capitalized technical spellings. All remain at most 16 characters with the existing whole-word truncation policy.
- Formatting occurs inside the existing coordinated apply callback using the latest effective setting, including when provider completion or apply coordination is pending. A format change neither starts generation nor rewrites existing/manual names. The next eligible context regeneration reads the latest choice.
- Existing attempt budgets, deadlines, cancellation, ownership, context/binding guards, and comparison-mode exclusion remain unchanged. The generation helper now loads only for an eligible naming chain; no startup baseline or architecture allowance was increased.

## Focused local checks

- Worktree-local `npm ci --ignore-scripts --no-audit --no-fund`: passed.
- `npm run build`: passed. The initial typecheck lacked fresh-checkout `dist` entry dependencies; building first resolved that setup prerequisite without a code workaround.
- `npm run typecheck`: passed for source/tests and executable entries.
- Seven targeted Vitest files: **172 tests passed**. Coverage includes settings declarations, grouped sections, live persistence/restart/invalid values, rendered choice-menu selection, all name formats, technical spelling, fallback, bounds, pending format changes including delayed apply, existing/manual-name preservation, real composition/context regeneration, and eager startup reachability.
- `npm run check:architecture`: passed all architecture, session-writer, identity, and pinned-source-ledger checks.
- Startup graph: 204 eager source files and 1,777,743 normalized bytes, beneath the unchanged 205-file / 1,779,560-byte ceilings. A focused regression assertion keeps the naming generation helper out of the eager graph.
- `openspec validate session-name-formats --strict` and `git diff --check`: passed.

## Known gaps

No known implementation gaps within the approved scope. Interactive appearance has not been manually assessed; optional maintainer validation does not block completion. Existing names are intentionally not reformatted, and no manual regeneration command or additional format is introduced.

These are focused local checks, not a claim of exact-head CI success or maintainer acceptance. Trusted readiness/finalization starts normal required CI after the final Implementation checkbox is checked.
