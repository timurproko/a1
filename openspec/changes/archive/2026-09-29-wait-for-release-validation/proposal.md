## Why

The first `npm run release -- patch` after `publish-on-native-release` failed immediately: the trusted publisher required the `workflow_call` event, but a reusable workflow observes its caller's `workflow_dispatch` event, so candidate validation (and, latently, development publication) could never start. The command also printed the changelog edit link before validation had run, inviting a publish that would only fail, and buried both links inside long log lines beneath git and gh noise.

## What Changes

- The publisher accepts the dispatch wrappers `release-candidate.yml` and `develop.yml` by their default-branch workflow identity and the caller's `workflow_dispatch` event.
- `npm run release` prints the validation run link, waits for the run, and prints the draft edit link only after validation succeeds. A failure reports the failed jobs and reasons instead. Interrupting is safe, and rerunning resumes waiting on the same run.
- Every printed link stands on its own line; git fetch, `gh auth status`, and `gh workflow run` output is suppressed.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `continuous-integration`: The release command waits for candidate validation before presenting the draft, and dispatch wrappers are authorized by the caller event they actually carry.

## Impact

`publish.yml` source selection, the release command and publication client, release tests, README, runbook, and toolchain documentation. Publication after the click is unchanged.
