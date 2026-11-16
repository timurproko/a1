## Why

Development publication currently shows each job's state but gives no indication that a long-running validation lane is advancing. Show compact workflow-step counters beside each job without restoring the verbose GitHub step dump.

## What Changes

- Append `(current/total)` when GitHub supplies a nonempty step list, updating when the job state or counter changes.
- Retain independent in-place job rows, aligned labels, dot-only color, append-only fallbacks, and unchanged publication authority.
- Document counters as workflow-step positions, not test counts, elapsed-time estimates, or counts of passed checks.

## Capabilities

### Modified Capabilities

- `continuous-integration`: compact development-publication progress includes per-job workflow-step counters.

## Impact

Local publication observation in `scripts/release/publication-client.mjs`, focused publication-client tests, and the CI release runbook. No workflow, validation, stable watcher, or npm mutation changes.
