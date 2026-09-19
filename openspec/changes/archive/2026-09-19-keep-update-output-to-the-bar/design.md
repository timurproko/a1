## Context

`runSelfUpdate` runs from the mutable global installation and starts children through `createNpmProcessRunner`: `npm view`, `npm root --global`, and on the test path `npm install --global`. Its stdio was `["ignore", "pipe", "inherit"]`: stdout captured for parsing, stderr shared with the terminal. Until #479 the updater also ran `bin/sync-pi-tui-proxy.js` of the freshly installed tree through the same runner as a best-effort step. #479 removed that entry and that step from the updater, but every installation older than 0.1.8-dev.479 still carries the old updater, which runs the entry, gets `MODULE_NOT_FOUND` from Node on its inherited stderr, and prints its own one-line diagnostic. The update completes; the user sees a stack trace.

The protected replacement path already captures npm's stdout and stderr in the recovery worker and printed stderr unconditionally after replacement, printed stdout only on failure.

## Decisions

- **One rule for every child:** the runner captures both streams and never inherits the terminal. Stderr is kept as a bounded tail (`CHILD_DIAGNOSTIC_LIMIT`, 8,000 characters), the same shape `warmup.ts` uses for the warmup child; stdout stays unbounded because callers parse it. `ProcessResult` gains an optional `stderr` so injected test runners remain valid.
- **Text is shown with the failure it explains, or not at all:** `reportChildDiagnostics` prints the trimmed stdout and stderr of a failed child once, immediately before the diagnostic that names the failed action, and the `Review npm's diagnostics above.` hint is added only when something was printed. A successful child's stderr is dropped: with `--loglevel=error` it is empty in practice, and when it is not (an npm notice, a deprecation) it is not the update's result. The transaction journal already records the failure message the user sees; the child text is not duplicated there.
- **`captureStdout: false` means ignore, not inherit:** no caller passes it; keeping the flag preserves the runner contract the tests assert while removing the last way a child could reach the terminal.
- **The retired entry stays as a silent success:** updaters older than 0.1.8-dev.479 are installed on real machines and every published preview can still be installed by number, so the transition from any of them to any newer tree runs that step. The entry does nothing and sets exit code 0; the old updater's own diagnostic is printed only on a non-zero exit. It ships in `bin/`, is listed in the packed-surface expectation, and is excluded from nothing: it is not a runtime input and materialization retains what it cannot prove unnecessary.
- **Not in this change:** the updater still resolves `bin/warmup.js` and `bin/supervisor.js` inside the candidate tree. Moving that knowledge into the installed tree is the follow-up change `hand-activation-to-the-installed-release`.

## Risks / Trade-offs

- A user whose `npm view` succeeds with an npm notice no longer sees the notice during `a1 update`. Accepted: the notice is npm's, not the update's, and the spec already limits update output to the bar.
- The bounded tail can cut the beginning of a very long npm failure. Accepted: npm's reason is at the end, the same bound serves warmup, and the journal names the failed action.

## Evidence

- `test/foundation/release/update.test.ts`: a real child's stderr is returned with its status and never inherited (exit 0 and exit 3), the tail bound holds, a failed lookup prints npm's text before the status line and adds the hint only then, a successful run with stderr on every child prints nothing on stderr, a failed installation prints its stdout and stderr before `update failed`, protected replacement prints npm's text only when nothing was installed, and `bin/sync-pi-tui-proxy.js` exits 0 with no output.
- `test/foundation/release/package-surface.test.ts` lists the entry in the packed command surface.
