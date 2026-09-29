## Context

`publish.yml` checked `EVENT_NAME == workflow_call` for its dispatch wrappers. GitHub gives a called workflow the caller's `github.event_name`, so the check failed on the first real candidate run (`Stable candidate v0.2.2`, run 36593181410). `develop.yml` has never run, so development publication carried the same defect unnoticed. `GITHUB_WORKFLOW_REF` and `GITHUB_REF` already name the calling wrapper and branch, and are the real authority.

## Decisions

- **Authorization.** Require `workflow_dispatch`, `refs/heads/develop`, and the exact wrapper `GITHUB_WORKFLOW_REF` for both dispatch wrappers. A policy test pins the event and forbids the old `workflow_call` comparison.
- **Waiting.** `waitForStableValidation` polls the run every 30 seconds, prints a progress line at most every five minutes, returns on success, and throws `describePublicationFailure` output on any other conclusion. The command withholds the draft link until success. The abort signal stops only the local wait.
- **Output.** URLs follow a newline inside the log message so they print unprefixed on their own line; `git fetch -q` and captured gh output remove the noise.

## Risks / Trade-offs

- The terminal stays open for the validation duration. Mitigation: interruption is safe and rerunning resumes on the same run, which the existing reuse logic already finds.

## Evidence

- Focused release command, publication client, target, runbook, pipeline-policy, and governance suites pass, including the new waiting, failure-withholding, own-line link, and wrapper-event cases.
- `node scripts/release/check-release-documentation.mjs` passes.
- The live failure was run 36593181410; a live candidate run is deferred to the first release after merge.
