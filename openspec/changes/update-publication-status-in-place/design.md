## Approach

Keep polling and state classification unchanged. Track visible jobs by stable job ID in first-seen order. On capable interactive stdout, update the progress region when a meaningful job state changes; a job retains one row while its dot and status label change. Suppress unchanged snapshots and continue excluding derivative aggregates and inactive optional skips. Leave the cursor beneath the progress region before success text, errors, or interruption messages.

Separate interactive cursor capability from color capability. NO_COLOR and FORCE_COLOR=0 disable dot colors but do not require duplicate interactive rows. Nonterminal output and TERM=dumb retain plain append-only state transitions with no cursor controls. Only dots receive status color; labels and names retain the default foreground.

Contain rows to the available terminal width so wrapping does not invalidate cursor positioning. Preserve access to full job identities through the log link. Account for terminal resizing and limited height conservatively rather than rewriting the header or unrelated output. Avoid clearing the screen, continuous animation, hiding the cursor, or introducing a terminal-rendering dependency.

## Focused Validation Plan

Extend `test/repository-governance/publication-client.test.ts` with simulated terminal output proving running-to-passed updates leave one visible green Passed row, concurrent jobs retain independent rows, repeated snapshots write nothing, and failed/skipped transitions preserve existing semantics. Exercise color-disabled interactive output, redirected/dumb fallback, narrow or resized terminals, and cursor placement at success, failure, and interruption. Run only the named test file, applicable typecheck, and strict OpenSpec validation; do not dispatch a real publication.

## Scope Boundaries

The stable-candidate watcher remains unchanged. This is a local progress presentation change, not a publication retry or validation-policy change.

## Known Gaps

Implementation has not started. Real-terminal acceptance remains available to the maintainer after implementation; simulated terminal assertions do not claim a live publication was run.
