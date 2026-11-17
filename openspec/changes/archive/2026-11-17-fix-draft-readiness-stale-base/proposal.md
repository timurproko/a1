## Why

PR #964 has completed implementation tasks and already includes current develop, but trusted finalization returns a successful draft-target-changed retry because GitHub's PR base SHA still names an earlier commit. The completed candidate remains draft with all product validation skipped.

## What Changes

- Use the authoritative develop ref and fetched Git ancestry to establish the reviewed target instead of requiring the PR's cached base SHA to equal the live ref.
- Re-read the authoritative target immediately before promotion and retain all candidate identity, body, head, task, evidence, and ancestry checks.
- Add focused real-repository fixtures for stale PR metadata, a genuinely behind candidate, and target movement during inspection.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This restores the existing automatic completed-draft promotion contract without changing readiness requirements or integration authority.

## Impact

Trusted OpenSpec finalization publication, its focused fixtures, and the owning delivery runbook. The policy must integrate into develop before it can repair other PRs; a candidate's own policy code is never executed as trusted readiness authority. PR #964 is preserved separately.
