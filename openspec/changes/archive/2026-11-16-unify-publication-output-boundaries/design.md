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

## Implementation and focused validation

The maintainer approved this plan and requested implementation in PR 962. Progress completion now owns the separator through the observer's shared finally path. Successful workflow output is emitted only after that boundary; every error reaches its caller after the same cleanup. Empty progress reuses the header separator. Stopped-watching errors use separate heading, guidance, and log-link lines. Failure details retain their content and bounds with left-margin bullet markers.

The publication-client and develop-publication suites passed all 211 tests, including the exit matrix and headless terminal replay. The smoke-published-installer consumer suite passed all 31 tests. Core build, both typechecks, strict OpenSpec validation, and whitespace checks passed. Initial raw-transcript assertions for redraw cases were corrected to inspect terminal replay, because stripping ANSI does not apply cursor movement. Typechecking required the fresh worktree's generated dist prerequisites, then passed after the core build. No real workflow or npm publication was dispatched.

## CI repair

Exact-head CI found two delivery defects: the archived change lacked its required `.openspec.yaml` metadata, and one test implementation comment lacked its intent label. Restore the change's `spec-driven` schema and creation date, and classify the terminal-row comment as an invariant. These repairs do not alter product behavior, acceptance scenarios, validation gates, or implementation scope. Trusted automation must refinalize the updated archive and validate the new head.

## Known gaps

No unresolved implementation gaps are identified. Hosted exact-head CI remains separate validation; local fixtures and terminal replay do not claim live publication acceptance. Stable validation retains its GitHub-owned watcher. Workflow dispatch, polling, registry verification, cancellation semantics, and publication authority remain unchanged.
