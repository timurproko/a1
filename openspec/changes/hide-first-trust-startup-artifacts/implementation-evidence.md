# Implementation evidence

The startup-handoff outcome was implemented in the linked `D:/Git/a1/.worktrees/first-trust-startup-cleanup` worktree and PR #811 after the maintainer approved that original plan. The later content-rendering refinement is planned in the same change but is not yet implemented or evidenced.

## Completed startup results

- The attach presentation state recognizes a blank starting surface that follows already drawn startup content for the same tab and child incarnation.
- Consecutive blank revisions keep that handoff active, while the next drawn surface, another lifecycle state, a different child, or body clearing ends it.
- The blank handoff forces the outer cursor hidden and projects the viewed starting chip without its provisional lifecycle glyph.
- Starting-glyph debounce and hold bookkeeping is cleared for that chip so an earlier animation frame cannot survive into the quiet handoff.
- Working and restoration indicators on other tabs remain unchanged, and ordinary blank idle surfaces retain their normal cursor behavior.
- Focused native tests cover legacy and structured surfaces across initial blank, trust dialog, repeated blank handoff, drawn shell, and ordinary idle states.

## Validation

- `npm run typecheck` passed after generating the checkout's existing managed build prerequisites.
- `node D:/Git/a1/node_modules/@fission-ai/openspec/bin/openspec.js validate hide-first-trust-startup-artifacts --strict` passed.
- `git diff --check` passed.
- The two focused Rust tests were not run locally because this machine has no Cargo/Rust toolchain; exact native compilation and execution remain owned by pull-request CI.

## Pending refined outcomes

- Full-width tool-state background composition through nested ANSI resets and the reserved rail.
- Coherent replacement of moved or removed jump-to-bottom controls and bottom-aligned live-status rows through resident structured replay.
- Focused automated evidence and a local manual test checklist for those rendering transitions.

## Known gaps

None in the completed startup behavior. Local native-test execution is an environment limitation rather than a delivered behavior gap. The refined rendering outcomes remain intentionally pending maintainer approval and implementation.
