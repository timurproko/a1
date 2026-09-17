## 1. Publication Client

- [ ] 1.1 Route every `gh` invocation in `dispatchPublication` through an injectable runner and print the run URL immediately after the run identifier; verify the successful path output is otherwise unchanged.
- [ ] 1.2 Add `describePublicationFailure` that collects failed job names and their failure-level annotations, deduplicated and capped at ten lines, and throw its text when `gh run watch --exit-status` fails; verify a fake runner yielding one failed job with two annotations produces the expected message and that the generic exit-code annotation is omitted.

## 2. Entry Points

- [ ] 2.1 Catch the error from `main` in `develop.mjs`, print it as a `[develop]` line, and set a non-zero exit code; verify the governance pin now forbids only the abrupt `process.exit(` call and that the stable release path reports the same message through its existing handler.

## 3. Result Job

- [ ] 3.1 Add an informational failure summary step to the `result` job that lists failed jobs and, from downloaded lane evidence, non-zero invocations and recorded startup budget violations; verify it runs only when the selected outcome was not reached and that the outcome requirement step is byte-identical.

## 4. Governance And Evidence

- [ ] 4.1 Add client tests for the failure report and update the publication-command pins; verify the release pipeline policy test and the new client test pass, typechecking is clean, and the commands and outcomes are recorded.
