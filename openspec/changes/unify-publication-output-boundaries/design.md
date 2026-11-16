## Context

`waitForDevelopmentPublication` owns the progress renderer and is the common boundary for success, completed remote failure, local interruption, API read failures, and waiting failures. It currently inserts a newline only in the two completed-run branches. `develop.mjs` prints thrown messages with a develop prefix; stopped-watching errors combine the heading and guidance into one long line. Existing terminal replay tests explicitly accept the missing separator for observation loss.

## Decisions

- Move progress-region completion and separator ownership into a shared exit path rather than adding newlines to each error branch. Finish rendering before emitting the successful workflow summary or handing an error to the caller. Dispose signal/resize listeners on every path.
- Track whether progress rows were emitted so an observer with no visible jobs reuses the header's existing blank separator instead of adding a second blank line.
- Emit exactly one blank row after the final visible status row in interactive and append-only modes. No cursor movement or inherited indentation may leak into follow-up output.
- Keep headings and guidance plain and flush left. Failure details retain asterisk markers and their bounded diagnostic content but lose leading indentation. Stopped-watching output uses three explicit lines: reason heading, unknown-remote-outcome guidance, and log URL.
- Use a table-driven exit matrix and actual terminal replay, including an in-place update of an earlier job while the last visible job is still running. Exercise resize/narrow/unknown-dimension/short-terminal and non-TTY fallbacks without changing their safety rules.
- Retain post-success registry checks: workflow success is not a claim of published packages. Registry failures below the workflow summary remain left-aligned and preserve their existing nonzero outcome.

## Non-goals

No new retry policy, remote cancellation, workflow edits, stable watcher replacement, registry mutation, or publication authority changes. No product TUI or Pi harness changes.

## Risks

A newline moved into cleanup can duplicate existing separators or shift terminal cursor assertions. Exact transcript assertions and terminal replay must cover both zero-job and nonempty-progress exits. Diagnostic formatting is shared with stable release failures, so retain those consumers' content and evidence limits while updating bullet alignment.
